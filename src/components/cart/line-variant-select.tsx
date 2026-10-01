"use client";

import { rememberVariant } from "@/lib/shop/variant-preference";
import type { CartItem } from "@/lib/shopify/types";
import { cartVariant as copy } from "@/lib/site";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { startTransition, useState } from "react";
import { changeLineVariant, type VariantChoice } from "./actions";
import { useCart } from "./cart-context";

/**
 * Switches a drawer line to another size / option of the same Kompanion.
 *
 * It exists because a card's Buy now picks the variant for the shopper; the
 * drawer that opens straight after is where that pick is shown and undone,
 * without a trip back to the product page. A native select: on a phone it
 * opens the platform's own picker, and keyboard and screen readers work for
 * free.
 *
 * Not optimistic in the cart itself - the price, and any merge with a line of
 * the chosen variant, are the server's to decide - but the select shows the
 * new choice at once and is held while the change is in flight.
 */
export function LineVariantSelect({
  item,
  choices,
}: {
  item: CartItem;
  choices: VariantChoice[];
}) {
  const { runCartMutation, reportStatus } = useCart();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const lineId = item.id;
  const optionNames = item.merchandise.selectedOptions
    .map((option) => option.name)
    .join(" / ");

  return (
    <label className="relative mt-2 inline-flex max-w-full items-center self-start">
      <span className="sr-only">{copy.label(item.merchandise.product.title)}</span>
      <select
        value={pendingId ?? item.merchandise.id}
        disabled={!lineId || Boolean(pendingId)}
        aria-busy={Boolean(pendingId)}
        onChange={(event) => {
          const merchandiseId = event.target.value;
          if (!lineId || merchandiseId === item.merchandise.id) return;
          const chosen = choices.find((choice) => choice.id === merchandiseId);
          setPendingId(merchandiseId);

          startTransition(async () => {
            try {
              const outcome = await runCartMutation(() =>
                changeLineVariant({ lineId, merchandiseId })
              );
              reportStatus(outcome);
              // Changing it here is as deliberate as picking it on the
              // product page, so the next card add follows it.
              if (outcome?.ok && chosen) {
                rememberVariant(item.merchandise.product.handle, chosen);
              }
            } catch (error) {
              console.error(error);
              reportStatus({ ok: false, message: copy.error });
            } finally {
              setPendingId(null);
            }
          });
        }}
        className={clsx(
          "spec-mono max-w-full appearance-none truncate rounded-full border border-ink/20 bg-card py-1.5 pl-3 pr-8 text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none",
          pendingId ? "cursor-wait opacity-60" : "cursor-pointer"
        )}
        title={optionNames}
      >
        {choices.map((choice) => (
          <option
            key={choice.id}
            value={choice.id}
            // The current one stays selectable even if it has since sold out,
            // or the select would show a value it cannot hold.
            disabled={!choice.availableForSale && choice.id !== item.merchandise.id}
          >
            {choice.title}
            {choice.availableForSale ? "" : ` (${copy.soldOut})`}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-ink"
      />
    </label>
  );
}
