import { defaultSort, sorting } from "@/lib/constants";
import type { CatalogProduct } from "@/lib/shopify/types";
import type { FacetGroup, FacetIndex, Facets, PriceBounds } from "./facets";

/* ---------------------------------------------------------------------------
   The shop URL

   Every piece of shop state - the collection, the search term, the sort, each
   facet, the page - lives in the URL and nowhere else. That is what makes the
   whole surface server-rendered, shareable, back-button-correct and functional
   with JavaScript switched off: a filter is a link, not a click handler.

   Shape:
     /search                        all Kompanions
     /search/<handle>               one Shopify collection
     ?q=                            search term
     ?sort=<slug>                   one of `sorting`
     ?availability=in-stock         flags, comma-separated for OR
     ?price_min= &price_max=        inclusive band, either end optional
     ?<group>=<value>,<value>       a derived facet group
     ?page=2                        1 is never written
     ?view=products                 shop-by-colour only: past the picker

   Values are slugs of the merchant's own labels, so the URL stays readable and
   a link keeps working as long as the value still exists in Shopify. A value
   that no longer exists is dropped on parse rather than 404ing.
--------------------------------------------------------------------------- */

export const PRODUCTS_PER_PAGE = 24;
export const PRODUCTS_PER_PAGE_MOBILE = 10;

export type ShopSearchParams = Record<string, string | string[] | undefined>;

export type PriceSelection = { min: number | null; max: number | null };

export type FilterState = {
  /** Facet parameter -> selected value keys. OR inside a group, AND across groups. */
  selections: Map<string, string[]>;
  price: PriceSelection | null;
  /** Sort slug, or null for the default. */
  sort: string | null;
  /** Trimmed search term, "" when absent. */
  query: string;
  /** Requested page, 1-based. Not yet clamped to the result count. */
  page: number;
};

/** The order parameters are written in, so one state always makes one URL. */
const PARAM_ORDER = [
  "q",
  "sort",
  "availability",
  "offer",
  "price_min",
  "price_max",
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Query parameters as a flat map.
 *
 * Repeated parameters keep their first value: the shop writes a group's values
 * comma-separated, so a second `?size=` can only come from a hand-edited URL,
 * and picking one is friendlier than erroring on it.
 */
export function toParamMap(searchParams: ShopSearchParams): Map<string, string> {
  const params = new Map<string, string>();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const single = first(value);
    if (single !== undefined && single !== "") params.set(key, single);
  }

  return params;
}

/**
 * Reads the filter state out of the URL, keeping only what the current facets
 * actually offer.
 *
 * Unknown parameters and unknown values are dropped silently. A stale link -
 * a size Shopify no longer sells, an option the merchant renamed - then shows
 * the unfiltered set rather than an empty grid or a 404.
 */
export function parseFilterState(
  searchParams: ShopSearchParams,
  facets: Facets
): FilterState {
  const params = toParamMap(searchParams);
  const selections = new Map<string, string[]>();

  for (const group of facets.groups) {
    const raw = params.get(group.param);
    if (!raw) continue;

    const allowed = new Set(group.values.map((value) => value.key));
    const chosen: string[] = [];

    for (const part of raw.split(",")) {
      const key = part.trim();
      if (allowed.has(key) && !chosen.includes(key)) chosen.push(key);
    }

    if (chosen.length) selections.set(group.param, chosen);
  }

  const sortSlug = params.get("sort") ?? null;

  return {
    selections,
    price: parsePrice(
      params.get("price_min"),
      params.get("price_max"),
      facets.price
    ),
    sort: sorting.some((item) => item.slug === sortSlug) ? sortSlug : null,
    query: (params.get("q") ?? "").trim(),
    page: parsePage(params.get("page")),
  };
}

/**
 * The price band, as two independent ends so a plain `<form method="get">` can
 * write it and the filter keeps working with JavaScript off.
 *
 * Ends outside the catalogue's own span are clamped to it and a reversed band
 * is turned the right way round, so a hand-typed 9999-1 filters instead of
 * returning nothing.
 */
