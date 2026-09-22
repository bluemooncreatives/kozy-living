import Link from "next/link";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Grid from "@/components/grid";
import ProductGridItems from "@/components/layout/product-grid-items";
import { Eyebrow, Headline } from "@/components/ui/section";
import { sorting } from "@/lib/constants";
import {
  getCatalog,
  getCollectionProductOrder,
  getCollections,
  getPrimaryMenu,
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
  PRODUCTS_PER_PAGE,
  PRODUCTS_PER_PAGE_MOBILE,
  type ShopSearchParams,
} from "@/lib/shop/filters";
import ActiveFilters, { type ActiveFilter } from "./active-filters";
import BrowseRail from "./browse-rail";
import CategoryNav, {
  type CategoryNavItem,
  type CategoryNavSub,
} from "./category-nav";
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

/**
 * The collection a menu entry points at, or null for anything else.
 *
 * `/search/<handle>` is a collection; `/search` is the whole catalogue and
 * `/product/...`, `/blogs/...` and the rest are not collections at all. The
 * phone's category rows scope the grid, so only the first shape belongs in them
 * - see `normalizeMenuPath` in `lib/shopify` for where these paths come from.
 */
function menuCollectionHandle(path: string): string | null {
  const prefix = "/search/";
  if (!path.startsWith(prefix)) return null;

  return path.slice(prefix.length).split(/[/?#]/)[0] || null;
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

  const [catalog, collections, menu] = await Promise.all([
    getCatalog(),
    getCollections(),
    getPrimaryMenu(),
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

  const [headerList, cookieStore] = await Promise.all([
    headers(),
    cookies(),
  ]);

  const chMobile = headerList.get("sec-ch-ua-mobile");
  const ua = headerList.get("user-agent") || "";
  const isMobileUA =
    chMobile === "?1" ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);

  const cookieVal = cookieStore.get("kozy_is_mobile")?.value;
  const isMobile =
    params.get("mobile") === "1"
      ? true
      : params.get("mobile") === "0"
      ? false
      : cookieVal !== undefined
      ? cookieVal === "1"
      : isMobileUA;

  const perPage = isMobile ? PRODUCTS_PER_PAGE_MOBILE : PRODUCTS_PER_PAGE;

  const filtered = applyFilters(ordered, index, state);
  const sorted = sortProducts(filtered, state.sort, rank);
  const results = paginate(sorted, state.page, perPage);

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

  /* ------------------------------------------- phone category rows */

  // The merchandised groups, read off the Shopify menu rather than named here:
  // a top-level entry that points at a collection and has collection children
  // is a category. Admin adding a fourth group puts it on the phone with no
  // code change, which is the same contract the header nav works to.
  const categories = menu.flatMap((entry) => {
    const handle = menuCollectionHandle(entry.path);
    if (!handle) return [];

    // The group's own collection already leads its sub-row, and the live menu
    // does point one child at its parent - without this that destination would
    // occupy two chips on the same row and light up as active in both.
    const seen = new Set([handle]);

    const children: CategoryNavItem[] = (entry.items ?? []).flatMap((child) => {
      const childHandle = menuCollectionHandle(child.path);
      if (!childHandle || seen.has(childHandle)) return [];
      seen.add(childHandle);

      const active = childHandle === collectionHandle;
      // Nothing in it under the current search is a dead chip, unless it is the
      // one being viewed - that has to stay visible to be left.
      if (!collectionCounts.get(childHandle) && !active) return [];

      return [
        {
          title: child.title,
          href: collectionUrl(child.path, params),
          active,
        },
      ];
    });

    if (!children.length) return [];

    const atRoot = handle === collectionHandle;
    const active = atRoot || children.some((child) => child.active);
    if (!collectionCounts.get(handle) && !active) return [];

    return [
      {
        title: entry.title,
        href: collectionUrl(entry.path, params),
        active,
        atRoot,
        children,
      },
    ];
  });

  const activeCategory = categories.find((category) => category.active) ?? null;

  const categoryItems: CategoryNavItem[] = categories.map(
    ({ title, href, active }) => ({
      title,
      href,
      active,
      group: true,
    })
  );

  // Collections reachable from the footer and the home page sit outside every
  // group. Without this the rows would show nothing active while the grid is
  // plainly filtered, which reads as a broken control rather than as a corner
  // of the shop the groups do not cover.
  const stray =
    collectionHandle && !activeCategory
      ? collections.find(
          (collection: Collection) => collection.handle === collectionHandle
        )
      : undefined;

  if (stray) {
    categoryItems.push({
      title: stray.title,
      href: collectionUrl(stray.path, params),
      active: true,
    });
  }

  const categorySub: CategoryNavSub | null = activeCategory
    ? {
        label: activeCategory.title,
        items: [
          {
            title: `All ${activeCategory.title}`,
            href: activeCategory.href,
            active: activeCategory.atRoot,
          },
          ...activeCategory.children,
        ],
      }
    : null;

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
        swatch: value.swatch,
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

  const panelProps = {
    groups,
    price: facets.price,
    priceSelection: state.price,
    priceAction: { path: basePath, carry: priceCarry },
    clearHref,
    hasFilters: hasActiveFilters(state),
  };

  const panel = <FilterPanel {...panelProps} />;

  // The drawer's copy carries the collection list as well. At lg the sidebar
  // appears and the rail above it already lists every collection, so repeating
  // them down the side would be the same control twice on one screen.
  const drawerPanel = <FilterPanel {...panelProps} browse={browse} />;

  const sortOptions = sorting.map((item) => ({
    title: item.title,
    href: shopUrl(basePath, params, { sort: item.slug ?? null }),
    active: (state.sort ?? null) === (item.slug ?? null),
  }));

  const resultLabel =
    results.total === 1 ? "1 result" : `${results.total} results`;

  // Anything standing between the shopper and the whole catalogue: a
  // collection, a search, or a facet. On the unfiltered shop page there is
  // nothing to widen out of.
  const isNarrowed = Boolean(
    collectionHandle || query || hasActiveFilters(state)
  );

  return (
    <>
      <div className="shell pb-6 pt-8 md:pt-12">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow align="left">{eyebrow}</Eyebrow>
          {/* The way back out of a narrowed view. The phone's category rows
              carry only the merchandised groups, so without this a collection
              is a corner of the shop with no door back to the whole of it. It
              is absent when the whole catalogue is already what is on screen,
              where it would lead nowhere. */}
          {isNarrowed ? (
            <Link
              href="/search"
              scroll={false}
              prefetch={false}
              className="ui-mono inline-flex shrink-0 items-center gap-1.5 rounded-chip border border-ink/15 bg-card px-3 py-1.5 text-xs text-muted transition-colors hover:border-ink hover:text-ink md:hidden"
            >
              View all
              <ArrowUpRightIcon aria-hidden className="h-3 w-3 shrink-0" />
            </Link>
          ) : null}
        </div>
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
        <div className="shell flex flex-col gap-2 py-2 md:flex-row md:items-center md:justify-between md:gap-5 md:py-2.5">
          {/* Row 1 on mobile: 2-column layout (Left: Filters + Count, Right: Sort) */}
          <div className="flex w-full items-center justify-between gap-3 md:w-auto">
            <div className="flex shrink-0 items-center gap-3">
              <FilterDrawer
                activeCount={activeFilters.length}
                resultLabel={resultLabel}
              >
                {drawerPanel}
              </FilterDrawer>
              {/* The range needs room the filter button and the sort control
                  have already taken on a phone, so the narrow screen gets the
                  total on its own and the range appears once there is width. */}
              <p className="spec-mono truncate tabular-nums">
                {results.total === 0 ? (
                  "No results"
                ) : (
                  <>
                    <span className="hidden min-[380px]:inline">
                      {`${results.from}-${results.to} of `}
                    </span>
                    {results.total}
                  </>
                )}
              </p>
            </div>

            {/* Mobile-only Sort menu (Right column of Row 1) */}
            <div className="shrink-0 md:hidden">
              <SortMenu options={sortOptions} />
            </div>
          </div>

          {/* Row 2 on a phone: the merchandised groups, and the open group's
              own collections under them. The flat rail takes over at md, where
              there is width for every collection at once. */}
          <CategoryNav items={categoryItems} sub={categorySub} />
          <BrowseRail items={browse} className="hidden md:block" />

          {/* Desktop-only Sort menu */}
          <div className="hidden shrink-0 md:block">
            <SortMenu options={sortOptions} />
          </div>
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
