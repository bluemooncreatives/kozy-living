"use client";

import { Product, ProductVariant } from "@/lib/shopify/types";
import { useProduct } from "./product-context";

/**
 * The variant the shopper's current selection resolves to, or `undefined`
 * while a choice is still to be made.
 *
 * One resolver for the whole buy panel. The price used to read
 * `priceRange.minVariantPrice` while the button resolved the variant on its
 * own, so picking a ₹4,000 4XL left the panel saying ₹1,200 and the cart then
 * charged ₹4,000. Anything on the panel that depends on the selection reads
 * it from here, so the two can never disagree again.
 */
export function useSelectedVariant(
  product: Pick<Product, "options" | "variants">
): {
  selectedVariant: ProductVariant | undefined;
  hasOptionsToPick: boolean;
} {
  const { state } = useProduct();
  const { variants } = product;

  // An option with a single value is not a choice, so it counts as chosen.
  // Otherwise a lone value had to be clicked like a pill before the button
  // woke up - the old "Initials: write them in notes" option did exactly that.
  const fixedOptions = new Set(
    product.options
      .filter((option) => option.values.length === 1)
      .map((option) => option.name.toLowerCase())
  );

  const variant = variants.find((variant) =>
    variant.selectedOptions.every(
      (option) =>
        option.value === state[option.name.toLowerCase()] ||
        fixedOptions.has(option.name.toLowerCase())
    )
  );
  const defaultVariant = variants.length === 1 ? variants[0] : undefined;

  return {
    selectedVariant: variant ?? defaultVariant,
    hasOptionsToPick: variants.length > 1,
  };
}
