"use client";

import { MAX_LINE_QUANTITY } from "@/lib/constants";
import { CartItem } from "@/lib/shopify/types";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { updateItemQuantity } from "./actions";
import { useCart } from "./cart-context";

function SubmitButton({
  type,
  disabled,
}: {
  type: "plus" | "minus";
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label={
        type === "plus" ? "Increase item quantity" : "Reduce item quantity"
      }
      className={clsx(
        "flex h-9 w-9 items-center justify-center transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-oxblood hover:text-paper"
      )}
    >
      {type === "plus" ? (
        <PlusIcon className="h-3.5 w-3.5" />
      ) : (
        <MinusIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function EditItemQuantityButton({
  item,
  type,
}: {
  item: CartItem;
  type: "plus" | "minus";
}) {
  const {
    updateCartItem,
    runCartMutation,
    reserveLineQuantity,
    settleLine,
    reportStatus,
  } = useCart();

  const merchandiseId = item.merchandise.id;
  // Buttons stay clickable while a request is in flight - the queue keeps the
  // server in order, so rapid clicking stays responsive instead of being
  // throttled to one round trip per unit.
  const atCeiling = type === "plus" && item.quantity >= MAX_LINE_QUANTITY;

  return (
    <form
      action={async () => {
        // Resolved from the reservation map, not from `item.quantity`: two
        // clicks landing before a re-render both read the same stale prop and
        // used to send the same absolute quantity, losing one of the clicks.
        const quantity = reserveLineQuantity(
          merchandiseId,
          type === "plus" ? 1 : -1,
          item.quantity
        );

        updateCartItem(merchandiseId, type);

        try {
          const result = await runCartMutation(() =>
            updateItemQuantity(null, { merchandiseId, quantity })
          );
          reportStatus(result);
        } catch (error) {
          console.error(error);
          reportStatus({
            ok: false,
            message: "We couldn't update that quantity.",
          });
        } finally {
          settleLine(merchandiseId);
        }
      }}
    >
      <SubmitButton type={type} disabled={atCeiling} />
    </form>
  );
}
