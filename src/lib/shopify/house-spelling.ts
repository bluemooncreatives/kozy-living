/**
 * The house spelling, enforced on merchant copy as it crosses into the app.
 *
 * "Krafted" with a K is the brand's own spelling (see the VOICE note at the
 * top of `@/lib/site`). Editorial copy in this repo already follows it, but
 * roughly half the storefront's words are not in this repo at all - collection
 * titles, product titles, menu labels and article headings are typed into
 * Shopify Admin, and the store currently carries "Crafted by Kozy bathrobes"
 * alongside "Krafted by Kozy". The two spellings then appear within one click
 * of each other in the nav.
 *
 * Normalising here rather than in each component means every surface is
 * covered by one rule: the shop heading, the breadcrumb, the nav, the search
 * results, the cards, and the `<title>` that goes to Google.
 *
 * The second rule is "Pet Collection" -> "Pet Kollection". Same story: the
 * store's nav item already reads "Pet Kollection" (alongside "Pet Karrier"
 * and "Pet Klothing"), but the collection it points at is still titled "Pet
 * Collection" - so the two spellings sit one click apart.
 *
 * WHAT THIS DELIBERATELY DOES NOT TOUCH:
 *
 *   handles      `crafted-by-kozy` is an identifier, not copy. Rewriting it
 *                would ask Shopify for a collection that does not exist and
 *                404 the page. Handles are renamed in Shopify Admin, with a
 *                redirect - never here.
 *   handcrafted  no word boundary before "crafted", so it is left alone. The
 *                brand uses it, and "handkrafted" is not a word anyone wants.
 *   hand-crafted a hyphen is excluded too, for the same reason.
 *   craft        "craft clusters", "craft-led" and "Craft Technique" are the
 *                ordinary English word and are correct as they are. Only the
 *                whole word "crafted" carries the house K.
 *   collection   likewise. Only the phrase "Pet Collection" takes the K, not
 *                the bare word - the storefront says "collection" constantly
 *                in its own chrome ("this collection is empty", every
 *                breadcrumb), and Kollection is the name of ONE shelf, not a
 *                replacement for the noun.
 */

/**
 * Applies the house spelling to one string, preserving the case of what it
 * replaces: Crafted → Krafted, crafted → krafted, CRAFTED → KRAFTED.
 *
 * Passing through non-strings unchanged keeps this usable directly on the
 * optional fields Shopify hands back as `null`.
 */
export function houseSpelling<T extends string | null | undefined>(text: T): T {
  if (typeof text !== "string" || !text) return text;

  const kIfUpper = (word: string) =>
    (word[0] === word[0]!.toUpperCase() ? "K" : "k") + word.slice(1);

  return text
    .replace(/crafted/gi, (match, offset: number, whole: string) => {
      // A word character or a hyphen in front means this is the tail of a
      // compound - `handcrafted`, `hand-crafted` - and not the standalone
      // word.
      const before = whole[offset - 1];
      if (before && /[\w-]/.test(before)) return match;

      const after = whole[offset + match.length];
      if (after && /\w/.test(after)) return match;

      return kIfUpper(match);
    })
    // Only after "Pet", and only as whole words: the bare noun stays a noun.
    // The separator is captured rather than assumed so "Pet  Collection" and
    // "Pet-Collection" survive the round trip unchanged apart from the K.
    .replace(
      /pet([\s-]+)collection/gi,
      (match, gap: string, offset: number, whole: string) => {
        // Guard both ends by hand rather than with a word boundary, so
        // "carpet collection" and "Pet Collections" are both left alone.
        const before = whole[offset - 1];
        if (before && /\w/.test(before)) return match;

        const after = whole[offset + match.length];
        if (after && /\w/.test(after)) return match;

        const pet = match.slice(0, match.length - gap.length - "collection".length);
        const collection = match.slice(match.length - "collection".length);
        return pet + gap + kIfUpper(collection);
      },
    ) as T;
}

/** The SEO block as Shopify returns it, with both fields normalised. */
export function houseSpellingSeo<
  T extends { title?: string | null; description?: string | null } | null | undefined,
>(seo: T): T {
  if (!seo) return seo;

  return {
    ...seo,
    title: houseSpelling(seo.title),
    description: houseSpelling(seo.description),
  };
}
