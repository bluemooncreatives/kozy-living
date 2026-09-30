import type { CatalogProduct, Image } from "@/lib/shopify/types";
import { houseSpelling } from "@/lib/shopify/house-spelling";
import { imageKey } from "./gallery";
import type { MetaobjectNode } from "./colours";
import { toSlug } from "./normalize";

/* ---------------------------------------------------------------------------
   Mood, end to end

   The second way in, beside colour: not "what shade" but "what moment" - the
   first cup, the slow morning, the evening of rest, the dog at your feet.

   Built on the same contract as `colours.ts` + `palette.ts`, and deliberately
   smaller, because a mood is a simpler thing than a colour:

     - it has no swatch to resolve, so there is no palette table, no aliases
       and no nearest-hex matching. A mood is a NAME and a DESCRIPTION the
       merchant wrote, and it is taken at face value;
     - it lives in exactly one place, the `custom.shop_mood` metafield, so
       there are no options or tags to fall back to and nothing to merge.

   What it keeps from colour, because it is what makes the page trustworthy:

     the metaobjects LEAD    `shop_mood` entries are the complete set, in the
                             merchant's `sort_order`. A mood nothing is tagged
                             with yet still shows - dimmed, "coming soon" -
                             rather than the page quietly losing a ritual.
     the catalogue FILLS     a count is how many live products reference it.
     leftovers TRAIL         a mood products carry that the set no longer
                             lists is appended rather than made unreachable.

   Moods travel on the product as their OWN field (`moods`, an alias in
   `productCardFragment`), not inside `metafields`. `productColours()` reads
   every entry in `metafields` and takes the first with a value, so a mood
   slotted in there would be read as a colour on any product with no colour
   set - "Rest as a Ritual" would turn up as a grey chip in the shop sidebar.
--------------------------------------------------------------------------- */

/** The query parameter the mood picker owns. */
export const MOOD_PARAM = "mood";

/** The metaobject definition holding the moods: `name`, `description`, `sort_order`. */
export const MOOD_METAOBJECT_TYPE = "shop_mood";

/**
 * Product metafields read as mood, most trusted first. `custom.shop_mood` is
 * the one this store defines (a list of `shop_mood` references); the plural is
 * the spelling a second definition would most likely get. Identifiers with no
 * definition come back null and cost nothing.
 */
export const MOOD_METAFIELDS: { namespace: string; key: string }[] = [
  { namespace: "custom", key: "shop_mood" },
  { namespace: "custom", key: "shop_moods" },
];

/** The `identifiers:` argument for the fragment's `moods` alias. */
export const MOOD_METAFIELD_IDENTIFIERS = MOOD_METAFIELDS.map(
  ({ namespace, key }) => `{namespace: "${namespace}", key: "${key}"}`
).join(", ");

export const SHOP_BY_MOOD_PATH = "/shop-by-mood";

/** The results section, so a mood link lands on its Kompanions. */
export const MOOD_RESULTS_ANCHOR = "kompanions";

/** The page showing one mood, or - with `null` - the index with nothing chosen. */
export function moodHref(key: string | null): string {
  if (!key) return SHOP_BY_MOOD_PATH;

  return `${SHOP_BY_MOOD_PATH}?${MOOD_PARAM}=${encodeURIComponent(
    key
  )}#${MOOD_RESULTS_ANCHOR}`;
}

export type MoodValue = {
  /** The metaobject handle - stable across a rename, so shared links survive one. */
  key: string;
  label: string;
  description: string;
  order?: number;
};

function fieldMap(node: MetaobjectNode): Map<string, string> {
  return new Map(
    (node?.fields ?? []).map((entry) => [entry.key, (entry.value ?? "").trim()])
  );
}

/**
 * One mood, as the merchant wrote it. Merchant copy, so it passes through the
 * house spelling on the way in like every other Shopify title does.
 */
