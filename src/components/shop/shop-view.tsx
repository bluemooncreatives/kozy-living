import Link from "next/link";
import { redirect } from "next/navigation";
import Grid from "@/components/grid";
import ProductGridItems from "@/components/layout/product-grid-items";
import { Eyebrow, Headline } from "@/components/ui/section";
import { sorting } from "@/lib/constants";
import {
  getCatalog,
  getCollectionProductOrder,
  getCollections,
  searchCatalogIds,
} from "@/lib/shopify";
import type { CatalogProduct, Collection } from "@/lib/shopify/types";
import { buildFacets } from "@/lib/shop/facets";
import {
  applyFilters,
  clearFiltersUrl,
  collectionUrl,
  countFacets,
  hasActiveFilters,
  pageUrl,
  paginate,
  parseFilterState,
  shopUrl,
  sortProducts,
  toParamMap,
  toggleFacetUrl,
  type ShopSearchParams,
} from "@/lib/shop/filters";
import ActiveFilters, { type ActiveFilter } from "./active-filters";
import FilterDrawer from "./filter-drawer";
import FilterPanel, {
  type BrowseItem,
  type PanelGroup,
} from "./filter-panel";
import Pagination from "./pagination";
import SortMenu from "./sort-menu";

/**
 * The browse surface: all Kompanions, one collection, or a search - one
 * component, because they differ only in which products they start from.
 *
 * Order of work, and why it is this order:
 *
 *   1. the catalogue, once, from Shopify
 *   2. the scope    - what a shopper is browsing before any facet is applied
 *   3. the facets   - DERIVED from the scope, so the sidebar describes what is
 *                     actually in front of you and nothing else
 *   4. the state    - read out of the URL and validated against those facets
 *   5. the counts   - each group counted against the OTHER groups
 *   6. sort, then page
 *
 * Facets come from the scope rather than from the filtered set on purpose: a
 * sidebar whose options vanish as you tick them leaves nothing to untick.
 */

const GRID_SIZES =
  "(min-width: 1536px) 22vw, (min-width: 1280px) 28vw, (min-width: 640px) 42vw, 100vw";

