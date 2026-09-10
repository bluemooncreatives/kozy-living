import Link from "next/link";
import type { Metadata } from "next";
import Grid from "@/components/grid";
import ProductGridItems from "@/components/layout/product-grid-items";
import ColourPicker, {
  type PickerColour,
} from "@/components/shop/colour-picker";
import ColourSpiral from "@/components/shop/colour-spiral";
import { Eyebrow, Headline } from "@/components/ui/section";
import { buildFacets } from "@/lib/shop/facets";
import { COLOUR_PARAM } from "@/lib/shop/colours";
import {
  countFacets,
  parseFilterState,
  toParamMap,
  toggleFacetUrl,
  type ShopSearchParams,
} from "@/lib/shop/filters";
import { getCatalog, getColourPalette } from "@/lib/shopify";

/* ---------------------------------------------------------------------------
   Shop by colour

   One page, two steps, stacked:

     Step 1   the palette - the `shop_color` metaobjects, one coil each
     Step 2   the Kompanions krafted in whatever is chosen, as cards

   Step two starts EMPTY and stays empty until a colour is chosen. That is the
   point of the page: it is a way in through colour, not another shop grid with
   a colour filter bolted on. A shopper who wants the whole catalogue has
   /search, which is where the sidebar, the sort, the price band and the
   pagination all live. None of that is here, deliberately - the only controls
   on this page are the coils.

   The address is the state, as everywhere else in this shop:

     /shop-by-colour                        the palette, nothing below it
     /shop-by-colour?colour=rose-pink       one colour's Kompanions
     /shop-by-colour?colour=a,b#kompanions  what the picker's button links to

   Colour matching is not reimplemented here. `buildFacets` indexes every
   product by colour - see `lib/shop/colours.ts` for where the colours come
   from - and this page reads that index directly, so the same product answers
   to the same colour here as it does in the shop sidebar.

   `?view=products` is no longer written but is harmless on the way in: links
   shared while the two steps were separate pages still land here.
--------------------------------------------------------------------------- */

const BASE_PATH = "/shop-by-colour";

/** Fragment the picker's button scrolls to, and the id on the results section. */
const RESULTS_ANCHOR = "kompanions";

/**
 * Four columns at the widest, so the cards match the shop grid's cell size.
 * Wrong values here cost real bandwidth - the browser picks its image from this
 * before layout happens.
 */
const GRID_SIZES =
  "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw";

/**
 * Above this the per-colour membership lists stop being worth shipping to the
 * browser, and the picker's button drops its live count rather than the page
 * growing without bound. At 2,000 products - the catalogue ceiling - six
 * colours is a few tens of KB; the guard is for the day that ceiling moves.
 */
const MEMBERS_LIMIT = 2000;

export const metadata: Metadata = {
  title: "Shop by Colour",
  description:
    "Start with a colour. Rose Pink, Indigo Blue, Tulsi Green, Oat Milk, White and Sage Green - pick the shades your home already lives in, and see the Kompanions that match.",
};

