"use client";

import Link from "next/link";
import { addItem } from "../cart/actions";
import { useCart } from "../cart/cart-context";
import { Product } from "@/lib/shopify/types";

/**
 * The `+` at the end of a product table row.
 *
 * Only products with a single purchasable variant can be added in one click -
 * anything with a size or grind choice routes to the product page instead,
 * because silently picking a variant for someone is how you ship the wrong bag.
 * Adds reuse the same optimistic + serialised path as the rest of the cart.
 */
export default function QuickAdd({ product }: { product: Product }) {
  const { addCartItem, runCartMutation, reportStatus } = useCart();

  const variant =
    product.variants.length === 1 ? product.variants[0] : undefined;
  const canQuickAdd = Boolean(
    product.availableForSale && variant?.availableForSale
  );

  if (!canQuickAdd) {
    return (
      <Link
        href={`/product/${product.handle}`}
        aria-label={`Choose options for ${product.title}`}
        className="inline-flex h-8 w-8 items-center justify-center text-lg leading-none transition-opacity hover:opacity-60"
      >
        <span aria-hidden>+</span>
      </Link>
    );
  }

  return (
    <form
      action={async () => {
        if (!variant) return;
        addCartItem(variant, product);

        try {
          const result = await runCartMutation(() =>
            addItem(null, { merchandiseId: variant.id, quantity: 1 })
          );
          reportStatus(result);
        } catch (error) {
          console.error(error);
          reportStatus({
            ok: false,
            message: "We couldn't add that to your cart.",
          });
        }
      }}
    >
      <button
        type="submit"
        aria-label={`Add ${product.title} to cart`}
        className="inline-flex h-8 w-8 items-center justify-center text-lg leading-none transition-opacity hover:opacity-60"
      >
        <span aria-hidden>+</span>
      </button>
    </form>
  );
}
