"use client";

import { CartItem } from "@/lib/shopify/types";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { removeItem } from "./actions";
import { useCart } from "./cart-context";

export function DeleteItemButton({
  item,
  label,
}: {
  item: CartItem;
  /** Accessible name. Defaults to removing the whole Kompanion. */
  label?: string;
}) {
  const {
    updateCartItem,
    runCartMutation,
    reserveLineRemoval,
    settleLine,
    reportStatus,
  } = useCart();

  // Undefined until the server has answered for an optimistic line. The line
  // is addressed by id alone - never by variant, which two differently
  // personalised lines share - so until then there is nothing to address.
  const lineId = item.id;

  return (
    <form
      action={async () => {
        if (!lineId) return;

        // Claim the line's target as 0 so any quantity click still queued
        // behind this one resolves against a removed line rather than
        // resurrecting it.
        reserveLineRemoval(lineId);
        updateCartItem(lineId, "delete");

        try {
          const result = await runCartMutation(() => removeItem(null, lineId));
          reportStatus(result);
        } catch (error) {
          console.error(error);
          reportStatus({ ok: false, message: "We couldn't remove that item." });
        } finally {
          settleLine(lineId);
        }
      }}
    >
      <button
        type="submit"
        disabled={!lineId}
        aria-label={label ?? `Remove ${item.merchandise.product.title} from cart`}
        className="flex h-6 w-6 shrink-0 items-center justify-center transition-opacity hover:opacity-60 disabled:cursor-wait disabled:opacity-40"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </form>
  );
}
