export type Menu = {
  title: string;
  path: string;
  items?: Menu[];
};

type ShopifyMenuItem = {
  title: string;
  url: string;
  items?: ShopifyMenuItem[];
};

export type ShopifyMenuOperation = {
  data: {
    menu?: {
      items: ShopifyMenuItem[];
    };
  };
  variables: {
    handle: string;
  };
};

export type Money = {
  amount: string;
  currencyCode: string;
};

export type ProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type Edge<T> = {
  node: T;
};

export type Connection<T> = {
  edges: Array<Edge<T>>;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: {
    name: string;
    value: string;
  }[];
  price: Money;
  /** Selected by the product page only; the listing fragment leaves it out. */
  compareAtPrice?: Money | null;
};

export type Image = {
  url: string;
  altText: string;
  width: number;
  height: number;
};

export type SEO = {
  title: string;
  description: string;
};
export type ShopifyProduct = {
  id: string;
  handle: string;
  availableForSale: boolean;
  title: string;
  description: string;
  descriptionHtml: string;
  options: ProductOption[];
  priceRange: {
    maxVariantPrice: Money;
    minVariantPrice: Money;
  };
  variants: Connection<ProductVariant>;
  featuredImage: Image;
  images: Connection<Image>;
  seo: SEO;
  tags: string[];
  updatedAt: string;
  collections: Connection<{ handle: string; title: string }>;
};

export type Product = Omit<ShopifyProduct, "variants" | "images" | "collections"> & {
  variants: ProductVariant[];
  images: Image[];
  collections: { handle: string; title: string }[];
};

export type ShopifyProductsOperation = {
  data: {
    products: Connection<ShopifyProduct>;
  };
  variables: {
    query?: string;
    reverse?: boolean;
    sortKey?: string;
  };
};

export type ShopifySearchProductsOperation = {
  data: {
    search: Connection<ShopifyProduct>;
  };
  variables: {
    query: string;
  };
};

/* ------------------------------------------------------------------ catalog

   The listing shape. Everything the shop grid renders and everything the facet
   engine derives filters from - see `fragments/product-card.ts` for why this is
   separate from the full `Product`. */

export type CatalogProductOption = {
  name: string;
  values: string[];
};

/**
 * One metafield as the listing fragment asks for it.
 *
 * `references` is populated only for the metaobject-reference types - a colour
 * recorded as a Shopify swatch metaobject rather than as text. Every field is
 * optional because Storefront returns `null` for an identifier the store has no
 * definition for, and because a cached catalogue entry written before this
 * fragment carried metafields deserialises without them.
 */
export type CatalogMetafield = {
  namespace: string;
  key: string;
  type: string;
  value: string | null;
  references?: {
    nodes?: {
      handle?: string | null;
      fields?: { key: string; value: string | null }[] | null;
    }[] | null;
  } | null;
};

export type ShopifyCatalogProduct = {
  id: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  tags: string[];
  productType: string;
  vendor: string;
  options: CatalogProductOption[];
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  /** `amount` is "0.0" when the merchant set no compare-at price. */
  compareAtPriceRange: {
    maxVariantPrice: Money;
  };
  featuredImage: Image | null;
  /** Capped at 5 by the fragment - the card's gallery, not the full set. */
  images: Connection<Image>;
  /** Capped at 2: enough to tell "sellable here" from "has choices to make". */
  variants: Connection<ProductVariant>;
  /** Asked for by identifier; a `null` entry is an identifier this store has no definition for. */
  metafields: (CatalogMetafield | null)[];
  /** `custom.shop_mood` and kin, aliased apart from `metafields` - see `lib/shop/moods.ts`. */
  moods?: (CatalogMetafield | null)[];
  collections: Connection<{ handle: string; title: string }>;
  createdAt: string;
  updatedAt: string;
};

export type CatalogProduct = Omit<
  ShopifyCatalogProduct,
  "collections" | "images" | "variants" | "metafields" | "moods"
> & {
  collections: { handle: string; title: string }[];
  images: Image[];
  variants: ProductVariant[];
  /** Nulls dropped - see `reshapeCatalogProduct`. */
  metafields: CatalogMetafield[];
  /** Nulls dropped, like `metafields`. */
  moods: CatalogMetafield[];
};

