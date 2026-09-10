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

/**
 * The metaobject definition holding the brand palette. Each entry carries a
 * name, a hex and a sort order, and the product metafield below points at them.
 */
export const COLOUR_METAOBJECT_TYPE = "shop_color";

/**
 * Where colours the merchant did not order themselves start. Comfortably past
 * any hand-set `sort_order`, so Shopify's ordering always leads.
 */
const HOUSE_ORDER_OFFSET = 1000;

export type Swatch = {
  hex: string;
  /**
   * True for a colour that cannot be seen against the page ground. White is
   * the only one in the house palette; it is drawn as an outline instead of a
   * fill wherever a swatch or a spiral is painted.
   */
  outline?: boolean;
  /**
   * True when the metafield named a colour this file has no hex for, and the
   * chip is a placeholder. The fix is to add the name to `HOUSE_PALETTE` - see
   * `resolveSwatch`.
   */
  unresolved?: boolean;
};

export type ColourValue = {
  /** Slug used in the URL. */
  key: string;
  /** What the shopper reads - the merchant's own spelling, whenever there is one. */
  label: string;
  swatch: Swatch;
  /** True when the name matches one of the six house colours. */
  house: boolean;
  /** Where the value came from, so the facet can prefer the metafield. */
  source: "metafield" | "option" | "tag";
  /** The merchant's own position for this colour, when their metaobject carries one. */
  order?: number;
};

/* ------------------------------------------------------------------ palette */

/**
 * The six house colours, in brand order.
 *
 * COPIED FROM SHOPIFY, not invented here: these are the `color` fields of the
 * six `shop_color` metaobjects, as of 2026-09-11. A product that references one
 * of those entries does not use this table at all - it carries its own name and
 * hex from Shopify. This is the fallback for everything else: a colour that
 * arrives as a bare option value or a tag, which is a name with no hex attached.
 *
 * Keep it in step with the metaobjects if the brand revises a shade.
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
    hex: "#D98F97",
    aliases: ["rose", "pink", "rose dust", "blush", "dusty rose"],
  },
  {
    key: "indigo-blue",
    label: "Indigo Blue",
    hex: "#183F73",
    aliases: ["indigo", "blue", "navy", "midnight blue"],
  },
  {
    key: "tulsi-green",
    label: "Tulsi Green",
    hex: "#315D3D",
    aliases: ["tulsi", "forest green", "deep green", "bottle green"],
  },
  {
    key: "oat-milk",
    label: "Oat Milk",
    hex: "#E1CDA8",
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
    hex: "#9DB08E",
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
  // What this store actually uses: a list of references to `shop_color`
  // metaobjects, each carrying a name, a hex and a sort order.
  { namespace: "custom", key: "shop_colors" },
  { namespace: "custom", key: "shop_colours" },
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

/** Shopify writes its `color` fields lowercase and unprefixed in places. */
function normalizeHex(value: string): string {
  return `#${value.trim().replace(/^#/, "").toUpperCase()}`;
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

/**
 * The neutral chip for a colour the merchant named but this file has no hex
 * for. Visible, obviously not a real colour, and never silently dropped - a
 * colour missing from the picker is far harder to notice than a grey one.
 */
const UNRESOLVED_HEX = "#B9B3AA";

/**
 * The paint chip for a name.
 *
 * Names come from Shopify; hexes do not - a text metafield carries "Tulsi
 * Green" and nothing else - so every name has to be looked up here. Exact
 * palette match first, then the colour word inside a longer name, then a
 * neutral placeholder flagged `unresolved`.
 *
 * ADDING A COLOUR: put its name and hex in `HOUSE_PALETTE` above. That is the
 * whole fix for a colour showing up grey.
 */
export function resolveSwatch(name: string): Swatch {
  const match = isHex(name) ? nearestColour(name) : matchColour(name);

  if (match) return { hex: match.hex, outline: match.outline };

  return { hex: UNRESOLVED_HEX, unresolved: true };
}

/** Title-cases a name the merchant left all-lowercase; leaves their casing alone otherwise. */
function presentLabel(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed !== trimmed.toLowerCase()) return trimmed;

  return trimmed.replace(/[a-z]/g, (character) => character.toUpperCase());
}

