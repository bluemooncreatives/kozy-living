import { NextRequest, NextResponse } from "next/server";
import {
  HIDDEN_PRODUCT_TAG,
  SHOPIFY_GRAPHQL_API_ENDPOINT,
  TAGS,
} from "../constants";
import { isShopifyError } from "../type-guards";
import { ensureStartWith } from "../utils";
import {
  addToCartMutation,
  createCartMutation,
  editCartItemsMutation,
  removeFromCartMutation,
} from "./mutations/cart";
import { getCartQuery } from "./queries/cart";
import {
  getCollectionProductsQuery,
  getCollectionsQuery,
} from "./queries/collection";
import { getMenuQuery } from "./queries/menu";
import {
  getProductQuery,
  getProductRecommendationsQuery,
  getProductsQuery,
  searchProductsQuery,
} from "./queries/product";
import {
  Article,
  Blog,
  Cart,
  CartUserError,
  CartWarning,
  Collection,
  Connection,
  Image,
  Menu,
  Money,
  Page,
  Product,
  ShopifyAddToCartOperation,
  ShopifyArticle,
  ShopifyArticleOperation,
  ShopifyArticlesOperation,
  ShopifyBlogOperation,
  ShopifyBlogsOperation,
  ShopifyCart,
  ShopifyCartOperation,
  ShopifyCollection,
  ShopifyCollectionProductsOperation,
  ShopifyCollectionsOperation,
  ShopifyCreateCartOperation,
  ShopifyMenuOperation,
  ShopifyPageOperation,
  ShopifyPagesOperation,
  ShopifyProduct,
  ShopifyProductOperation,
  ShopifyProductRecommendationsOperation,
  ShopifyProductsOperation,
  ShopifySearchProductsOperation,
  ShopifyRemoveFromCartOperation,
  ShopifyUpdateCartOperation,
} from "./types";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { getPageQuery, getPagesQuery } from "./queries/page";
import {
  getArticleQuery,
  getArticlesQuery,
  getBlogQuery,
  getBlogsQuery,
} from "./queries/blog";

const domain = process.env.SHOPIFY_STORE_DOMAIN
  ? ensureStartWith(process.env.SHOPIFY_STORE_DOMAIN, "https://")
  : "";
const endpoint = `${domain}${SHOPIFY_GRAPHQL_API_ENDPOINT}`;
const key =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
/**
 * Next and React signal control flow by throwing: the dynamic-rendering
 * bailout, `notFound()`, `redirect()`. Those errors carry a `digest` and MUST
 * reach the framework untouched - a `catch` that swallows one can leave a
 * route statically rendered with the data it was about to fetch missing, and
 * the failure is silent.
 *
 * Every Shopify call in this app sits behind a `catch` that degrades to empty
 * data, so the check belongs at the bottom of the stack.
 */
export function isFrameworkControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;

  return (
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest === "NEXT_NOT_FOUND" ||
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("BAILOUT_TO_CLIENT_SIDE_RENDERING")
  );
}

type ExtractVariables<T> = T extends { variables: object }
  ? T["variables"]
  : never;
export async function shopifyFetch<T>({
  cache = "force-cache",
  headers,
  query,
  tags,
  variables,
}: {
  cache?: RequestCache;
  headers?: HeadersInit;
  query: string;
  tags?: string[];
  variables?: ExtractVariables<T>;
}): Promise<{ status: number; body: T } | never> {
  // Fail loudly and early rather than sending an unauthenticated request that
  // Shopify answers with an opaque 403.
  if (!domain || !key) {
    throw new Error(
      "Shopify is not configured: set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN."
    );
  }

  try {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": key,
        ...headers,
      },
      body: JSON.stringify({
        ...(query && { query }),
        ...(variables && { variables }),
      }),
      cache,
      ...(tags && { next: { tags } }),
    });

    const body = await result.json();

    if (body.errors) {
      throw body.errors[0];
    }

    return {
      status: result.status,
      body,
    };
  } catch (error) {
    // Control-flow throws pass straight through: wrapping one turns a
    // framework signal into an ordinary object that callers then swallow.
    if (isFrameworkControlFlowError(error)) throw error;

    if (isShopifyError(error)) {
      throw {
        cause: error.cause?.toString() || "unknown",
        status: error.status || 500,
        message: error.message,
        query,
      };
    }

    throw {
      error,
      query,
    };
  }
}

