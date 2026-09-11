import Link from "next/link";
import type { Metadata } from "next";
import Grid from "@/components/grid";
import ProductGridItems from "@/components/layout/product-grid-items";
import ColourRail, { type RailColour } from "@/components/shop/colour-rail";
import ColourSpiral from "@/components/shop/colour-spiral";
import { Eyebrow, Headline } from "@/components/ui/section";
import { COLOUR_PARAM } from "@/lib/shop/colours";
import {
  COLOUR_RESULTS_ANCHOR,
  colourEntries,
  colourHref,
} from "@/lib/shop/palette";
import { toParamMap, type ShopSearchParams } from "@/lib/shop/filters";
import { getCatalog, getColourPalette } from "@/lib/shopify";

/* ---------------------------------------------------------------------------
   Shop by colour

   One page, two steps, stacked:

     Step 1   the palette - the `shop_color` metaobjects, one coil each
     Step 2   the Kompanions krafted in the chosen colour, as cards

   ONE COLOUR AT A TIME. Not a facet that happens to be rendered as coils - a
   choice. Picking a second colour replaces the first rather than adding to it,
   so the heading is always a colour rather than a sum of them, and a shopper
   is always looking at one shade the way they would look at one paint chip.
   Multi-select belongs in the shop sidebar at /search, where colour sits beside
   size and price and the whole point is to combine them.

   That is also why there is no "apply" button. With one colour selected at a
   time a click IS the choice, so every coil is a plain link and the whole page
   is server-rendered - no client state, works with JavaScript off, correct
   under the back button.

   Step two starts EMPTY and stays empty until a colour is chosen. This is a way
   in through colour, not another shop grid with a colour filter bolted on; the
   sidebar, sort, price band and pagination all live at /search, deliberately
   not here.

   The address is the state, as everywhere else in this shop:

     /shop-by-colour                        the palette, nothing below it
     /shop-by-colour?colour=rose-pink       one colour's Kompanions

   Colour matching is not reimplemented here. `buildFacets` indexes every
   product by colour - see `lib/shop/colours.ts` for where the colours come
   from - and `lib/shop/palette.ts` reads that index, so the same product
   answers to the same colour here as it does in the shop sidebar.
--------------------------------------------------------------------------- */

/**
 * Four columns at the widest, so the cards match the shop grid's cell size.
 * Wrong values here cost real bandwidth - the browser picks its image from this
 * before layout happens.
 */
const GRID_SIZES =
  "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw";

export const metadata: Metadata = {
  title: "Shop by Colour",
  description:
    "Start with a colour. Rose Pink, Indigo Blue, Tulsi Green, Oat Milk, White and Sage Green - pick the shade your home already lives in, and see the Kompanions krafted in it.",
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

  const { entries, membership } = colourEntries(palette, catalog);

  /**
   * The chosen colour, or none.
   *
   * Only ever ONE, even when the URL names several. A link shared from before
   * this page was single-select - or hand-edited - resolves to its first valid
   * colour rather than 404ing or quietly reintroducing the "A + B" heading this
   * page no longer has a layout for.
   */
  const requested = (params.get(COLOUR_PARAM) ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  const selected =
    entries.find(
      (entry) => entry.count > 0 && requested.includes(entry.key)
    ) ?? null;

  const colours: RailColour[] = entries.map((entry) => ({
    ...entry,
    active: entry.key === selected?.key,
    // Clicking the colour already showing clears it, which is the only way back
    // to the empty state without the browser's back button.
    href: colourHref(entry.key === selected?.key ? null : entry.key),
  }));

  const matched = selected
    ? catalog.filter((product) => membership.get(product.id)?.has(selected.key))
    : [];

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
            The house palette, one coil each. Choose the shade your home already
            lives in, and the Kompanions krafted in it appear below.
          </p>
        </div>

        {colours.length ? (
          <div className="mt-10 md:mt-14">
            <ColourRail colours={colours} />
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

      {/* Step two. `scroll-mt` clears the sticky header, so a colour's fragment
          lands on the heading rather than under the navigation. */}
      <section
        id={COLOUR_RESULTS_ANCHOR}
        className="shell scroll-mt-[var(--header-h)] pb-14 pt-10 md:pb-20 md:pt-14"
      >
        {selected ? (
          <>
            <Eyebrow align="left">Step 2 of 2</Eyebrow>
            {/* The count rides on the heading as the house superscript rather
                than as a second line of its own - there is no pagination here
                for a "13-24 of 90" to belong to. */}
            <div className="mt-4 flex items-center gap-4">
              <span aria-hidden className="h-11 w-11 shrink-0">
                <ColourSpiral swatch={selected.swatch} size="compact" />
              </span>
              <Headline count={matched.length || undefined}>
                {selected.label}
              </Headline>
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
                  Nothing in {selected.label} just now
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
              Choose a coil above and the Kompanions krafted in that shade will
              appear here.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
