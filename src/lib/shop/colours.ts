import type { CatalogProduct } from "@/lib/shopify/types";
import { normalizeLabel, toSlug } from "./normalize";

/* ---------------------------------------------------------------------------
   Colour, end to end

   Colour is the one browse dimension this store leads with, so it does not go
   through the generic facet derivation in `facets.ts`. It has its own module
   for three reasons the generic engine cannot serve:

     1. A colour needs a SWATCH. Every other facet value is a word; a colour
        value that arrives as "Tulsi Green" has to come out the other end
        carrying #3A5233 as well, or the filter row and the picker page have
        nothing to paint.

     2. Colour lives in several places at once. The merchant records it as a
        product metafield (the intended home), but the same store also carries
        it as a variant option ("Color", "Color Way", "Belt Colour") and as
        tags. Left to the generic engine those become FOUR sidebar groups that
        each hold a slice of the same idea. Here they are one.

     3. The house palette has an ORDER. Rose, indigo, tulsi, oat, white, sage
        is the order the brand presents itself in; a popularity sort would
        reshuffle it every time stock moved.

   Everything else - matching, counting, URL handling, pagination - is the
   generic machinery. A colour facet is an ordinary `FacetGroup` under the
   `colour` parameter by the time it leaves this file.
--------------------------------------------------------------------------- */

/** The query parameter the colour facet owns, on every shop surface. */
export const COLOUR_PARAM = "colour";

export type Swatch = {
  hex: string;
  /**
   * True for a colour that cannot be seen against the page ground. White is
   * the only one in the house palette; it is drawn as an outline instead of a
   * fill wherever a swatch or a spiral is painted.
   */
  outline?: boolean;
};

export type ColourValue = {
  /** Slug used in the URL. */
  key: string;
  /** What the shopper reads. The merchant's own spelling for anything off-palette. */
  label: string;
  swatch: Swatch;
  /** True when this is one of the six house colours rather than a derived one. */
  house: boolean;
};

/* ------------------------------------------------------------------ palette */

/**
 * The six house colours, in brand order.
 *
 * These hexes are the brand's, not Shopify's: a merchant recording colour as a
 * text metafield gives us the NAME only, and a name has to resolve to a paint
 * chip somewhere. This is that somewhere - the one place to correct a colour
 * if the brand revises it.
 *
 * `aliases` are the other spellings seen in the catalogue that mean this
 * colour. They are matched on the normalised form, so casing, hyphens and
 * spacing are already handled and only genuinely different words belong here.
 */
export const HOUSE_PALETTE: {
  key: string;
  label: string;
  hex: string;
  outline?: boolean;
  aliases: string[];
}[] = [
  {
    key: "rose-pink",
    label: "Rose Pink",
    hex: "#DDA0A6",
    aliases: ["rose", "pink", "rose dust", "blush", "dusty rose"],
  },
  {
    key: "indigo-blue",
    label: "Indigo Blue",
    hex: "#1E3D70",
    aliases: ["indigo", "blue", "navy", "midnight blue"],
  },
  {
    key: "tulsi-green",
    label: "Tulsi Green",
    hex: "#3A5233",
    aliases: ["tulsi", "forest green", "deep green", "bottle green"],
  },
  {
    key: "oat-milk",
    label: "Oat Milk",
    hex: "#E3D5C2",
    aliases: ["oat", "oatmeal", "beige", "sand", "ecru", "natural"],
  },
  {
    key: "white",
    label: "White",
    hex: "#FFFFFF",
    outline: true,
    aliases: ["ivory", "off white", "optic white", "milk"],
  },
  {
    key: "sage-green",
    label: "Sage Green",
    hex: "#92A583",
    aliases: ["sage", "green", "olive", "moss"],
  },
];

/**
 * Colours the catalogue uses that are not house colours.
 *
 * Same shape as the palette above and matched the same way, so an off-palette
 * value is a first-class facet value rather than a special case - it just is
 * not one of the six.
 *
 * A merchant's colour value is rarely a bare colour word: it is "Indigo
 * Sunshine", "Taupe Flora", "Teal Stripes", "Green Belt". The colour word
 * inside it is what decides both the chip AND the identity, which is what stops
 * "Sunshine Yellow" from the option list and "Yellow" from the tag list
 * becoming two filters for one colour.
 */
