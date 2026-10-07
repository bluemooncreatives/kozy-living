import { KIT_ATTRIBUTE } from "@/lib/constants";
import type {
  CartItem,
  KitBuilder,
  KitPiece,
  KitVariant,
} from "@/lib/shopify/types";

/**
 * The custom kit builder's rules, shared by the page (which prices and checks
 * as the shopper chooses) and `addKitItem` (which re-checks everything,
 * because anything the browser sends can be hand-made). No React and no
 * server-only imports, so both sides load the same file and resolve a choice
 * to the same variant. See docs/custom-kit-builder.md.
 */

/** The variant option every piece carries for its fabric. */
export const FABRIC_OPTION = "Fabric";

/**
 * Option names and values compared the forgiving way. Admin is where these
 * are typed, and the store already has `Block printed` on the products beside
 * `Block Printed` in the fabric entry: a difference of case or spacing is
 * never a different fabric, and refusing over it would only hide a piece.
 */
export function sameOption(a: string | undefined | null, b: string | undefined | null) {
  const fold = (value: string | undefined | null) =>
    (value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  return fold(a) === fold(b);
}

function optionValue(variant: KitVariant, name: string) {
  return variant.selectedOptions.find((option) => sameOption(option.name, name))
    ?.value;
}

/** True when `variant` is cut in `fabricValue`. */
export function isFabric(variant: KitVariant, fabricValue: string) {
  return sameOption(optionValue(variant, FABRIC_OPTION), fabricValue);
}

/** A piece's variants in one fabric. */
export function variantsIn(piece: KitPiece, fabricValue: string) {
  return piece.variants.filter((variant) => isFabric(variant, fabricValue));
}

/**
 * The variant for a fabric and a set of size choices, or undefined while a
 * size is still unpicked. A piece with no size options resolves on fabric
 * alone.
 */
export function findKitVariant(
  piece: KitPiece,
  fabricValue: string,
  sizes: Record<string, string | undefined>
): KitVariant | undefined {
  return variantsIn(piece, fabricValue).find((variant) =>
    piece.sizeOptions.every((option) =>
      sameOption(optionValue(variant, option.name), sizes[option.name])
    )
  );
}

/**
 * Whether a size value can still be bought in this fabric - for greying a
 * pill rather than hiding it. With several size options, any in-stock variant
 * carrying the value counts.
 */
export function sizeAvailable(
  piece: KitPiece,
  fabricValue: string,
  optionName: string,
  value: string
) {
  return variantsIn(piece, fabricValue).some(
    (variant) =>
      variant.availableForSale && sameOption(optionValue(variant, optionName), value)
  );
}

/** The cheapest in-stock price of a piece in a fabric, for the tile's "from". */
export function fromPrice(piece: KitPiece, fabricValue: string) {
  const prices = variantsIn(piece, fabricValue)
    .filter((variant) => variant.availableForSale)
    .map((variant) => Number(variant.price.amount))
    .filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : null;
}

/** False once every variant of the piece in this fabric is sold out. */
export function pieceAvailable(piece: KitPiece, fabricValue: string) {
  return variantsIn(piece, fabricValue).some((variant) => variant.availableForSale);
}

/** The shape the page sends to `addKitItem`. Nothing here is trusted. */
export type KitRequest = {
  pieces: { pieceId: string; sizes: Record<string, string> }[];
  fabricId: string;
  /** Both or neither - a thread means nothing without letters. */
  threadId?: string;
  initials?: string;
  quantity: number;
};

/** Kit settings re-read with the request, for the cart's own checks. */
export type KitConfig = Pick<KitBuilder, "minPieces" | "initialsMaxLength">;

/** The kit code on a cart line ("K-7Q2X"), if it is part of a kit. */
export function kitCode(item: CartItem): string | undefined {
  return item.attributes?.find((attribute) => attribute.key === KIT_ATTRIBUTE)
    ?.value;
}

/** A kit's heading line: carries a kit code and has its pieces nested under it. */
export function isKitLine(item: CartItem) {
  return Boolean(kitCode(item)) && !item.parentRelationship?.parent?.id;
}
