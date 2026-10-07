export const TAGS = {
  collections: "collections",
  products: "products",
  cart: "cart",
  blogs: "blogs",
};

export type SortFilterItem = {
  title: string;
  slug: string | null;
  sortKey: "RELEVANCE" | "BEST_SELLING" | "CREATED_AT" | "PRICE";
  reverse: boolean;
};

export const defaultSort: SortFilterItem = {
  title: "Relevance",
  slug: null,
  sortKey: "RELEVANCE",
  reverse: false,
};

export const sorting: SortFilterItem[] = [
  defaultSort,
  {
    title: "Trending",
    slug: "trending-desc",
    sortKey: "BEST_SELLING",
    reverse: false,
  }, // asc
  {
    title: "Latest arrivals",
    slug: "latest-desc",
    sortKey: "CREATED_AT",
    reverse: true,
  },
  {
    title: "Price: Low to high",
    slug: "price-asc",
    sortKey: "PRICE",
    reverse: false,
  }, // asc
  {
    title: "Price: High to low",
    slug: "price-desc",
    sortKey: "PRICE",
    reverse: true,
  },
];

/**
 * Upper bound for a single cart line. Guards against a stuck "+" button or a
 * hand-crafted request driving the quantity to something absurd.
 */
export const MAX_LINE_QUANTITY = 99;

export const HIDDEN_PRODUCT_TAG = "nextjs-frontend-hidden";

/**
 * Marks a Shopify product that exists only to be charged as a personalisation
 * add-on (initials, gift box). Unlike `HIDDEN_PRODUCT_TAG`, which hides a
 * product from listings but still renders its page, an add-on has no page at
 * all: it is never sold on its own. See docs/personalisation-add-ons.md.
 */
export const ADDON_PRODUCT_TAG = "kozy-addon";

/**
 * Hidden line attribute carried by any cart line that has add-ons nested under
 * it. Its only job is to be unique: Shopify merges two lines of one variant
 * with identical attributes, so without it two totes with different initials
 * collapsed into one line and the second set of children landed on the first.
 * The leading underscore keeps it out of checkout and the order email.
 */
export const ADDON_PARENT_ATTRIBUTE = "_kozy_line";

/**
 * The custom kit builder's products (docs/custom-kit-builder.md). A piece -
 * the kit's bathrobe, slippers, pouch and mask - is sold only inside a kit,
 * and the container is the ₹0 line the pieces nest under. Both are Unlisted in
 * Admin, which keeps Shopify's own surfaces clear; these tags are the
 * storefront's half of the guarantee, so a piece flipped back to Active still
 * never lists here and its product page still 404s.
 */
export const KIT_PIECE_TAG = "kozy-kit-piece";
export const KIT_CONTAINER_TAG = "kozy-kit";

/**
 * Visible line property tying a kit's lines together ("Kit: K-7Q2X"). Not
 * underscored on purpose: nesting is lost wherever Shopify does not keep it -
 * the Customer Account API, order edits, POS, courier exports - and this code
 * is what still groups the pieces there, and what the packer reads.
 */
export const KIT_ATTRIBUTE = "Kit";
export const DEFAULT_OPTION = "Default Title";
export const SHOPIFY_GRAPHQL_API_ENDPOINT = "/api/2026-07/graphql.json";
