/* ---------------------------------------------------------------------------
   Label normalisation

   The bottom of the shop stack: two pure string functions that both the facet
   engine and the colour module need, and that neither may own.

   They lived in `facets.ts` until `colours.ts` needed them. `facets.ts` reads
   `COLOUR_PARAM` from `colours.ts` at module scope, so the two importing each
   other is a real cycle, and it bit exactly where cycles do - whichever module
   the app happened to reach first evaluated its top-level constants against a
   half-built partner and threw before a page could render. A leaf module both
   sides depend on is the fix; nothing here imports anything.
--------------------------------------------------------------------------- */

/**
 * The comparison form of a label.
 *
 * Accents are folded, digits and letters are split apart so "4kg" and "4 kg"
 * meet, and every run of punctuation becomes a single space so "UK 3-4",
 * "uk-3-4" and "Uk 3 4" all collapse to one value.
 */
export function normalizeLabel(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A normalised key as it appears in a URL. */
export function toSlug(key: string): string {
  return normalizeLabel(key).replace(/ /g, "-");
}