const EXTRA_COLOURS: { key: string; label: string; hex: string; aliases: string[] }[] = [
  { key: "black", label: "Black", hex: "#1B1B1B", aliases: ["charcoal"] },
  { key: "grey", label: "Grey", hex: "#8C8C8C", aliases: ["gray", "slate"] },
  { key: "stone", label: "Stone", hex: "#B8B0A4", aliases: [] },
  { key: "taupe", label: "Taupe", hex: "#B9A996", aliases: ["mushroom"] },
  { key: "camel", label: "Camel", hex: "#C4A177", aliases: ["tan"] },
  { key: "toffee", label: "Toffee", hex: "#9A6B45", aliases: ["caramel"] },
  { key: "brown", label: "Brown", hex: "#6F4E37", aliases: ["chocolate"] },
  { key: "rust", label: "Rust", hex: "#A6522C", aliases: ["terracotta"] },
  { key: "red", label: "Red", hex: "#B23B32", aliases: ["scarlet"] },
  { key: "maroon", label: "Maroon", hex: "#6E2A32", aliases: ["burgundy", "wine"] },
  { key: "mustard", label: "Mustard", hex: "#D2A22B", aliases: [] },
  { key: "yellow", label: "Yellow", hex: "#E7C255", aliases: ["sunshine", "butter"] },
  { key: "gold", label: "Gold", hex: "#C9A227", aliases: [] },
  { key: "peach", label: "Peach", hex: "#E8B79A", aliases: ["apricot"] },
  { key: "lilac", label: "Lilac", hex: "#B7A6CE", aliases: ["lavender"] },
  { key: "purple", label: "Purple", hex: "#6B4F87", aliases: ["plum", "aubergine"] },
  { key: "teal", label: "Teal", hex: "#2F7A78", aliases: [] },
  { key: "turquoise", label: "Turquoise", hex: "#3AA6A0", aliases: ["aqua"] },
  { key: "mint", label: "Mint", hex: "#AFD3BE", aliases: ["seafoam"] },
  { key: "cream", label: "Cream", hex: "#F3E7D6", aliases: ["vanilla"] },
];
/**
 * Product metafields read as colour, in the order they are trusted.
 *
 * The first identifier that comes back with a value on a product wins, so the
 * merchant's own `custom.colour` outranks the Shopify standard taxonomy field
 * that the theme editor may also have populated. Identifiers Shopify has no
 * definition for simply return null and cost nothing.
 *
 * ADDING ONE: put it here and it is picked up everywhere - the fragment below
 * builds the GraphQL from this list, so there is no second place to edit.
 */
export const COLOUR_METAFIELDS: { namespace: string; key: string }[] = [
  { namespace: "custom", key: "colour" },
  { namespace: "custom", key: "color" },
  { namespace: "custom", key: "colours" },
  { namespace: "custom", key: "colors" },
  { namespace: "custom", key: "colour_family" },
  { namespace: "custom", key: "color_family" },
  { namespace: "shopify", key: "color-pattern" },
];

/** The `identifiers:` argument for `productCardFragment`, built from the list above. */
export const COLOUR_METAFIELD_IDENTIFIERS = COLOUR_METAFIELDS.map(
  ({ namespace, key }) => `{namespace: "${namespace}", key: "${key}"}`
).join(", ");

/* ----------------------------------------------------------------- matching */

type PaletteEntry = {
  key: string;
  label: string;
  hex: string;
  outline?: boolean;
  aliases: string[];
  house: boolean;
};

/**
 * Every colour this store can name, house colours first.
 *
 * Order matters twice: a word claimed by both lists resolves to the house
 * colour, and a hex equidistant between two resolves to the house one as well.
 */
const KNOWN_COLOURS: PaletteEntry[] = [
  ...HOUSE_PALETTE.map((colour) => ({ ...colour, house: true })),
  ...EXTRA_COLOURS.map((colour) => ({ ...colour, house: false })),
];

/** Normalised label or alias -> the colour it names. First writer wins, so house colours do. */
const BY_NORMALISED = new Map<string, PaletteEntry>();

for (const colour of KNOWN_COLOURS) {
  for (const name of [colour.label, ...colour.aliases]) {
    const key = normalizeLabel(name);
    if (key && !BY_NORMALISED.has(key)) BY_NORMALISED.set(key, colour);
  }
}

