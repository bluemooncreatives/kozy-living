import type { CatalogProduct } from "@/lib/shopify/types";
import { getCatalog, getColourPalette } from "@/lib/shopify";
import { COLOUR_PARAM, type ColourValue, type Swatch } from "./colours";
import { buildFacets } from "./facets";

/* ---------------------------------------------------------------------------
   The palette, with the catalogue counted against it

   Two surfaces show the colour rail - the homepage teaser and the shop-by-colour
   page - and both need the same answer: the brand's colours, in the brand's
   order, each carrying how many Kompanions are actually in it. This is that
   answer, in one place, so the two cannot disagree about what the palette is.

   The merge rule, and why it is this way round:

     the palette LEADS    Shopify's `shop_color` metaobjects are the brand's
                          complete set and their running order. A colour nothing
                          is tagged with yet still belongs on the page - greyed,
                          but present. A brand with six colours must not look
                          like a brand with five because stock moved.

     the catalogue FILLS  counts come from the facet index, so a colour's number
                          means the same thing here as the number beside its
                          checkbox in the shop sidebar.

     leftovers TRAIL      a colour products carry that the palette does not -
                          a metaobject someone deleted - is appended rather than
                          dropped, so it is never silently unreachable.
--------------------------------------------------------------------------- */

/** Where the colour rail sends people, from anywhere on the site. */
export const SHOP_BY_COLOUR_PATH = "/shop-by-colour";

/** The results section on that page, so a colour link lands on the cards. */
export const COLOUR_RESULTS_ANCHOR = "kompanions";

/**
 * The shop-by-colour page showing one colour, or - with `null` - its palette
 * with nothing chosen. Used by that page's own rail, for selecting and
 * clearing.
 */
export function colourHref(key: string | null): string {
  if (!key) return SHOP_BY_COLOUR_PATH;

  return `${SHOP_BY_COLOUR_PATH}?${COLOUR_PARAM}=${encodeURIComponent(
    key
  )}#${COLOUR_RESULTS_ANCHOR}`;
}

/**
 * The shop, filtered to one colour.
 *
 * Where the homepage coils go. The shop is the right destination from a
 * homepage teaser: a shopper arriving on a colour usually wants to keep
 * narrowing - by size, by price, by collection - and all of that lives at
 * /search. The shop-by-colour page is the other motion, browsing the palette
 * itself, and the section's "All colours" link is what leads there.
 *
 * Safe because it is the same facet: `colour` is the parameter the shop's own
 * sidebar writes, and these keys come from the same index that fills it, so a
 * link built here arrives with the checkbox already ticked.
 */
export function shopColourHref(key: string): string {
  return `/search?${COLOUR_PARAM}=${encodeURIComponent(key)}`;
}

export type ColourEntry = {
  key: string;
  label: string;
  swatch: Swatch;
  /** Kompanions in this colour, catalogue-wide. */
  count: number;
};

/**
 * Merges a palette with a catalogue. Pure, so a caller that already holds the
 * catalogue - the shop-by-colour page, which needs it to render the cards -
 * does not fetch it twice.
 */
export function colourEntries(
  palette: ColourValue[],
  products: CatalogProduct[]
): { entries: ColourEntry[]; membership: Map<string, Set<string>> } {
  const { facets, index } = buildFacets(products);
  const membership = index.get(COLOUR_PARAM) ?? new Map<string, Set<string>>();

  const group = facets.groups.find((entry) => entry.param === COLOUR_PARAM);

  // `buildFacets` leaves every count at zero - counting is `countFacets`' job,
  // and it counts a group against whatever else is selected. Nothing else is
  // selected on either of these surfaces, so the count is simply how many
  // products carry the colour, and the membership index already says that.
  const countOf = (key: string) => {
    let total = 0;
    for (const owned of membership.values()) if (owned.has(key)) total += 1;
    return total;
  };

  const listed = new Set(palette.map((colour) => colour.key));

  const entries: ColourEntry[] = [
    ...palette.map((colour) => ({
      key: colour.key,
      label: colour.label,
      swatch: colour.swatch,
      count: countOf(colour.key),
    })),
    ...(group?.values ?? [])
      .filter((value) => !listed.has(value.key) && value.swatch)
      .map((value) => ({
        key: value.key,
        label: value.label,
        swatch: value.swatch as Swatch,
        count: countOf(value.key),
      })),
  ];

  return { entries, membership };
}

/**
 * The palette with counts, fetched.
 *
 * For surfaces that want the rail and nothing else - the homepage. Both calls
 * are cached and shared with the shop, so this costs a data-cache read rather
 * than a round trip to Shopify.
 */
export async function getColourEntries(): Promise<ColourEntry[]> {
  const [catalog, palette] = await Promise.all([
    getCatalog(),
    getColourPalette(),
  ]);

  return colourEntries(palette, catalog).entries;
}
