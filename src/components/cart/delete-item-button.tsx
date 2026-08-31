"use client";

import { CartItem } from "@/lib/shopify/types";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { removeItem } from "./actions";
import { useCart } from "./cart-context";

export function DeleteItemButton({ item }: { item: CartItem }) {
  const {
    updateCartItem,
    runCartMutation,
    reserveLineRemoval,
    settleLine,
    reportStatus,
  } = useCart();

  const merchandiseId = item.merchandise.id;

  return (
    <form
      action={async () => {
        // Claim the line's target as 0 so any quantity click still queued
        // behind this one resolves against a removed line rather than
        // resurrecting it.
        reserveLineRemoval(merchandiseId);
        updateCartItem(merchandiseId, "delete");

        try {
          const result = await runCartMutation(() =>
            removeItem(null, merchandiseId)
          );
          reportStatus(result);
        } catch (error) {
          console.error(error);
          reportStatus({ ok: false, message: "We couldn't remove that item." });
        } finally {
          settleLine(merchandiseId);
        }
      }}
    >
      <button
        type="submit"
        aria-label={`Remove ${item.merchandise.product.title} from cart`}
        className="flex h-6 w-6 shrink-0 items-center justify-center transition-opacity hover:opacity-60"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </form>
  );
}
