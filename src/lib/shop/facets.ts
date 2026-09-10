import type { CatalogProduct } from "@/lib/shopify/types";
import { normalizeLabel, toSlug } from "./normalize";
import {
  COLOUR_PARAM,
  colourFromTag,
  isColourGroupName,
  orderColours,
  productColours,
  type Swatch,
} from "./colours";

// Re-exported so the facet engine stays the one import for anything that groups
// on a merchant label; the functions themselves live a level down, out of the
// cycle this module and `colours.ts` would otherwise form.
export { normalizeLabel, toSlug };

/* ---------------------------------------------------------------------------
   The facet engine

   Filters are DERIVED from the catalogue, never listed in code. Whatever a
   merchant adds in Shopify - a new collection, a new product option, a tag, a
   product type - becomes a filter on the next revalidation, and disappears
   again when the last product carrying it goes.

   Shopify's own storefront `filters` facet was the first thing tried and does
   not serve this store: it returns Availability and Price only until the
   merchant configures Search & Discovery, and it cannot be asked for at all on
   the unfiltered shop page, since this store has no collection with the handle
   "all". Deriving from the products themselves works identically on every
   surface and gives exact counts.

   The cost of deriving is that raw merchant data is messy - the same option is
   spelled "Size", "size" and "Sizes", the same value "UK 3-4" and "uk-3-4",
   and options get used as free-text note fields ("Write your initials in notes
   at checkout"). Normalisation merges the spellings; the quality rules below
   drop the groups that are not browse dimensions at all.
--------------------------------------------------------------------------- */

/** A group is a way to browse only if enough of the catalogue answers to it. */
const MIN_FACET_PRODUCTS = 4;

/** One value is not a choice. */
const MIN_FACET_VALUES = 2;

/** A facet value is a label, not a sentence. Longer means it is a note field. */
const MAX_VALUE_WORDS = 5;

/**
 * Shopify gives a product with no real options a single option named "Title"
 * whose only value is "Default Title". It describes nothing.
 */
const SKIPPED_GROUPS = new Set(["title"]);

/**
 * Vendor is not derived. This is a single-brand store whose `vendor` field
 * holds three spellings of its own name, one of them the full marketing
 * tagline; a "Brand" filter built from that is noise, not navigation. Flip this
 * on the day the store actually stocks other labels.
 */
const DERIVE_BRAND_FACET = false;

/** Query parameters the shop page owns. A derived group may not claim one. */
export const RESERVED_PARAMS = new Set([
  "q",
  "sort",
  "page",
  "price",
  "availability",
  "offer",
  "collection",
  COLOUR_PARAM,
  // The shop-by-colour page's own step marker. Reserved here so a merchant who
  // one day names a product option "View" cannot claim it and send every
  // filter click back to the picker.
  "view",
]);

export type FacetValue = {
  /** Slug used in the URL. */
  key: string;
  /** What the merchant typed, in its most common spelling. */
  label: string;
  /** Matches under every OTHER active group. Zero means selecting it is a dead end. */
  count: number;
  /** Colour values only - the paint chip rendered beside the label. */
  swatch?: Swatch;
};

export type FacetGroup = {
  /** Query parameter this group reads and writes. */
  param: string;
  label: string;
  values: FacetValue[];
};

export type PriceBounds = {
  min: number;
  max: number;
  currencyCode: string;
};

export type Facets = {
  groups: FacetGroup[];
  price: PriceBounds | null;
};

/**
 * Per-product membership, keyed by group parameter. Built once alongside the
 * facets and reused for every filter test and every count.
 */
export type FacetIndex = Map<string, Map<string, Set<string>>>;

/* ------------------------------------------------------------ normalisation */

/**
 * The comparison form of a group name: the normalised label with a plural last
 * word folded to its singular, so "Size"/"Sizes" and "Sleeve Detail"/"Sleeve
 * Details" are one group rather than four.
 */
function normalizeGroupName(name: string): string {
  const words = normalizeLabel(name).split(" ").filter(Boolean);
  const last = words[words.length - 1];

  if (last && last.length > 3 && last.endsWith("s") && !last.endsWith("ss")) {
    words[words.length - 1] = last.slice(0, -1);
  }

  return words.join(" ");
}

