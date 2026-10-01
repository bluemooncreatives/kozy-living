import type { ProductVariant } from "@/lib/shopify/types";

/**
 * How many of `wanted`'s option values this variant shares. Kept apart from
 * `variant-preference.ts`, which carries a React hook, because the server
 * action ranks variants with it too and hooks do not exist in React's server
 * build.
 */
export function optionScore(
  variant: Pick<ProductVariant, "selectedOptions">,
  wanted: Record<string, string>
): number {
  return variant.selectedOptions.filter(
    (option) => wanted[option.name.toLowerCase()] === option.value
  ).length;
}