function removeEdgesAndNodes<T>(array: Connection<T>): T[] {
  return array.edges.map((edge) => edge?.node);
}

function reshapeImages(images: Connection<Image>, productTitle: string) {
  const flattened = removeEdgesAndNodes(images);

  return flattened.map((image) => {
    const filename = image.url.match(/.*\/(.*)\..*/)?.[1];

    return {
      ...image,
      altText: image.altText || `${productTitle} - ${filename}`,
    };
  });
}
function reshapeProduct(
  product: ShopifyProduct,
  filterHiddenProducts: boolean = true
) {
  if (
    !product ||
    (filterHiddenProducts && product.tags.includes(HIDDEN_PRODUCT_TAG))
  ) {
    return undefined;
  }

  const { images, variants, ...rest } = product;

  return {
    ...rest,
    images: reshapeImages(images, product.title),
    variants: removeEdgesAndNodes(variants),
  };
}
function reshapeProducts(products: ShopifyProduct[]) {
  const reshapedProducts = [];

  for (const product of products) {
    if (product) {
      const reshapedProduct = reshapeProduct(product);

      if (reshapedProduct) {
        reshapedProducts.push(reshapedProduct);
      }
    }
  }

  return reshapedProducts;
}
/**
 * Rewrites a Shopify menu URL into a route this app actually serves.
 *
 * Parsed with `URL` rather than by stripping the configured domain: menu items
 * come back on whichever domain the storefront is published under, so a store
 * with a primary custom domain returns links that never match
 * `SHOPIFY_STORE_DOMAIN` and would otherwise stay absolute.
 */
function normalizeMenuPath(url: string): string {
  let pathname: string;

  try {
    pathname = new URL(url).pathname;
  } catch {
    // Already relative, or not a URL at all.
    pathname = url.split("?")[0] || "/";
  }

  // Trailing slashes would defeat the prefix checks below and the active-state
  // comparison in the nav.
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");

  if (pathname === "" || pathname === "/") return "/";

  // Shopify pluralises where this app does not.
  if (pathname.startsWith("/products/")) {
    return pathname.replace("/products/", "/product/");
  }

  // `/collections`, `/collections/all` and `/collections/<handle>`.
  if (pathname === "/collections") return "/search";
  if (pathname.startsWith("/collections/")) {
    const handle = pathname.split("/")[2];
    return !handle || handle === "all" ? "/search" : `/search/${handle}`;
  }

  // Shopify pages are served at the app root: /pages/about-us -> /about-us.
  if (pathname.startsWith("/pages/")) return pathname.replace("/pages", "");

  // /blogs/... and everything else already matches a route.
  return pathname;
}

type ShopifyMenuItemShape = {
  title: string;
  url: string;
  items?: ShopifyMenuItemShape[];
};

function reshapeMenuItem(item: ShopifyMenuItemShape): Menu {
  return {
    title: item.title,
    path: normalizeMenuPath(item.url),
    ...(item.items?.length ? { items: item.items.map(reshapeMenuItem) } : {}),
  };
}

/**
 * One Shopify menu by handle. Returns `[]` when the handle does not exist -
 * Shopify answers with a null menu rather than an error, so callers that need
 * to try more than one handle must check the length, not catch. That is what
 * `getPrimaryMenu` is for.
 */
export async function getMenu(handle: string): Promise<Menu[]> {
  const res = await shopifyFetch<ShopifyMenuOperation>({
    query: getMenuQuery,
    // Menus are edited independently of collections in Shopify Admin. Read
    // them fresh so header changes do not wait for a collection webhook or a
    // new deployment to appear.
    cache: "no-store",
    variables: {
      handle,
    },
  });

  return res.body?.data?.menu?.items.map(reshapeMenuItem) || [];
}