export type ShopifyCatalogOperation = {
  data: {
    products: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<Edge<ShopifyCatalogProduct>>;
    };
  };
  variables: {
    first: number;
    after?: string | null;
  };
};

export type ShopifyCollectionOrderOperation = {
  data: {
    collection: {
      handle: string;
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<Edge<{ id: string }>>;
      };
    } | null;
  };
  variables: {
    handle: string;
    first: number;
    after?: string | null;
  };
};

export type ShopifySearchCatalogOperation = {
  data: {
    search: Connection<{ id?: string }>;
  };
  variables: {
    query: string;
    first: number;
  };
};

/** One entry of the brand's colour palette metaobject. */
export type ShopifyColourMetaobject = {
  handle: string;
  fields: { key: string; value: string | null }[];
};

export type ShopifyColourPaletteOperation = {
  data: { metaobjects: { nodes: ShopifyColourMetaobject[] } | null };
  variables: { first: number };
};

/** The mood metaobjects - the same node shape as the colour palette. */
export type ShopifyMoodsOperation = ShopifyColourPaletteOperation;

export type ShopifyCollection = {
  handle: string;
  title: string;
  description: string;
  image: Image | null;
  seo: SEO;
  updatedAt: string;
};

export type Collection = ShopifyCollection & {
  path: string;
};

export type ShopifyCollectionsOperation = {
  data: {
    collections: Connection<ShopifyCollection>;
  };
};

export type ShopifyCollectionProductsOperation = {
  data: {
    collection: {
      products: Connection<ShopifyProduct>;
    };
  };
  variables: {
    handle: string;
    reverse?: boolean;
    sortKey?: string;
  };
};

export type ShopifyProductOperation = {
  data: { product: ShopifyProduct };
  variables: {
    handle: string;
  };
};

export type CartProduct = {
  id: string;
  handle: string;
  title: string;
  featuredImage: Image;
};

export type CartAttribute = {
  key: string;
  value: string;
};

/**
 * A personalisation add-on (initials, gift box) as the merchant defines it: a
 * `product_add_on` metaobject pointing at the hidden product variant that is
 * actually charged. Price and availability are read from that variant, so an
 * Admin price edit needs no code change.
 */
export type ProductAddOn = {
  /** Metaobject id. What the storefront sends back to name a choice. */
  id: string;
  kind: "initials" | "gift_box";
  title: string;
  variantId: string;
  price: Money;
  available: boolean;
  /** Label of the text field; `null` when the add-on takes no text. */
  textLabel: string | null;
  textRequired: boolean;
  maxLength: number;
  helpText: string | null;
  policyNote: string | null;
  /** Child quantity follows the parent's; otherwise it is charged once. */
  chargePerUnit: boolean;
};

export type ShopifyAddOnMetaobject = {
  id: string;
  handle: string;
  fields: {
    key: string;
    value: string | null;
    reference: {
      id?: string;
      availableForSale?: boolean;
      price?: Money;
      product?: { handle: string; tags: string[] };
    } | null;
  }[];
};

export type ShopifyAddOnsOperation = {
  data: { metaobjects: { nodes: ShopifyAddOnMetaobject[] } | null };
  variables: { first: number };
};

export type CartItem = {
  id: string | undefined;
  /**
   * React key for a line that exists only optimistically. A personalised line
   * never merges with another, so until the server answers it has no id to be
   * told apart by.
   */
  tempKey?: string;
  quantity: number;
  /** Line-item properties. Keys starting with `_` are private. */
  attributes?: CartAttribute[];
  /** Raw parent link from Shopify; folded into `addOns` by `reshapeCart`. */
  parentRelationship?: { parent: { id: string } } | null;
  /** Add-on lines nested under this one (initials, gift box). */
  addOns?: CartItem[];
  cost: {
    totalAmount: Money;
    /** Per-unit price after line discounts. Absent on optimistic-only lines. */
    amountPerQuantity?: Money;
  };
  merchandise: {
    id: string;
    title: string;
    /** Variant-level availability - a product can be sellable while a variant is not. */
    availableForSale?: boolean;
    price?: Money;
    selectedOptions: {
      name: string;
      value: string;
    }[];
    product: CartProduct;
  };
};