/**
 * Words a colour value carries that describe the print, the part or the finish
 * rather than the colour. Stripped before matching, so "Indigo Sunshine",
 * "Green Belt" and "Teal Stripes" each still find their colour instead of being
 * dropped for being more than one word.
 */
const IGNORED_WORDS = new Set([
  "belt",
  "colour",
  "color",
  "colourway",
  "colorway",
  "shade",
  "solid",
  "print",
  "printed",
  "stripe",
  "stripes",
  "striped",
  "check",
  "checks",
  "checked",
  "floral",
  "flora",
  "way",
]);

/**
 * The colour a merchant value names, or null.
 *
 * Whole value first - "Rose Pink" is Rose Pink - then word by word. A house
 * colour beats an off-palette one in the same value, which is what sends
 * "Indigo Sunshine" to Indigo Blue rather than to Yellow; a value naming two
 * colours from the same list is genuinely ambiguous and is dropped rather than
 * filed under whichever word happened to come first.
 *
 * Matching on the COLOUR rather than on the whole string is what keeps one
 * colour to one filter: "Sunshine Yellow" from a variant option and "Yellow"
 * from a tag are the same swatch, and have to be the same checkbox.
 */
function matchColour(value: string): PaletteEntry | null {
  const normalised = normalizeLabel(value);
  if (!normalised) return null;

  const exact = BY_NORMALISED.get(normalised);
  if (exact) return exact;

  const house = new Set<PaletteEntry>();
  const other = new Set<PaletteEntry>();

  for (const word of normalised.split(" ")) {
    if (!word || IGNORED_WORDS.has(word)) continue;

    const hit = BY_NORMALISED.get(word);
    if (hit) (hit.house ? house : other).add(hit);
  }

  if (house.size === 1) return [...house][0];
  if (house.size === 0 && other.size === 1) return [...other][0];

  return null;
}

function isHex(value: string): boolean {
  return /^#?[0-9a-f]{6}$/i.test(value.trim());
}

function channels(value: string): [number, number, number] {
  const raw = value.trim().replace(/^#/, "");

  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

/**
 * The named colour nearest a raw hex, for a merchant who recorded colour as a
 * `color` metafield rather than as a name.
 *
 * A hex is not a label - "#3A5233" in a sidebar tells a shopper nothing - so an
 * unrecognised one is dropped rather than shown as itself. The threshold is
 * deliberately tight: it forgives the rounding between a design file and a
 * colour picker, not a colour the store has never named.
 */
function nearestColour(hex: string): PaletteEntry | null {
  const [r, g, b] = channels(hex);
  if (![r, g, b].every(Number.isFinite)) return null;

  let best: PaletteEntry | null = null;
  let bestDistance = Infinity;

  for (const colour of KNOWN_COLOURS) {
    const [hr, hg, hb] = channels(colour.hex);
    const distance = (r - hr) ** 2 + (g - hg) ** 2 + (b - hb) ** 2;

    // `<` not `<=`: a tie keeps the earlier entry, and house colours are first.
    if (distance < bestDistance) {
      bestDistance = distance;
      best = colour;
    }
  }

  // ~24 per channel. Past that the two are different colours to the eye, and
  // calling one the other would mislabel the filter.
  return bestDistance <= 24 * 24 * 3 ? best : null;
}

/** Turns one merchant string into a colour, or null when it names none. */
export function toColourValue(raw: string): ColourValue | null {
  const value = raw.trim();
  if (!value) return null;

  const match = isHex(value) ? nearestColour(value) : matchColour(value);
  if (!match) return null;

  return {
    key: match.key,
    label: match.label,
    swatch: { hex: match.hex, outline: match.outline },
    house: match.house,
  };
}

/* ------------------------------------------------------------------ sources */

/**
 * Product option names that ARE the colour dimension.
 *
 * `facets.ts` skips these so the sidebar carries one Colour group rather than
 * one per spelling the merchant used. Compared on the normalised, singularised
 * group name, which is the same form `facets.ts` groups by.
 */
export function isColourGroupName(groupKey: string): boolean {
  const words = groupKey.split(" ");

  return words.some(
    (word) => word === "colour" || word === "color" || word === "colourway" || word === "colorway"
  );
}

type MetafieldNode = {
  namespace?: string | null;
  key?: string | null;
  type?: string | null;
  value?: string | null;
  references?: {
    nodes?: {
      handle?: string | null;
      fields?: { key: string; value: string | null }[] | null;
    }[] | null;
  } | null;
};

/** Metaobject field keys that hold the human name and the paint chip. */
const METAOBJECT_LABEL_KEYS = ["label", "name", "title", "display_name"];
const METAOBJECT_COLOUR_KEYS = ["color", "colour", "hex", "swatch"];

function fromMetaobject(node: NonNullable<
  NonNullable<MetafieldNode["references"]>["nodes"]
>[number]): string | null {
  const fields = new Map(
    (node?.fields ?? []).map((field) => [field.key, field.value ?? ""])
  );

  for (const key of METAOBJECT_LABEL_KEYS) {
    const label = fields.get(key)?.trim();
    if (label) return label;
  }

  // A swatch metaobject with no name field still carries its colour, and the
  // handle is the merchant's own slug for it - "tulsi-green" reads fine.
  for (const key of METAOBJECT_COLOUR_KEYS) {
    const hex = fields.get(key)?.trim();
    if (hex && isHex(hex)) return hex;
  }

  return node?.handle?.replace(/-/g, " ") ?? null;
}

/** Every raw string one metafield carries, whatever shape the merchant chose. */
function metafieldValues(field: MetafieldNode): string[] {
  const type = field.type ?? "";

  if (type.includes("metaobject_reference")) {
    const nodes = field.references?.nodes ?? [];
    return nodes.map(fromMetaobject).filter((value): value is string => !!value);
  }

  const raw = field.value ?? "";
  if (!raw) return [];

  if (type.startsWith("list.")) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      // A merchant-typed list field is sometimes just a comma-separated line.
      return raw.split(",");
    }
  }

  return [raw];
}

