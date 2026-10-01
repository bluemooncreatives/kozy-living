"use client";

import { Product } from "@/lib/shopify/types";
import Price from "../price";
import { useSelectedVariant } from "./use-selected-variant";

/**
 * The buy panel's price, following the variant picker.
 *
 * Until a choice resolves to one variant it is the range's floor behind
 * "from" - the honest answer to "what does this cost" before a size is
 * picked. Once it resolves, it is that variant's own price: 24 of the store's
 * Kompanions are priced per size, and a shirt runs ₹1,200 to ₹4,000.
 *
 * Sold out follows the variant too, so a sold-out size says so here as well as
 * on its struck-through pill.
 */
export function ProductPrice({ product }: { product: Product }) {
  const { selectedVariant } = useSelectedVariant(product);
  const { minVariantPrice, maxVariantPrice } = product.priceRange;

  const price = selectedVariant?.price ?? minVariantPrice;
  const isRange =
    !selectedVariant && minVariantPrice.amount !== maxVariantPrice.amount;
  const compareAt = selectedVariant?.compareAtPrice;
  const isReduced =
    compareAt != null && Number(compareAt.amount) > Number(price.amount);
  const soldOut = selectedVariant
    ? !selectedVariant.availableForSale
    : !product.availableForSale;

  return (
    // aria-live so a screen reader hears the new price when a pill changes
    // it - the change happens away from where focus is.
    <p aria-live="polite" className="mt-5 flex items-baseline gap-2">
      {isRange ? <span className="ui-mono text-muted">from</span> : null}
      <Price
        className="serif text-display-md"
        amount={price.amount}
        currencyCode={price.currencyCode}
      />
      {isReduced ? (
        <s className="ui-mono text-muted">
          <span className="sr-only">was </span>
          <Price amount={compareAt.amount} currencyCode={compareAt.currencyCode} />
        </s>
      ) : null}
      {soldOut ? <span className="ui-mono text-muted">· Sold out</span> : null}
    </p>
  );
}