/** A mutation Shopify rejected. Returned with HTTP 200 and a null cart. */
export type CartUserError = {
  field: string[] | null;
  message: string;
  code: string | null;
};

/**
 * A mutation Shopify accepted but altered - most commonly
 * `MERCHANDISE_NOT_ENOUGH_STOCK`, where the requested quantity was clamped to
 * available inventory.
 */
export type CartWarning = {
  code: string;
  message: string;
  target: string;
};

type CartMutationPayload = {
  cart: ShopifyCart | null;
  userErrors: CartUserError[];
  warnings: CartWarning[] | null;
};

export type ShopifyCart = {
  id: string | undefined;
  checkoutUrl: string;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money;
  };
  lines: Connection<CartItem>;
  totalQuantity: number;
};

export type ShopifyCartOperation = {
  data: {
    // `null` once the cart has been checked out or has expired.
    cart: ShopifyCart | null;
  };
  variables: {
    cartId: string;
  };
};

export type ShopifyCreateCartOperation = {
  data: { cartCreate: CartMutationPayload };
  variables: {
    lineItems: CartLineInput[];
  };
};

export type ShopifyUpdateCartOperation = {
  data: {
    cartLinesUpdate: CartMutationPayload;
  };
  variables: {
    cartId: string;
    lines: CartLineUpdateInput[];
  };
};

export type ShopifyRemoveFromCartOperation = {
  data: {
    cartLinesRemove: CartMutationPayload;
  };
  variables: {
    cartId: string;
    lineIds: string[];
  };
};

export type Cart = Omit<ShopifyCart, "lines"> & {
  lines: CartItem[];
};

export type ShopifyAddToCartOperation = {
  data: {
    cartLinesAdd: CartMutationPayload;
  };
  variables: {
    cartId: string;
    lines: CartLineInput[];
  };
};

export type CartLineInput = {
  merchandiseId: string;
  quantity: number;
  attributes?: CartAttribute[];
  /** Nests this line under an existing one (Storefront API 2025-10+). */
  parent?: { lineId: string };
};

export type CartLineUpdateInput = {
  id: string;
  merchandiseId?: string;
  quantity: number;
};

export type ShopifyProductRecommendationsOperation = {
  data: {
    productRecommendations: ShopifyProduct[];
  };
  variables: {
    productId: string;
  };
};

export type Page = {
  id: string;
  title: string;
  handle: string;
  body: string;
  bodySummary: string;
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
};

export type ShopifyPageOperation = {
  data: { pageByHandle: Page };
  variables: { handle: string };
};

export type ShopifyPagesOperation = {
  data: {
    pages: Connection<Page>;
  };
};

export type ShopifyArticle = {
  id: string;
  handle: string;
  title: string;
  excerpt: string | null;
  /** Plain-text body, used to derive an excerpt when the merchant set none. */
  content: string;
  contentHtml?: string;
  publishedAt: string;
  tags: string[];
  image: Image | null;
  authorV2: { name: string } | null;
  blog: { handle: string; title: string } | null;
  seo?: SEO;
};

/** An article with the storefront path Shopify's own URLs use. */
export type Article = Omit<ShopifyArticle, "blog" | "content"> & {
  blogHandle: string;
  blogTitle: string;
  path: string;
};

export type ShopifyBlog = {
  id: string;
  handle: string;
  title: string;
  seo?: SEO;
  articles?: Connection<ShopifyArticle>;
};

export type Blog = Omit<ShopifyBlog, "articles"> & {
  path: string;
  articles: Article[];
};

export type ShopifyBlogsOperation = {
  data: { blogs: Connection<Omit<ShopifyBlog, "articles">> };
  variables: { first: number };
};

export type ShopifyBlogOperation = {
  data: { blog: ShopifyBlog | null };
  variables: { handle: string; first: number };
};

export type ShopifyArticleOperation = {
  data: {
    blog:
      | (Pick<ShopifyBlog, "handle" | "title"> & {
          articleByHandle: ShopifyArticle | null;
        })
      | null;
  };
  variables: { blogHandle: string; handle: string };
};

export type ShopifyArticlesOperation = {
  data: { articles: Connection<ShopifyArticle> };
  variables: { first: number };
};