/**
 * The site navigation, resolved against the handles a Shopify store is likely
 * to use for it. `main-menu` is Shopify's default handle and is what this
 * store's "kozy-living-menu" actually resolves to - a menu's display name and
 * its handle drift apart the moment someone renames it in Admin, so both are
 * tried and the first that returns items wins.
 *
 * `NEXT_PUBLIC_SHOPIFY_MENU_HANDLE` takes priority when set, so a store that
 * uses a third handle needs an env var rather than a code change.
 */
export async function getPrimaryMenu(): Promise<Menu[]> {
  const handles = [
    process.env.NEXT_PUBLIC_SHOPIFY_MENU_HANDLE,
    "main-menu",
    "kozy-living-menu",
  ].filter((handle): handle is string => Boolean(handle));

  for (const handle of handles) {
    try {
      const menu = await getMenu(handle);
      if (menu.length) return menu;
    } catch (error) {
      if (isFrameworkControlFlowError(error)) throw error;
      console.error(`Failed to load the "${handle}" Shopify menu`, error);
    }
  }

  return [];
}

export async function getProducts({
  query,
  reverse,
  sortKey,
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  const normalizedQuery = query?.trim().replace(/\s+/g, " ");

  if (normalizedQuery) {
    const [searchResponse, collections] = await Promise.all([
      shopifyFetch<ShopifySearchProductsOperation>({
        query: searchProductsQuery,
        tags: [TAGS.products],
        variables: { query: normalizedQuery },
      }),
      getCollections(),
    ]);

    const normalizedNeedle = normalizedQuery.toLocaleLowerCase();
    const matchingCollections = collections
      .filter(
        (collection) =>
          collection.handle &&
          (collection.title.toLocaleLowerCase().includes(normalizedNeedle) ||
            collection.handle
              .replace(/-/g, " ")
              .toLocaleLowerCase()
              .includes(normalizedNeedle))
      )
      .slice(0, 5);

    const collectionProducts = await Promise.all(
      matchingCollections.map((collection) =>
        getCollectionProducts({ collection: collection.handle })
      )
    );
    const searchedProducts = reshapeProducts(
      removeEdgesAndNodes(searchResponse.body.data.search)
    );
    const productsById = new Map(
      [...searchedProducts, ...collectionProducts.flat()].map((product) => [
        product.id,
        product,
      ])
    );
    const products = Array.from(productsById.values());

    if (sortKey === "PRICE") {
      products.sort(
        (a, b) =>
          Number(a.priceRange.minVariantPrice.amount) -
          Number(b.priceRange.minVariantPrice.amount)
      );
    } else if (sortKey === "CREATED_AT") {
      products.sort(
        (a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
    }

    return reverse ? products.reverse() : products;
  }

  const res = await shopifyFetch<ShopifyProductsOperation>({
    query: getProductsQuery,
    tags: [TAGS.products],
    variables: {
      query: normalizedQuery,
      reverse,
      sortKey,
    },
  });

  return reshapeProducts(removeEdgesAndNodes(res.body.data.products));
}

function reshapeCollection(
  collection: ShopifyCollection
): Collection | undefined {
  if (!collection) return undefined;

  return {
    ...collection,
    path: `/search/${collection.handle}`,
  };
}

function reshapeCollections(collections: ShopifyCollection[]) {
  const reshapedCollections = [];

  for (const collection of collections) {
    if (collection) {
      const reshapedCollection = reshapeCollection(collection);

      if (reshapedCollection) {
        reshapedCollections.push(reshapedCollection);
      }
    }
  }

  return reshapedCollections;
}

export async function getCollections(): Promise<Collection[]> {
  const res = await shopifyFetch<ShopifyCollectionsOperation>({
    query: getCollectionsQuery,
    tags: [TAGS.collections],
  });

  const shopifyCollections = removeEdgesAndNodes(res?.body?.data?.collections);
  const collections = [
    {
      handle: "",
      title: "All",
      description: "All products",
      seo: {
        title: "All",
        description: "All products",
      },
      path: "/search",
      updatedAt: new Date().toISOString(),
    },
    // Filter out the hidden products
    ...reshapeCollections(shopifyCollections).filter(
      (collection) => !collection.handle.startsWith("hidden")
    ),
  ];

  return collections;
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey,
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  const res = await shopifyFetch<ShopifyCollectionProductsOperation>({
    query: getCollectionProductsQuery,
    tags: [TAGS.collections, TAGS.products],
    variables: {
      handle: collection,
      reverse,
      sortKey: sortKey === "CREATED_AT" ? "CREATED" : sortKey,
    },
  });

  if (!res.body.data.collection) {
    console.log(`No collection found for \`${collection}\``);
    return [];
  }

  return reshapeProducts(
    removeEdgesAndNodes(res.body.data.collection.products)
  );
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  const res = await shopifyFetch<ShopifyProductOperation>({
    query: getProductQuery,
    tags: [TAGS.products],
    variables: {
      handle,
    },
  });
  return reshapeProduct(res.body.data.product, false);
}

export async function getProductRecommendations(
  productId: string
): Promise<Product[]> {
  const res = await shopifyFetch<ShopifyProductRecommendationsOperation>({
    query: getProductRecommendationsQuery,
    tags: [TAGS.products],
    variables: {
      productId,
    },
  });

  return reshapeProducts(res.body.data.productRecommendations);
}

/**
 * Raised when Shopify accepts the request (HTTP 200, no top-level `errors`) but
 * rejects the operation via `userErrors`. `message` is safe to show to a user.
 */
export class CartMutationError extends Error {
  readonly code: string | null;
  /** GraphQL path of the offending argument, e.g. `["cartId"]`. */
  readonly field: string[] | null;

  constructor(
    message: string,
    code: string | null = null,
    field: string[] | null = null
  ) {
    super(message);
    this.name = "CartMutationError";
    this.code = code;
    this.field = field;
  }

  /** True when Shopify no longer recognises the cart id we sent. */
  get isMissingCart(): boolean {
    return this.field?.includes("cartId") ?? false;
  }
}

/** Raised when the cart id no longer resolves - checked out, or expired. */
export class CartNotFoundError extends Error {
  constructor() {
    super("Cart no longer exists");
    this.name = "CartNotFoundError";
  }
}

function reshapeCart(cart: ShopifyCart): Cart {
  // `cost` and `totalTaxAmount` are both nullable on the Storefront API - a
  // brand-new cart has no tax until an address is attached. Rebuild the object
  // instead of mutating the response in place.
  const currencyCode =
    cart.cost?.totalAmount?.currencyCode ??
    cart.cost?.subtotalAmount?.currencyCode ??
    "INR";
  const zero: Money = { amount: "0.0", currencyCode };

  return {
    ...cart,
    checkoutUrl: cart.checkoutUrl ?? "",
    totalQuantity: cart.totalQuantity ?? 0,
    cost: {
      subtotalAmount: cart.cost?.subtotalAmount ?? zero,
      totalAmount: cart.cost?.totalAmount ?? zero,
      totalTaxAmount: cart.cost?.totalTaxAmount ?? zero,
    },
    lines: cart.lines ? removeEdgesAndNodes(cart.lines) : [],
  };
}

/**
 * Unwraps a cart mutation payload. Shopify reports rejections through
 * `userErrors` with a null cart, so both have to be checked before reshaping.
 */
function unwrapCartMutation(
  payload: {
    cart: ShopifyCart | null;
    userErrors?: CartUserError[] | null;
    warnings?: CartWarning[] | null;
  },
  operation: string
): { cart: Cart; warnings: CartWarning[] } {
  const userError = payload?.userErrors?.[0];

  if (userError) {
    throw new CartMutationError(
      userError.message,
      userError.code,
      userError.field
    );
  }

  if (!payload?.cart) {
    // A null cart with no userErrors means the cart id resolved to nothing.
    throw new CartMutationError(
      `${operation} did not return a cart`,
      null,
      ["cartId"]
    );
  }

  return {
    cart: reshapeCart(payload.cart),
    warnings: payload.warnings ?? [],
  };
}

export async function createCart(): Promise<Cart> {
  const res = await shopifyFetch<ShopifyCreateCartOperation>({
    query: createCartMutation,
    cache: "no-store",
  });

  return unwrapCartMutation(res.body.data.cartCreate, "cartCreate").cart;
}

export async function getCart(
  cartId: string | undefined,
  /**
   * Server Actions must read through the cache, not from it. `revalidateTag`
   * marks the entry stale rather than deleting it, so a cached read inside an
   * action can hand back a pre-mutation cart and make the action operate on
   * line ids that no longer exist.
   */
  options?: { fresh?: boolean }
): Promise<Cart | undefined> {
  if (!cartId) return undefined;

  const res = await shopifyFetch<ShopifyCartOperation>({
    query: getCartQuery,
    variables: { cartId },
    ...(options?.fresh
      ? { cache: "no-store" as const }
      : { tags: [TAGS.cart] }),
  });

  // Old carts become `null` once you check out.
  if (!res.body.data.cart) {
    return undefined;
  }

  return reshapeCart(res.body.data.cart);
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[]
): Promise<Cart> {
  if (lineIds.length === 0) {
    const cart = await getCart(cartId, { fresh: true });
    if (!cart) throw new CartNotFoundError();
    return cart;
  }

  const res = await shopifyFetch<ShopifyRemoveFromCartOperation>({
    query: removeFromCartMutation,
    variables: {
      cartId,
      lineIds,
    },
    cache: "no-store",
  });

  return unwrapCartMutation(res.body.data.cartLinesRemove, "cartLinesRemove")
    .cart;
}

export async function updateCart(
  cartId: string,
  lines: { id: string; merchandiseId: string; quantity: number }[]
): Promise<{ cart: Cart; warnings: CartWarning[] }> {
  const res = await shopifyFetch<ShopifyUpdateCartOperation>({
    query: editCartItemsMutation,
    variables: {
      cartId,
      lines,
    },
    cache: "no-store",
  });

  return unwrapCartMutation(res.body.data.cartLinesUpdate, "cartLinesUpdate");
}

export async function addToCart(
  cartId: string,
  lines: { merchandiseId: string; quantity: number }[]
): Promise<{ cart: Cart; warnings: CartWarning[] }> {
  const res = await shopifyFetch<ShopifyAddToCartOperation>({
    query: addToCartMutation,
    variables: {
      cartId,
      lines,
    },
    cache: "no-store",
  });

  return unwrapCartMutation(res.body.data.cartLinesAdd, "cartLinesAdd");
}

// This is called from `app/api/revalidate.ts` so providers can control revalidation logic.
export async function revalidate(req: NextRequest): Promise<NextResponse> {
  // We always need to respond with a 200 status code to Shopify,
  // otherwise it will continue to retry the request.

  const collectionWebhooks = [
    "collections/create",
    "collections/delete",
    "collections/update",
  ];
  const productWebhooks = [
    "products/create",
    "products/delete",
    "products/update",
  ];
  const blogWebhooks = [
    "articles/create",
    "articles/delete",
    "articles/update",
    "blogs/create",
    "blogs/delete",
    "blogs/update",
  ];
  const topic = (await headers()).get("x-shopify-topic") || "unknown";
  const secret = req.nextUrl.searchParams.get("secret");
  const isCollectionUpdate = collectionWebhooks.includes(topic);
  const isProductUpdate = productWebhooks.includes(topic);
  const isBlogUpdate = blogWebhooks.includes(topic);

  if (!secret || secret !== process.env.SHOPIFY_REVALIDATION_SECRET) {
    console.error("Invalid revalidation secret.");
    return NextResponse.json({ status: 200 });
  }

  if (!isCollectionUpdate && !isProductUpdate && !isBlogUpdate) {
    // We don't need to revalidate anything for any other topics.
    return NextResponse.json({ status: 200 });
  }

  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections, "max");
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products, "max");
  }

  if (isBlogUpdate) {
    revalidateTag(TAGS.blogs, "max");
  }

  return NextResponse.json({ status: 200, revalidated: true, now: Date.now() });
}