export function moodFromMetaobject(node: MetaobjectNode): MoodValue | null {
  const fields = fieldMap(node);
  const handle = node?.handle?.trim() || null;
  const name = fields.get("name") || fields.get("title") || null;

  const label = name ?? (handle ? handle.replace(/-/g, " ") : null);
  if (!label) return null;

  // An empty field reads back as "", and `Number("")` is 0 - which would send
  // an unordered mood to the front rather than to the back.
  const rawOrder = fields.get("sort_order") || fields.get("order") || "";
  const order = rawOrder ? Number(rawOrder) : NaN;

  return {
    key: handle ?? toSlug(label),
    label: houseSpelling(label),
    description: houseSpelling(fields.get("description") ?? ""),
    order: Number.isFinite(order) ? order : undefined,
  };
}

/**
 * Every mood one product belongs to. The first identifier in `MOOD_METAFIELDS`
 * that carries anything wins, the same rule colour uses.
 */
export function productMoods(product: CatalogProduct): MoodValue[] {
  for (const entry of product.moods ?? []) {
    const moods = (entry.references?.nodes ?? [])
      .map(moodFromMetaobject)
      .filter((mood): mood is MoodValue => Boolean(mood));

    if (moods.length) {
      return [...new Map(moods.map((mood) => [mood.key, mood])).values()];
    }
  }

  return [];
}

export type MoodEntry = MoodValue & {
  /** Kompanions in this mood, catalogue-wide. */
  count: number;
  /**
   * Borrowed photography - the lead shots of the mood's best-selling
   * Kompanions. The FIRST is unique across the whole index (see `moodEntries`),
   * so hovering from one mood to the next always changes the picture.
   */
  images: Image[];
};

/** How many photographs each mood borrows. */
const IMAGES_PER_MOOD = 3;

/**
 * Merges the mood set with a catalogue. Pure, so the page - which already
 * holds the catalogue to render the cards - does not fetch it twice.
 *
 * `products` should be in the catalogue's own best-selling order: that is what
 * makes a mood's photograph its most-bought Kompanion rather than its newest.
 */
export function moodEntries(
  moods: MoodValue[],
  products: CatalogProduct[]
): { entries: MoodEntry[]; membership: Map<string, Set<string>> } {
  const membership = new Map<string, Set<string>>();
  const byMood = new Map<string, CatalogProduct[]>();
  const carried = new Map<string, MoodValue>();

  for (const product of products) {
    const found = productMoods(product);
    if (!found.length) continue;

    membership.set(product.id, new Set(found.map((mood) => mood.key)));

    for (const mood of found) {
      if (!carried.has(mood.key)) carried.set(mood.key, mood);
      byMood.set(mood.key, [...(byMood.get(mood.key) ?? []), product]);
    }
  }

  const listed = new Set(moods.map((mood) => mood.key));
  const ordered = orderMoods([
    ...moods,
    ...[...carried.values()].filter((mood) => !listed.has(mood.key)),
  ]);

  // Lead photographs are claimed in index order, so a Kompanion that sits in
  // two moods - most of "Rest as a Ritual" is also "For You & Your Furry" -
  // fronts the first and the second finds its own. Without this the preview
  // would sit on one photograph while the cursor moved between them.
  const claimed = new Set<string>();

  const entries = ordered.map((mood) => {
    const members = byMood.get(mood.key) ?? [];
    const shots = members
      .map((product) => product.featuredImage ?? product.images[0] ?? null)
      .filter((image): image is Image => Boolean(image?.url));

    const lead =
      shots.find((image) => !claimed.has(imageKey(image.url))) ?? shots[0];
    if (lead) claimed.add(imageKey(lead.url));

    const images = lead
      ? [lead, ...shots.filter((image) => image !== lead)].slice(0, IMAGES_PER_MOOD)
      : [];

    return { ...mood, count: members.length, images };
  });

  return { entries, membership };
}

/**
 * The merchant's `sort_order` first; anything without one behind, alphabetical
 * so the tail is stable between builds.
 */
export function orderMoods<T extends { label: string; order?: number }>(
  values: T[]
): T[] {
  const rank = (value: T) =>
    typeof value.order === "number" ? value.order : Number.MAX_SAFE_INTEGER;

  return [...values].sort(
    (a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label)
  );
}