function parsePrice(
  rawMin: string | undefined,
  rawMax: string | undefined,
  bounds: PriceBounds | null
): PriceSelection | null {
  if (!bounds) return null;

  const read = (raw: string | undefined): number | null => {
    if (raw === undefined || raw.trim() === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };

  let min = read(rawMin);
  let max = read(rawMax);

  if (min === null && max === null) return null;

  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  if (min !== null) min = Math.max(bounds.min, Math.min(min, bounds.max));
  if (max !== null) max = Math.max(bounds.min, Math.min(max, bounds.max));

  // A band that spans the whole catalogue filters nothing; treat it as absent
  // so it does not show up as an active filter chip.
  if (
    (min === null || min <= bounds.min) &&
    (max === null || max >= bounds.max)
  ) {
    return null;
  }

  return { min, max };
}

function parsePage(raw: string | undefined): number {
  const page = Number.parseInt(raw ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** True when anything narrows the catalogue beyond the collection itself. */
export function hasActiveFilters(state: FilterState): boolean {
  return state.selections.size > 0 || state.price !== null;
}

/* ------------------------------------------------------------------ matching */

function withinPrice(product: CatalogProduct, price: PriceSelection): boolean {
  const low = Number(product.priceRange?.minVariantPrice?.amount ?? 0);
  const high = Number(product.priceRange?.maxVariantPrice?.amount ?? low);

  // Overlap, not containment: a product whose variants run 3,500-6,500 belongs
  // in a 4,000-5,000 band, because something you can actually buy sits in it.
  if (price.min !== null && high < price.min) return false;
  if (price.max !== null && low > price.max) return false;

  return true;
}

/**
 * Tests one product against the state.
 *
 * `exceptParam` leaves one group out, which is what makes the counts beside
 * each checkbox correct: the count for a value in group G is how many products
 * it would add given everything selected outside G. Without it, ticking one
 * size would show every other size as (0).
 */
export function matchesFilters(
  product: CatalogProduct,
  index: FacetIndex,
  state: FilterState,
  exceptParam?: string
): boolean {
  for (const [param, values] of state.selections) {
    if (param === exceptParam) continue;

    const owned = index.get(param)?.get(product.id);
    if (!owned) return false;
    if (!values.some((value) => owned.has(value))) return false;
  }

  if (state.price && exceptParam !== "price") {
    if (!withinPrice(product, state.price)) return false;
  }

  return true;
}

export function applyFilters(
  products: CatalogProduct[],
  index: FacetIndex,
  state: FilterState
): CatalogProduct[] {
  if (!hasActiveFilters(state)) return products;

  return products.filter((product) => matchesFilters(product, index, state));
}

/**
 * Fills in the count beside every facet value, and the price span still
 * reachable, against everything selected in the OTHER groups.
 *
 * The value lists themselves are left exactly as `buildFacets` produced them -
 * a filter that vanishes the moment you use it is worse than one showing (0),
 * because there is then nothing left to click to undo it.
 */
export function countFacets(
  products: CatalogProduct[],
  index: FacetIndex,
  state: FilterState,
  facets: Facets
): FacetGroup[] {
  return facets.groups.map((group) => {
    const counts = new Map<string, number>();

    for (const product of products) {
      if (!matchesFilters(product, index, state, group.param)) continue;

      const owned = index.get(group.param)?.get(product.id);
      if (!owned) continue;

      for (const value of owned) counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return {
      ...group,
      values: group.values.map((value) => ({
        ...value,
        count: counts.get(value.key) ?? 0,
      })),
    };
  });
}

/* ------------------------------------------------------------------- sorting */

/**
 * Orders the filtered set.
 *
 * The default keeps whatever order the products arrived in, which is the point:
 * that is Shopify's best-selling order on the shop page, the merchant's own
 * arrangement on a collection page, and Shopify's relevance ranking for a
 * search. Every other sort is computed here so it behaves identically on all
 * three, and `rank` carries the catalogue-wide best-selling position so
 * "Trending" means the same thing inside a collection as outside one.
 */
export function sortProducts(
  products: CatalogProduct[],
  sortSlug: string | null,
  rank: Map<string, number>
): CatalogProduct[] {
  const sort = sorting.find((item) => item.slug === sortSlug) ?? defaultSort;
  const position = new Map(products.map((product, index) => [product.id, index]));
  const keep = (a: CatalogProduct, b: CatalogProduct) =>
    (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0);

  if (sort.sortKey === "RELEVANCE") return products;

  const sorted = [...products];

  if (sort.sortKey === "BEST_SELLING") {
    sorted.sort((a, b) => {
      const difference =
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER);
      return difference !== 0 ? difference : keep(a, b);
    });
  } else if (sort.sortKey === "CREATED_AT") {
    sorted.sort((a, b) => {
      const difference =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return difference !== 0 ? difference : keep(a, b);
    });
  } else if (sort.sortKey === "PRICE") {
    sorted.sort((a, b) => {
      const difference =
        Number(a.priceRange.minVariantPrice.amount) -
        Number(b.priceRange.minVariantPrice.amount);
      return difference !== 0 ? difference : keep(a, b);
    });
  }

  return sort.reverse ? sorted.reverse() : sorted;
}

/* ---------------------------------------------------------------- pagination */

export type Page<T> = {
  items: T[];
  /** The page actually shown, clamped into range. */
  page: number;
  totalPages: number;
  total: number;
  /** 1-based index of the first and last item shown, for "13-24 of 90". */
  from: number;
  to: number;
};

export function paginate<T>(
  items: T[],
  requestedPage: number,
  perPage: number = PRODUCTS_PER_PAGE
): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * perPage;
  const shown = items.slice(start, start + perPage);

  return {
    items: shown,
    page,
    totalPages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + shown.length,
  };
}

/* --------------------------------------------------------------------- links */

/**
 * A shop URL built from the current one.
 *
 * `patch` sets or, with `null`, removes parameters. `page` is dropped unless
 * the patch names it, because any change to what is being filtered invalidates
 * where you were in the results - landing on page 4 of a two-page result is the
 * classic way faceted navigation breaks.
 */
export function shopUrl(
  path: string,
  params: Map<string, string>,
  patch: Record<string, string | null> = {}
): string {
  const next = new Map(params);

  next.delete("page");

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }

  const search = new URLSearchParams();

  for (const key of PARAM_ORDER) {
    const value = next.get(key);
    if (value) search.set(key, value);
  }

  for (const key of [...next.keys()].sort()) {
    if (PARAM_ORDER.includes(key) || key === "page") continue;
    const value = next.get(key);
    if (value) search.set(key, value);
  }

  // Page last, so the human-readable part of the URL comes first.
  const page = next.get("page");
  if (page && page !== "1") search.set("page", page);

  const query = search.toString();

  return query ? `${path}?${query}` : path;
}

/**
 * The URL for turning one facet value on or off. Everything else in the URL,
 * including the other values in the same group, is left alone.
 */
export function toggleFacetUrl(
  path: string,
  params: Map<string, string>,
  state: FilterState,
  param: string,
  value: string
): string {
  const current = state.selections.get(param) ?? [];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];

  return shopUrl(path, params, { [param]: next.length ? next.join(",") : null });
}

/** The URL with every facet cleared but the collection, search term and sort kept. */
export function clearFiltersUrl(
  path: string,
  params: Map<string, string>,
  facets: Facets
): string {
  const patch: Record<string, string | null> = {
    price_min: null,
    price_max: null,
  };

  for (const group of facets.groups) patch[group.param] = null;

  return shopUrl(path, params, patch);
}

/**
 * A page link. The only place `page` survives `shopUrl`'s reset, and page 1 is
 * written as the bare URL so one page has one address.
 */
export function pageUrl(
  path: string,
  params: Map<string, string>,
  page: number
): string {
  return shopUrl(path, params, { page: page > 1 ? String(page) : null });
}

/**
 * Moving between collections keeps the search term and the sort and drops the
 * facets, because they describe the collection you are leaving. Carrying a size
 * that the next collection does not stock lands you on an empty grid you did
 * not ask for.
 */
export function collectionUrl(
  path: string,
  params: Map<string, string>
): string {
  const next = new Map<string, string>();
  const q = params.get("q");
  const sort = params.get("sort");

  if (q) next.set("q", q);
  if (sort) next.set("sort", sort);

  return shopUrl(path, next);
}