/** Title-cases a label the merchant left all-lowercase; leaves theirs alone otherwise. */
function presentGroupLabel(label: string): string {
  if (label !== label.toLowerCase()) return label;

  return label.replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

/* ------------------------------------------------------------------ sources */

/** True when the merchant is running a promotion on this product. */
export function isOnSale(product: CatalogProduct): boolean {
  const compareAt = Number(
    product.compareAtPriceRange?.maxVariantPrice?.amount ?? 0
  );
  const price = Number(product.priceRange?.maxVariantPrice?.amount ?? 0);

  return compareAt > 0 && compareAt > price;
}

/**
 * Groups that are a yes/no about a product rather than a value it carries.
 * They go through the same index, the same matcher and the same counter as
 * derived groups, so the page has one filtering code path.
 */
const FLAG_GROUPS: {
  param: string;
  label: string;
  values: { key: string; label: string; test: (p: CatalogProduct) => boolean }[];
}[] = [
  {
    param: "availability",
    label: "Availability",
    values: [
      { key: "in-stock", label: "In stock", test: (p) => p.availableForSale },
      { key: "sold-out", label: "Sold out", test: (p) => !p.availableForSale },
    ],
  },
  {
    param: "offer",
    label: "Offers",
    values: [{ key: "on-sale", label: "On sale", test: isOnSale }],
  },
];

type Candidate = {
  /** Original spellings of the group name, by how often each was used. */
  names: Map<string, number>;
  values: Map<string, { labels: Map<string, number>; products: Set<string> }>;
};

function record(
  candidates: Map<string, Candidate>,
  name: string,
  value: string,
  productId: string
) {
  const groupKey = normalizeGroupName(name);
  if (!groupKey || SKIPPED_GROUPS.has(groupKey)) return;

  // Colour has its own group, assembled in `buildColourGroup` from the
  // metafield AND from options named like this one. Deriving here as well
  // would put "Color", "Color Way" and "Belt Colour" in the sidebar beside it,
  // each holding a slice of the same idea.
  if (isColourGroupName(groupKey)) return;

  const valueKey = normalizeLabel(value);
  if (!valueKey) return;

  let candidate = candidates.get(groupKey);
  if (!candidate) {
    candidate = { names: new Map(), values: new Map() };
    candidates.set(groupKey, candidate);
  }

  candidate.names.set(name, (candidate.names.get(name) ?? 0) + 1);

  let entry = candidate.values.get(valueKey);
  if (!entry) {
    entry = { labels: new Map(), products: new Set() };
    candidate.values.set(valueKey, entry);
  }

  entry.labels.set(value, (entry.labels.get(value) ?? 0) + 1);
  entry.products.add(productId);
}

function mostCommon(counts: Map<string, number>): string {
  let best = "";
  let bestCount = -1;

  for (const [label, count] of counts) {
    // `>` not `>=`: ties keep the first spelling seen, which is the order
    // Shopify returned and so is stable between builds.
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }

  return best;
}

/* ----------------------------------------------------------------- ordering */

/**
 * Garment sizes in the order a human expects them, not the order they happen
 * to be popular in.
 *
 * Written as slugs because that is what a facet value is keyed by - ranking
 * against the normalised form instead silently ranked only the single-word
 * sizes, and left "S-M" and "2XL" to fall through to the popularity order.
 */
const SIZE_ORDER = [
  "xxxs",
  "xxs",
  "xs",
  "xs-s",
  "s",
  "s-m",
  "m",
  "m-l",
  "l",
  "l-xl",
  "xl",
  "xl-xxl",
  "xxl",
  "2-xl",
  "3-xl",
  "4-xl",
  "5-xl",
];
const SIZE_RANK = new Map(
  SIZE_ORDER.map((size, index) => [toSlug(size), index])
);

function leadingNumber(key: string): number | null {
  const match = key.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/**
 * Sizes read as a scale, everything else as a leaderboard. Deciding per group
 * rather than per value keeps an unrelated group whose values happen to include
 * an "L" from being reshuffled around it.
 */
function looksLikeSizes(keys: string[]): boolean {
  const scaled = keys.filter(
    (key) => SIZE_RANK.has(key) || leadingNumber(key) !== null
  ).length;

  return keys.length > 0 && scaled / keys.length >= 0.6;
}

function orderValues(values: FacetValue[]): FacetValue[] {
  const scale = looksLikeSizes(values.map((value) => value.key));

  return [...values].sort((a, b) => {
    if (scale) {
      const rankA = SIZE_RANK.get(a.key);
      const rankB = SIZE_RANK.get(b.key);
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
      if (rankA !== undefined) return -1;
      if (rankB !== undefined) return 1;

      const numberA = leadingNumber(a.key);
      const numberB = leadingNumber(b.key);
      if (numberA !== null && numberB !== null && numberA !== numberB) {
        return numberA - numberB;
      }
      if (numberA !== null) return -1;
      if (numberB !== null) return 1;
    }

    if (a.count !== b.count) return b.count - a.count;

    return a.label.localeCompare(b.label);
  });
}

/* ------------------------------------------------------------------ colour */

/**
 * The Colour group, and its slice of the membership index.
 *
 * Built apart from the derived groups because a colour is a name AND a paint
 * chip, and because the house palette has an order the catalogue must not
 * reshuffle - see `lib/shop/colours.ts`. What comes back is an ordinary
 * `FacetGroup` on the `colour` parameter, so matching, counting, the sidebar
 * and the URL all treat it like any other filter from here on.
 *
 * `MIN_FACET_PRODUCTS` deliberately does not apply. Colour is the dimension
 * this store leads with; two colours across three products is still the way in,
 * and the picker page exists to be linked to whether or not the catalogue has
 * reached some threshold.
 */
function buildColourGroup(products: CatalogProduct[]): {
  group: FacetGroup;
  membership: Map<string, Set<string>>;
} | null {
  const membership = new Map<string, Set<string>>();
  const values = new Map<string, FacetValue>();

  for (const product of products) {
    for (const colour of productColours(product)) {
      if (!values.has(colour.key)) {
        values.set(colour.key, {
          key: colour.key,
          label: colour.label,
          count: 0,
          swatch: colour.swatch,
        });
      }

      let owned = membership.get(product.id);
      if (!owned) {
        owned = new Set();
        membership.set(product.id, owned);
      }
      owned.add(colour.key);
    }
  }

  if (values.size < MIN_FACET_VALUES) return null;

  return {
    group: {
      param: COLOUR_PARAM,
      label: "Colour",
      values: orderColours([...values.values()]),
    },
    membership,
  };
}

/* -------------------------------------------------------------------- build */

/**
 * Derives the filter groups for a set of products, plus the index used to test
 * membership.
 *
 * Groups and their value lists come from this set and only this set - the
 * products in view before any facet is applied - so the sidebar holds still
 * while you tick boxes. The counts on it are filled in by `countFacets`, which
 * is the part that reacts to the current selection.
 */
export function buildFacets(products: CatalogProduct[]): {
  facets: Facets;
  index: FacetIndex;
} {
  const candidates = new Map<string, Candidate>();

  for (const product of products) {
    for (const option of product.options ?? []) {
      for (const value of option.values ?? []) {
        record(candidates, option.name, value, product.id);
      }
    }

    for (const tag of product.tags ?? []) {
      // A tag that is purely a colour name has already been folded into the
      // Colour group; listing it under Tags as well is the same filter twice.
      if (colourFromTag(tag)) continue;
      record(candidates, "Tags", tag, product.id);
    }

    if (product.productType) {
      record(candidates, "Product type", product.productType, product.id);
    }

    if (DERIVE_BRAND_FACET && product.vendor) {
      record(candidates, "Brand", product.vendor, product.id);
    }
  }

  const index: FacetIndex = new Map();
  const groups: FacetGroup[] = [];
  const claimed = new Set(RESERVED_PARAMS);

  for (const [groupKey, candidate] of candidates) {
    // A note field masquerading as an option: drop the sentences first, then
    // judge what is left. "Initials: Write your initials in notes at checkout"
    // loses every value and falls out here; a real option keeps its values.
    for (const [valueKey, entry] of candidate.values) {
      const label = mostCommon(entry.labels);
      if (label.trim().split(/\s+/).length > MAX_VALUE_WORDS) {
        candidate.values.delete(valueKey);
      }
    }

    if (candidate.values.size < MIN_FACET_VALUES) continue;

    // Options whose every value is a bare number are price add-ons - the
    // merchant is using the option name as the label and the value as a
    // surcharge. Nobody browses by "1500".
    const allNumeric = [...candidate.values.keys()].every((key) =>
      /^[\d ]+$/.test(key)
    );
    if (allNumeric) continue;

    const covered = new Set<string>();
    for (const entry of candidate.values.values()) {
      for (const id of entry.products) covered.add(id);
    }
    if (covered.size < MIN_FACET_PRODUCTS) continue;

    // A derived group must never shadow a parameter the page owns, and two
    // groups must never share one.
    let param = toSlug(groupKey);
    while (!param || claimed.has(param)) param = `opt-${param || groupKey}`;
    claimed.add(param);

    const membership = new Map<string, Set<string>>();
    const values: FacetValue[] = [];

    for (const [valueKey, entry] of candidate.values) {
      const slug = toSlug(valueKey);
      values.push({ key: slug, label: mostCommon(entry.labels), count: 0 });

      for (const id of entry.products) {
        let owned = membership.get(id);
        if (!owned) {
          owned = new Set();
          membership.set(id, owned);
        }
        owned.add(slug);
      }
    }

    index.set(param, membership);
    groups.push({
      param,
      label: presentGroupLabel(mostCommon(candidate.names)),
      values: orderValues(values),
    });
  }

  // Biggest reach first: the filter that divides the most of the catalogue is
  // the one worth reading first.
  groups.sort((a, b) => {
    const reach = (group: FacetGroup) => index.get(group.param)?.size ?? 0;
    const difference = reach(b) - reach(a);
    return difference !== 0 ? difference : a.label.localeCompare(b.label);
  });

  // Flags lead the panel - they are the coarsest cut and everyone recognises
  // them - but they are indexed the same way as everything else.
  const flagGroups: FacetGroup[] = [];

  for (const flag of FLAG_GROUPS) {
    const membership = new Map<string, Set<string>>();
    const values: FacetValue[] = [];

    for (const value of flag.values) {
      let matched = 0;

      for (const product of products) {
        if (!value.test(product)) continue;
        matched += 1;

        let owned = membership.get(product.id);
        if (!owned) {
          owned = new Set();
          membership.set(product.id, owned);
        }
        owned.add(value.key);
      }

      values.push({ key: value.key, label: value.label, count: matched });
    }

    // Worth showing only where it actually divides the set: a store with
    // nothing sold out gets no Availability filter, and one with no promotion
    // running gets no Offers filter.
    const divides = values.some(
      (value) => value.count > 0 && value.count < products.length
    );
    if (!divides) continue;

    index.set(flag.param, membership);
    flagGroups.push({
      param: flag.param,
      label: flag.label,
      values: values.map((value) => ({ ...value, count: 0 })),
    });
  }

  // Colour leads the groups. It is the dimension the brand browses by and the
  // one the shop-by-colour page is built on, so it sits above the flags rather
  // than being sorted in among the derived groups by reach.
  const colour = buildColourGroup(products);
  if (colour) index.set(COLOUR_PARAM, colour.membership);

  return {
    facets: {
      groups: [
        ...(colour ? [colour.group] : []),
        ...flagGroups,
        ...groups,
      ],
      price: priceBounds(products),
    },
    index,
  };
}

/**
 * The price span of a set, rounded outward to whole currency units so the
 * bounds read as round numbers rather than as one product's exact price.
 */
export function priceBounds(products: CatalogProduct[]): PriceBounds | null {
  let min = Infinity;
  let max = -Infinity;
  let currencyCode = "";

  for (const product of products) {
    const low = Number(product.priceRange?.minVariantPrice?.amount);
    const high = Number(product.priceRange?.maxVariantPrice?.amount);

    if (Number.isFinite(low)) min = Math.min(min, low);
    if (Number.isFinite(high)) max = Math.max(max, high);
    currencyCode ||= product.priceRange?.minVariantPrice?.currencyCode ?? "";
  }

  // A catalogue where everything costs the same has nothing to filter by.
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;

  return { min: Math.floor(min), max: Math.ceil(max), currencyCode };
}