/**
 * A colour recorded in the metafield.
 *
 * The merchant's string IS the colour: the label is what they typed and the key
 * is its slug, so "Tulsi Green" reads and links as Tulsi Green whether or not
 * this file happens to know the name. Only the hex is looked up.
 *
 * This is the difference between the metafield and the fallback sources below.
 * A metafield is the merchant deliberately answering "what colour is this",
 * so the answer is taken at face value. An option value or a tag is a string
 * that happens to contain a colour, so it has to be matched against a known
 * one before it can be trusted - which is also what stops "Open Wide Sleeve"
 * from becoming a colour.
 */
function fromMetafieldValue(raw: string): ColourValue | null {
  const value = raw.trim();
  if (!value) return null;

  // A bare hex is not a name. It is the one case where the palette has to
  // supply the label as well, and an unrecognisable one is dropped - "#3A5233"
  // in a filter list tells a shopper nothing.
  if (isHex(value)) {
    const match = nearestColour(value);
    if (!match) return null;

    return {
      key: match.key,
      label: match.label,
      swatch: { hex: match.hex, outline: match.outline },
      house: match.house,
      source: "metafield",
    };
  }

  const label = presentLabel(value);
  const match = matchColour(value);

  return {
    key: toSlug(label),
    label,
    swatch: resolveSwatch(value),
    house: Boolean(match?.house),
    source: "metafield",
  };
}

/**
 * A colour inferred from a product option value or a tag.
 *
 * Must resolve to a colour this file knows, and takes that colour's canonical
 * name rather than the merchant's string: the string is "Indigo Sunshine" or
 * "Green Belt" - a print name and a part name - and filing those under their
 * own labels would put three spellings of one colour in the sidebar.
 */
function fromDerivedValue(
  raw: string,
  source: "option" | "tag"
): ColourValue | null {
  const value = raw.trim();
  if (!value) return null;

  const match = isHex(value) ? nearestColour(value) : matchColour(value);
  if (!match) return null;

  return {
    key: match.key,
    label: match.label,
    swatch: { hex: match.hex, outline: match.outline },
    house: match.house,
    source,
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

export type MetaobjectNode = {
  handle?: string | null;
  fields?: { key: string; value: string | null }[] | null;
};

type MetafieldNode = {
  namespace?: string | null;
  key?: string | null;
  type?: string | null;
  value?: string | null;
  references?: { nodes?: MetaobjectNode[] | null } | null;
};

/**
 * Field keys on a colour metaobject.
 *
 * This store's `shop_color` definition uses `name`, `color` and `sort_order`;
 * the alternatives are the other names Shopify's own swatch definitions and the
 * theme editor generate, so a store that built its palette a different way still
 * resolves without a code change.
 */
const METAOBJECT_NAME_KEYS = ["name", "label", "title", "display_name"];
const METAOBJECT_HEX_KEYS = ["color", "colour", "hex", "swatch"];
const METAOBJECT_ORDER_KEYS = ["sort_order", "order", "position"];

function field(node: MetaobjectNode, keys: string[]): string | null {
  const fields = new Map(
    (node?.fields ?? []).map((entry) => [entry.key, (entry.value ?? "").trim()])
  );

  for (const key of keys) {
    const value = fields.get(key);
    if (value) return value;
  }

  return null;
}

/**
 * One colour, as the merchant defined it in a metaobject.
 *
 * Everything visible comes from Shopify: the NAME is their `name` field, the
 * chip is their `color` field, and the position on the picker is their
 * `sort_order`. Nothing here consults the palette above - that is the whole
 * point of a metaobject palette, and it means the brand can add a seventh
 * colour, rename one or restyle a shade without this file changing.
 *
 * The handle is the key rather than the name, so renaming "Tulsi Green" in
 * Shopify does not break links that were already shared.
 */
export function colourFromMetaobject(node: MetaobjectNode): ColourValue | null {
  const name = field(node, METAOBJECT_NAME_KEYS);
  const hex = field(node, METAOBJECT_HEX_KEYS);
  const handle = node?.handle?.trim() || null;

  // A swatch entry with neither a name nor a handle has nothing to label a
  // filter with, whatever colour it carries.
  const label = name ?? (handle ? presentLabel(handle.replace(/-/g, " ")) : null);
  if (!label) return null;

  const order = Number(field(node, METAOBJECT_ORDER_KEYS));

  return {
    key: handle ?? toSlug(label),
    label,
    swatch: hex && isHex(hex) ? { hex: normalizeHex(hex) } : resolveSwatch(label),
    house: Boolean(matchColour(label)?.house),
    source: "metafield",
    order: Number.isFinite(order) ? order : undefined,
  };
}

/**
 * The colours one metafield carries, whatever shape the merchant chose:
 * metaobject references, a list of names, a single name, or a hex.
 */
function metafieldColours(entry: MetafieldNode): ColourValue[] {
  const type = entry.type ?? "";

  if (type.includes("metaobject_reference")) {
    return (entry.references?.nodes ?? [])
      .map(colourFromMetaobject)
      .filter((colour): colour is ColourValue => Boolean(colour));
  }

  const raw = entry.value ?? "";
  if (!raw) return [];

  const values = type.startsWith("list.")
    ? parseList(raw)
    : [raw];

  return values
    .map(fromMetafieldValue)
    .filter((colour): colour is ColourValue => Boolean(colour));
}

function parseList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    // A merchant-typed list field is sometimes just a comma-separated line.
    return raw.split(",");
  }
}