export default async function ShopByColourPage({
  searchParams,
}: {
  searchParams?: Promise<ShopSearchParams>;
}) {
  const resolved = (await searchParams) ?? {};
  const params = toParamMap(resolved);

  const [catalog, palette] = await Promise.all([
    getCatalog(),
    getColourPalette(),
  ]);

  const { facets, index } = buildFacets(catalog);
  const state = parseFilterState(resolved, facets);
  const selected = state.selections.get(COLOUR_PARAM) ?? [];

  // `buildFacets` leaves every count at zero - counting is `countFacets`' job,
  // and it counts each group against the OTHER groups. For colour that means
  // the number beside a swatch is how many Kompanions that colour reaches
  // regardless of what else is already ticked, which is exactly what a picker
  // has to promise.
  const group = countFacets(catalog, index, state, facets).find(
    (entry) => entry.param === COLOUR_PARAM
  );

  const chosen = (group?.values ?? []).filter((value) =>
    selected.includes(value.key)
  );

  /* ------------------------------------------------- step one: the palette */

  // The picker's button counts a multi-colour selection as a union, which
  // needs to know WHICH products each colour holds, not just how many. What
  // travels is each product's position in the catalogue rather than its id: an
  // index is a small number, and a Shopify product id is a 50-character URI.
  const membership = index.get(COLOUR_PARAM);
  const shipMembers = catalog.length <= MEMBERS_LIMIT;

  // The palette leads, the catalogue fills it in.
  //
  // Shopify's `shop_color` metaobjects are the brand's complete set and their
  // order; the facet group is only the part of it the catalogue has been tagged
  // with. Showing the palette means a colour nothing is in stock in is still on
  // the page - greyed and unclickable, but present - which is the difference
  // between a brand with six colours and a page that looks like it has five.
  // Anything the catalogue carries that the palette does not is appended, so a
  // colour is never hidden by a metaobject someone deleted.
  const counted = new Map((group?.values ?? []).map((value) => [value.key, value]));
  const listed = new Set(palette.map((colour) => colour.key));

  const entries = [
    ...palette.map((colour) => ({
      key: colour.key,
      label: colour.label,
      swatch: colour.swatch,
      count: counted.get(colour.key)?.count ?? 0,
    })),
    ...(group?.values ?? [])
      .filter((value) => !listed.has(value.key) && value.swatch)
      .map((value) => ({
        key: value.key,
        label: value.label,
        swatch: value.swatch!,
        count: value.count,
      })),
  ];

  const colours: PickerColour[] = entries.map((entry) => ({
    ...entry,
    toggleHref: toggleFacetUrl(BASE_PATH, params, state, COLOUR_PARAM, entry.key),
    members: shipMembers
      ? catalog.flatMap((product, position) =>
          membership?.get(product.id)?.has(entry.key) ? [position] : []
        )
      : undefined,
  }));

  // What the picker's button has to carry forward. `view` is dropped rather
  // than preserved: it is the flag from when these were two pages, and writing
  // it back would keep it alive in every link the shop builds from here.
  const carry: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key === COLOUR_PARAM || key === "view" || key === "page") continue;
    carry[key] = value;
  }

  /* --------------------------------------------------- step two: the cards */

  // Read straight off the facet index rather than re-deriving colour here, so
  // one product answers to one colour on every surface. OR within the
  // selection: two colours chosen means "either", which is what picking two
  // coils looks like it should do.
  const matched = selected.length
    ? catalog.filter((product) =>
        selected.some((key) => membership?.get(product.id)?.has(key))
      )
    : [];

  const heading = chosen.map((value) => value.label).join(" + ");
  const resultLabel =
    matched.length === 1 ? "1 Kompanion" : `${matched.length} Kompanions`;

  return (
    <>
      <section
        id="palette"
        className="shell scroll-mt-[var(--header-h)] pb-4 pt-8 md:pt-12"
      >
        <div className="max-w-measure">
          <Eyebrow align="left">Step 1 of 2</Eyebrow>
          <Headline className="mt-4">Shop by colour</Headline>
          <p className="body-mono mt-5 text-pretty">
            The house palette, one coil each. Choose the shades your home already
            lives in - as many as you like - and the Kompanions krafted in them
            appear below.
          </p>
        </div>

        {colours.length ? (
          <div className="mt-10 md:mt-14">
            <ColourPicker
              colours={colours}
              selected={selected}
              basePath={BASE_PATH}
              carry={carry}
              resultsAnchor={RESULTS_ANCHOR}
            />
          </div>
        ) : (
          <p className="ui-mono mt-8 text-muted">
            No colours are published yet.{" "}
            <Link
              href="/search"
              className="underline decoration-1 underline-offset-4 hover:text-ink"
            >
              Browse every Kompanion
            </Link>
            .
          </p>
        )}
      </section>

      {/* Step two. `scroll-mt` clears the sticky header, so the picker's button
          lands on the heading rather than under the navigation. */}
      <section
        id={RESULTS_ANCHOR}
        className="shell scroll-mt-[var(--header-h)] pb-14 pt-10 md:pb-20 md:pt-14"
      >
        {selected.length ? (
          <>
            <Eyebrow align="left">Step 2 of 2</Eyebrow>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="flex items-center gap-4">
                <span aria-hidden className="flex items-center gap-2">
                  {chosen.map((value) =>
                    value.swatch ? (
                      <span key={value.key} className="h-11 w-11">
                        <ColourSpiral swatch={value.swatch} size="compact" />
                      </span>
                    ) : null
                  )}
                </span>
                <Headline count={matched.length || undefined}>{heading}</Headline>
              </div>
              <p className="spec-mono tabular-nums text-muted">{resultLabel}</p>
            </div>

            {matched.length ? (
              <Grid className="mt-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <ProductGridItems products={matched} sizes={GRID_SIZES} />
              </Grid>
            ) : (
              // Reachable from a shared link to a colour whose last product has
              // since sold out or been unpublished.
              <div className="panel mt-8 px-8 py-16 text-center">
                <p className="serif text-display-md">
                  Nothing in {heading} just now
                </p>
                <p className="body-mono mx-auto mt-4 max-w-measure">
                  Try another shade above, or see everything we make.
                </p>
                <Link href="/search" className="btn-solid mt-8">
                  View all Kompanions
                </Link>
              </div>
            )}
          </>
        ) : (
          // The resting state, and the whole reason step two is not a grid of
          // everything: this page answers "what do you have in this colour",
          // and until a colour is chosen there is no question to answer.
          <div className="rule-t pt-10 text-center">
            <p className="serif text-display-md text-balance">
              Pick a colour to see what we make in it
            </p>
            <p className="body-mono mx-auto mt-4 max-w-measure">
              Choose one coil, or several - the Kompanions krafted in those
              shades will appear here.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
