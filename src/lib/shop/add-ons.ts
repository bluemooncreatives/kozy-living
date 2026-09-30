/**
 * The initials rule, shared by the product page (which filters as the shopper
 * types) and the add-to-cart action (which re-checks, because anything the
 * browser sends can be hand-made). Kept free of React and of server-only
 * imports so both sides can load it.
 *
 * A-Z only, by the owner's decision: the letters are hand-embroidered, and
 * every character beyond the alphabet is a question for the workshop rather
 * than something to accept silently. NFKC folds full-width letters (Ｋ) and
 * ligatures into plain ones first, so a phone keyboard that produces them is
 * not rejected for it.
 */
export function cleanInitials(raw: string, maxLength: number): string {
  return raw
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, maxLength);
}

/** True when `value` is already a complete, acceptable set of initials. */
export function isValidInitials(value: string, maxLength: number): boolean {
  return value.length >= 1 && value.length <= maxLength && /^[A-Z]+$/.test(value);
}