/**
 * Whether a product with no colour metafield may fall back to its options and
 * tags.
 *
 * OFF. `custom.shop_colors` is the answer to "what colour is this", and the
 * fallback's guesses contradict it: the same catalogue that says "Oat Milk" in
 * the metafield says "Taupe Flora" in a variant option and "Yellow" in a tag,
 * and mixing the three put colours in the picker that the brand does not sell.
 *
 * Turn it back on only to cover a catalogue mid-migration, and expect the
 * inferred names to sit alongside the real ones rather than merge with them.
 * The switch is per product either way - a product WITH the metafield never
 * reads its options or tags.
 */
const FALL_BACK_TO_OPTIONS_AND_TAGS = false;

/**
 * Every colour one product is browsable by.
 *
 * The metafield is the source. When a product has one, its values are the
 * answer and nothing else is read: the names are the merchant's own, verbatim,
 * and options and tags cannot contradict them. Only a product with an empty
 * metafield falls back, and only while the constant above says it may.
 *
 * Deduplicated by key, so a colour named twice counts once.
 */
export function productColours(product: CatalogProduct): ColourValue[] {
  const found = new Map<string, ColourValue>();

  const add = (colour: ColourValue | null) => {
    if (colour && !found.has(colour.key)) found.set(colour.key, colour);
  };

  const fields = (product.metafields ?? []).filter(
    (field): field is NonNullable<typeof field> =>
      Boolean(field?.value || field?.references)
  );

  // First identifier carrying anything wins - see COLOUR_METAFIELDS.
  for (const entry of fields) {
    const colours = metafieldColours(entry);
    if (!colours.length) continue;

    for (const colour of colours) add(colour);
    break;
  }

  if (found.size || !FALL_BACK_TO_OPTIONS_AND_TAGS) return [...found.values()];

  for (const option of product.options ?? []) {
    if (!isColourGroupName(normalizeLabel(option.name))) continue;
    for (const value of option.values ?? []) add(fromDerivedValue(value, "option"));
  }

  for (const tag of product.tags ?? []) add(colourFromTag(tag));

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

  if (!BY_NORMALISED.has(normalizeLabel(stripped))) return null;

  return fromDerivedValue(stripped, "tag");
}

/**
 * Orders colours.
 *
 * The merchant's own `sort_order` wins wherever their metaobject carries one -
 * that field exists precisely so the brand can decide the running order without
 * a deploy, and this page is what it was made for. Colours with no order of
 * their own fall in behind, ranked against the house palette, then
 * alphabetically so the tail stays stable between builds.
 */
export function orderColours<
  T extends { key: string; label: string; order?: number },
>(values: T[]): T[] {
  const rank = new Map(HOUSE_PALETTE.map((colour, index) => [colour.key, index]));

  const positionOf = (value: T) => {
    if (typeof value.order === "number") return value.order;

    // Behind everything Shopify ordered, in palette order among themselves.
    // The offset is what keeps a house colour with no `sort_order` from
    // outranking one the merchant deliberately placed second.
    const direct = rank.get(value.key);
    if (direct !== undefined) return HOUSE_ORDER_OFFSET + direct;

    const match = matchColour(value.label);
    if (match?.house) {
      return HOUSE_ORDER_OFFSET + (rank.get(match.key) ?? HOUSE_PALETTE.length);
    }

    return Number.MAX_SAFE_INTEGER;
  };

  return [...values].sort((a, b) => {
    const rankA = positionOf(a);
    const rankB = positionOf(b);

    return rankA !== rankB ? rankA - rankB : a.label.localeCompare(b.label);
  });
}