function orderBy<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const position = new Map(ids.map((id, index) => [id, index]));

  return [...items].sort(
    (a, b) =>
      (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "INR",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ShopView({
  basePath,
  collectionHandle,
  eyebrow,
  title,
  description,
  searchParams,
}: {
  /** The route this view lives at - every link is built from it. */
  basePath: string;
  /** Absent on the all-Kompanions page. */
  collectionHandle?: string;
  eyebrow: string;
  title: string;
  description?: string;
  searchParams: ShopSearchParams;
}) {
  const params = toParamMap(searchParams);
  const query = (params.get("q") ?? "").trim();

  const [catalog, collections] = await Promise.all([
    getCatalog(),
    getCollections(),
  ]);

  // Catalogue-wide best-selling position, so "Trending" ranks the same way
  // inside a collection as it does across the whole shop.
  const rank = new Map(catalog.map((product, index) => [product.id, index]));

  // Search narrows before the collection does, and carries Shopify's own
  // relevance order with it. Going through the Storefront `search` rather than
  // matching titles here is what keeps synonyms and misspellings working.
  let searched: CatalogProduct[] = catalog;

  if (query) {
    const ids = await searchCatalogIds(query);
    const matched = new Set(ids);

    searched = orderBy(
      catalog.filter((product) => matched.has(product.id)),
      ids
    );
  }

  const scope = collectionHandle
    ? searched.filter((product) =>
        product.collections.some(
          (collection) => collection.handle === collectionHandle
        )
      )
    : searched;

  const { facets, index } = buildFacets(scope);
  const state = parseFilterState(searchParams, facets);

  // The merchant's own arrangement of a collection is what its unsorted page
  // should show - that is what Shopify's storefront does. A search has its own
  // ranking, which outranks it.
  const ordered =
    collectionHandle && !state.sort && !query
      ? orderBy(scope, (await getCollectionProductOrder(collectionHandle)) ?? [])
      : scope;

  const filtered = applyFilters(ordered, index, state);
  const sorted = sortProducts(filtered, state.sort, rank);
  const results = paginate(sorted, state.page);

  // One result page, one address. Anything else - `page=1`, `page=0`,
  // `page=nonsense`, a page past the end after a filter narrowed the set -
  // redirects to the URL that page actually lives at.
  const canonicalPage = results.page > 1 ? String(results.page) : undefined;
  if ((params.get("page") ?? undefined) !== canonicalPage) {
    redirect(pageUrl(basePath, params, results.page));
  }

  /* ------------------------------------------------------------- sidebar */

  const collectionCounts = new Map<string, number>();
  for (const product of searched) {
    for (const collection of product.collections) {
      collectionCounts.set(
        collection.handle,
        (collectionCounts.get(collection.handle) ?? 0) + 1
      );
    }
  }

  const browse: BrowseItem[] = [
    {
      title: "All Kompanions",
      href: collectionUrl("/search", params),
      count: searched.length,
      active: !collectionHandle,
    },
    ...collections
      .filter(
        (collection: Collection) =>
          // The synthetic "All" entry is rendered above with a live count, and
          // a collection nothing is in is a dead link - unless it is the one
          // being viewed, which has to stay visible to be left.
          collection.handle &&
          ((collectionCounts.get(collection.handle) ?? 0) > 0 ||
            collection.handle === collectionHandle)
      )
      .map((collection: Collection) => ({
        title: collection.title,
        href: collectionUrl(collection.path, params),
        count: collectionCounts.get(collection.handle) ?? 0,
        active: collection.handle === collectionHandle,
      })),
  ];

  const counted = countFacets(scope, index, state, facets);

  const groups: PanelGroup[] = counted.map((group) => {
    const selected = state.selections.get(group.param) ?? [];

    return {
      param: group.param,
      label: group.label,
      activeCount: selected.length,
      values: group.values.map((value) => ({
        ...value,
        active: selected.includes(value.key),
        href: toggleFacetUrl(basePath, params, state, group.param, value.key),
      })),
    };
  });

  const clearHref = clearFiltersUrl(basePath, params, facets);

  // The price form is a real GET form, so it has to carry the rest of the shop
  // state itself. `page` is left out: a new band is a new result set.
  const priceCarry: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key === "page" || key === "price_min" || key === "price_max") continue;
    priceCarry[key] = value;
  }

  const activeFilters: ActiveFilter[] = [];
  for (const group of groups) {
    for (const value of group.values) {
      if (!value.active) continue;
      activeFilters.push({
        group: group.label,
        label: value.label,
        href: value.href,
      });
    }
  }

  if (state.price && facets.price) {
    const { currencyCode } = facets.price;
    const low = formatMoney(state.price.min ?? facets.price.min, currencyCode);
    const high = formatMoney(state.price.max ?? facets.price.max, currencyCode);

    activeFilters.push({
      group: "Price",
      label: `${low} - ${high}`,
      href: shopUrl(basePath, params, { price_min: null, price_max: null }),
    });
  }

  const panel = (
    <FilterPanel
      browse={browse}
      groups={groups}
      price={facets.price}
      priceSelection={state.price}
      priceAction={{ path: basePath, carry: priceCarry }}
      clearHref={clearHref}
      hasFilters={hasActiveFilters(state)}
    />
  );

  const sortOptions = sorting.map((item) => ({
    title: item.title,
    href: shopUrl(basePath, params, { sort: item.slug ?? null }),
    active: (state.sort ?? null) === (item.slug ?? null),
  }));

  const noun = results.total === 1 ? "Kompanion" : "Kompanions";
  const resultLabel = `${results.total} ${noun}`;

  return (
    <>
      <div className="shell pb-6 pt-8 md:pt-12">
        <Eyebrow align="left">{eyebrow}</Eyebrow>
        <Headline className="mt-4" count={results.total}>
          {title}
        </Headline>
        {description ? (
          <p className="body-mono mt-5 max-w-measure text-pretty">
            {description}
          </p>
        ) : null}
        {query ? (
          <p className="ui-mono mt-5">
            <span className="text-muted">Results for </span>
            <span className="font-semibold">&ldquo;{query}&rdquo;</span>
            <Link
              href={shopUrl(basePath, params, { q: null })}
              className="ml-3 text-muted underline decoration-1 underline-offset-4 hover:text-ink"
            >
              Clear search
            </Link>
          </p>
        ) : null}
      </div>

      {/* Sticky under the header stack - `--header-h` is the single source. */}
      <div className="rule-y sticky top-[var(--header-h)] z-40 bg-paper/95 backdrop-blur-md">
        <div className="shell flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FilterDrawer
              activeCount={activeFilters.length}
              resultLabel={resultLabel}
            >
              {panel}
            </FilterDrawer>
            {/* The range needs room the filter button and the sort control
                have already taken on a phone, so the narrow screen gets the
                total on its own and the range appears once there is width. */}
            <p className="spec-mono truncate tabular-nums">
              {results.total === 0 ? (
                "No results"
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {`${results.from}-${results.to} of `}
                  </span>
                  {resultLabel}
                </>
              )}
            </p>
          </div>
          <SortMenu options={sortOptions} />
        </div>
      </div>

      <div className="shell py-8 md:py-10">
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div
              data-lenis-prevent
              className="sticky top-[calc(var(--header-h)+4.25rem)] max-h-[calc(100svh-var(--header-h)-6rem)] overflow-y-auto pb-6 pr-1"
            >
              {panel}
            </div>
          </aside>

          <div className="min-w-0">
            <ActiveFilters filters={activeFilters} clearHref={clearHref} />

            {results.items.length ? (
              <>
                <Grid className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  <ProductGridItems
                    products={results.items}
                    sizes={GRID_SIZES}
                  />
                </Grid>
                <Pagination
                  page={results.page}
                  totalPages={results.totalPages}
                  hrefFor={(page) => pageUrl(basePath, params, page)}
                />
              </>
            ) : (
              <div className="panel px-8 py-20 text-center">
                <p className="serif text-display-md">
                  {hasActiveFilters(state)
                    ? "Nothing matches all of that"
                    : query
                      ? "No Kompanions match"
                      : "Nothing on this shelf yet"}
                </p>
                <p className="body-mono mx-auto mt-4 max-w-measure">
                  {hasActiveFilters(state)
                    ? "Loosen one of the filters and the shelf fills back up."
                    : query
                      ? "Try a broader term - a fibre or a collection, like 'waffle', 'linen' or 'Dabu'."
                      : "Kompanions in this collection are on their way. Explore the rest of the catalogue."}
                </p>
                <Link
                  href={hasActiveFilters(state) ? clearHref : "/search"}
                  scroll={false}
                  className="btn-solid mt-8"
                >
                  {hasActiveFilters(state)
                    ? "Clear all filters"
                    : "View all Kompanions"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