export async function getPage(handle: string): Promise<Page> {
  const res = await shopifyFetch<ShopifyPageOperation>({
    query: getPageQuery,
    cache: "no-store",
    variables: { handle },
  });

  return res.body.data.pageByHandle;
}

export async function getPages(): Promise<Page[]> {
  const res = await shopifyFetch<ShopifyPagesOperation>({
    query: getPagesQuery,
    cache: "no-store",
  });

  return removeEdgesAndNodes(res.body.data.pages);
}

/* --------------------------------------------------------------- blogs */

/**
 * Shopify leaves `excerpt` as an empty string when the merchant never filled
 * one in, so cards would render as bare titles. Fall back to the opening of the
 * body, cut on a word boundary.
 */
function summarize(content: string, limit = 180): string | null {
  const text = content?.replace(/\s+/g, " ").trim();

  if (!text) return null;
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, "")}...`;
}

/**
 * Shopify serves articles at `/blogs/<blog>/<article>`; the storefront mirrors
 * that path exactly so links copied out of the admin - or already indexed by
 * search engines - resolve without a redirect.
 */
function reshapeArticle(
  article: ShopifyArticle,
  blogHandle?: string,
  blogTitle?: string
): Article | undefined {
  if (!article) return undefined;

  const { blog, content, ...rest } = article;
  const handleOfBlog = blog?.handle ?? blogHandle;

  // Without a blog handle there is no addressable URL for the article.
  if (!handleOfBlog) return undefined;

  return {
    ...rest,
    excerpt: article.excerpt?.trim() || summarize(content),
    blogHandle: handleOfBlog,
    blogTitle: blog?.title ?? blogTitle ?? handleOfBlog,
    path: `/blogs/${handleOfBlog}/${article.handle}`,
  };
}

function reshapeArticles(
  articles: ShopifyArticle[],
  blogHandle?: string,
  blogTitle?: string
): Article[] {
  const reshaped: Article[] = [];

  for (const article of articles) {
    const next = reshapeArticle(article, blogHandle, blogTitle);
    if (next) reshaped.push(next);
  }

  return reshaped;
}

/** Every blog on the store, without their articles. */
export async function getBlogs(first = 20): Promise<Omit<Blog, "articles">[]> {
  const res = await shopifyFetch<ShopifyBlogsOperation>({
    query: getBlogsQuery,
    tags: [TAGS.blogs],
    variables: { first },
  });

  return removeEdgesAndNodes(res.body.data.blogs).map((blog) => ({
    ...blog,
    path: `/blogs/${blog.handle}`,
  }));
}

/** One blog with its articles, newest first. */
export async function getBlog(
  handle: string,
  first = 50
): Promise<Blog | undefined> {
  const res = await shopifyFetch<ShopifyBlogOperation>({
    query: getBlogQuery,
    tags: [TAGS.blogs],
    variables: { handle, first },
  });

  const blog = res.body.data.blog;

  if (!blog) return undefined;

  const { articles, ...rest } = blog;

  return {
    ...rest,
    path: `/blogs/${blog.handle}`,
    articles: articles
      ? reshapeArticles(
          removeEdgesAndNodes(articles),
          blog.handle,
          blog.title
        )
      : [],
  };
}

/** A single article, addressed the way Shopify addresses it. */
export async function getArticle(
  blogHandle: string,
  handle: string
): Promise<Article | undefined> {
  const res = await shopifyFetch<ShopifyArticleOperation>({
    query: getArticleQuery,
    tags: [TAGS.blogs],
    variables: { blogHandle, handle },
  });

  const blog = res.body.data.blog;
  const article = blog?.articleByHandle;

  if (!article) return undefined;

  return reshapeArticle(article, blog?.handle, blog?.title);
}

/** Articles across every blog, newest first. */
export async function getArticles(first = 24): Promise<Article[]> {
  const res = await shopifyFetch<ShopifyArticlesOperation>({
    query: getArticlesQuery,
    tags: [TAGS.blogs],
    variables: { first },
  });

  return reshapeArticles(removeEdgesAndNodes(res.body.data.articles));
}