/**
 * Every colour one product is browsable by.
 *
 * Sources, in the order they are read: the colour metafield, then colour-named
 * product options, then tags. The metafield is the intended home and comes
 * first; the others are there because this catalogue predates it, and a colour
 * filter that only sees a field nobody filled in is a filter that shows
 * nothing.
 *
 * Deduplicated by key, so a product recording "Indigo Blue" as both a metafield
 * and an option counts once.
 */
export function productColours(product: CatalogProduct): ColourValue[] {
  const found = new Map<string, ColourValue>();

  const add = (raw: string) => {
    const colour = toColourValue(raw);
    if (colour && !found.has(colour.key)) found.set(colour.key, colour);
  };

  const fields = (product.metafields ?? []).filter(
    (field): field is NonNullable<typeof field> => Boolean(field?.value || field?.references)
  );

  // First identifier with anything in it wins - see COLOUR_METAFIELDS.
  for (const field of fields) {
    const values = metafieldValues(field);
    if (!values.length) continue;

    for (const value of values) add(value);
    break;
  }

  for (const option of product.options ?? []) {
    if (!isColourGroupName(normalizeLabel(option.name))) continue;
    for (const value of option.values ?? []) add(value);
  }

  for (const tag of product.tags ?? []) {
    const colour = colourFromTag(tag);
    if (colour && !found.has(colour.key)) found.set(colour.key, colour);
  }

  return [...found.values()];
}

/**
 * The colour a tag names, or null.
 *
 * Tags are free-form and mostly not colours, so only a tag that is ENTIRELY a
 * colour name counts - "Robe" is not a colour, a bare "Indigo" is, and so is
 * the "colour:Rose Pink" convention. Exported because `facets.ts` needs the
 * same answer: a tag folded into the Colour group must not also appear as a
 * value in the Tags group.
 */
export function colourFromTag(tag: string): ColourValue | null {
  const stripped = tag.replace(/^\s*colou?r\s*[:_-]\s*/i, "");
  const normalised = normalizeLabel(stripped);

  if (!BY_NORMALISED.has(normalised)) return null;

  return toColourValue(stripped);
}

/**
 * Orders a set of colour keys the way the brand presents itself: the six house
 * colours in palette order, then anything derived from the catalogue,
 * alphabetically so the tail is at least stable between builds.
 */
export function orderColours<T extends { key: string; label: string }>(
  values: T[]
): T[] {
  const rank = new Map(HOUSE_PALETTE.map((colour, index) => [colour.key, index]));

  return [...values].sort((a, b) => {
    const rankA = rank.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rank.get(b.key) ?? Number.MAX_SAFE_INTEGER;

    return rankA !== rankB ? rankA - rankB : a.label.localeCompare(b.label);
  });
}
