import Link from "next/link";
import type { Metadata } from "next";
import ColourPicker, {
  type PickerColour,
} from "@/components/shop/colour-picker";
import ColourSpiral from "@/components/shop/colour-spiral";
import ShopView from "@/components/shop/shop-view";
import { Eyebrow, Headline } from "@/components/ui/section";
import { buildFacets } from "@/lib/shop/facets";
import { COLOUR_PARAM } from "@/lib/shop/colours";
import {
  countFacets,
  parseFilterState,
  shopUrl,
  toParamMap,
  toggleFacetUrl,
  type ShopSearchParams,
} from "@/lib/shop/filters";
import { getCatalog } from "@/lib/shopify";

/* ---------------------------------------------------------------------------
   Shop by colour

   Two steps at one address, which is the whole design:

     /shop-by-colour                     the palette. Pick one or several.
     /shop-by-colour?colour=…&view=products   the grid, filtered to them.

   `view=products` is the only thing separating them. Keeping both on one route
   rather than splitting them across two means the selection never has to be
   handed from one page to another, the back button walks a shopper from the
   grid to the palette with their colours still ticked, and a link to either
   step is a link anyone can send.

   Step two is `ShopView` - the same component the shop and every collection
   page use - because by then colour is simply a filter. The picker's job ends
   at writing `?colour=` into the URL; the facet engine has taken colour as an
   ordinary group since `lib/shop/colours.ts`, so sorting, the sidebar, the
   result count and pagination all work on it with nothing added here.
--------------------------------------------------------------------------- */

const BASE_PATH = "/shop-by-colour";

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

  const catalog = await getCatalog();
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

  /* ------------------------------------------------------------- step two */

  // Past the picker. Also the landing place for a store with no colour data at
  // all: with nothing to choose from, a palette of nothing is worse than the
  // grid it was going to lead to.
  if (params.get("view") === "products" || !group) {
    const chosen = (group?.values ?? []).filter((value) =>
      selected.includes(value.key)
    );

    const backHref = shopUrl(BASE_PATH, params, { view: null });

    return (
      <ShopView
        basePath={BASE_PATH}
        eyebrow={chosen.length ? "Step 2 of 2" : "Shop by colour"}
        title={
          chosen.length
            ? chosen.map((value) => value.label).join(" + ")
            : "Every colour we make"
        }
        description={
          chosen.length
            ? undefined
            : "Krafted in the shades a home already lives in. Narrow to one, or browse the lot."
        }
        intro={
          group ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {chosen.length ? (
                <span aria-hidden className="flex items-center gap-2">
                  {chosen.map((value) =>
                    value.swatch ? (
                      <span key={value.key} className="h-10 w-10">
                        <ColourSpiral swatch={value.swatch} size="compact" />
                      </span>
                    ) : null
                  )}
                </span>
              ) : null}
              <Link
                href={backHref}
                scroll={false}
                className="ui-mono text-muted underline decoration-1 underline-offset-4 hover:text-ink"
              >
                {chosen.length ? "Change colours" : "Choose colours"}
              </Link>
            </div>
          ) : null
        }
        searchParams={resolved}
      />
    );
  }

  /* ------------------------------------------------------------- step one */

  // The picker's button counts a multi-colour selection as a union, which
  // needs to know WHICH products each colour holds, not just how many. What
  // travels is each product's position in the catalogue rather than its id: an
  // index is a small number, and a Shopify product id is a 50-character URI.
  const membership = index.get(COLOUR_PARAM);
  const shipMembers = catalog.length <= MEMBERS_LIMIT;

  const colours: PickerColour[] = group.values
    // A colour nothing is in cannot be an entry point. The sidebar keeps a
    // zero-count value visible so it can be unticked; here there is nothing to
    // untick, and a dead swatch is just a promise the grid cannot keep.
    .filter((value) => value.count > 0 && value.swatch)
    .map((value) => ({
      key: value.key,
      label: value.label,
      swatch: value.swatch!,
      count: value.count,
      toggleHref: toggleFacetUrl(
        BASE_PATH,
        params,
        state,
        COLOUR_PARAM,
        value.key
      ),
      members: shipMembers
        ? catalog.flatMap((product, position) =>
            membership?.get(product.id)?.has(value.key) ? [position] : []
          )
        : undefined,
    }));

  const carry: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key === COLOUR_PARAM || key === "view" || key === "page") continue;
    carry[key] = value;
  }

  return (
    <div className="shell pb-4 pt-8 md:pt-12">
      <div className="max-w-measure">
        <Eyebrow align="left">Step 1 of 2</Eyebrow>
        <Headline className="mt-4">Shop by colour</Headline>
        <p className="body-mono mt-5 text-pretty">
          The house palette, one coil each. Choose the shades your home already
          lives in - as many as you like - and the next step shows only the
          Kompanions krafted in them.
        </p>
      </div>

      <div className="mt-10 md:mt-14">
        <ColourPicker
          colours={colours}
          selected={selected}
          basePath={BASE_PATH}
          carry={carry}
          allHref={shopUrl(BASE_PATH, params, {
            [COLOUR_PARAM]: null,
            view: "products",
          })}
        />
      </div>
    </div>
  );
}
