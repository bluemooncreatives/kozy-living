"use client";

import { DEFAULT_OPTION, MAX_LINE_QUANTITY } from "@/lib/constants";
import {
  guessVariant,
  readVariantPreference,
  useVariantPreference,
} from "@/lib/shop/variant-preference";
import type { Image, ProductVariant } from "@/lib/shopify/types";
import { cardBuy as copy } from "@/lib/site";
import {
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { startTransition, useRef, useState } from "react";
import { addPreferredItem, updateItemQuantity } from "./actions";
import { isPlainLine } from "./cart-math";
import { useCart } from "./cart-context";

export type CardBuyProduct = {
  id: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  featuredImage?: Image | null;
  /** May be truncated - the listing fragment fetches two. */
  variants?: ProductVariant[];
};

/**
 * One-tap buying on a card: Buy now and Add, morphing into a quantity stepper
 * once the Kompanion is in the cart.
 *
 * The morph is Baymard's finding for list pages: the button turning into the
 * quantity IS the confirmation, it stops duplicate adds, and the quantity can
 * be changed without a trip to the cart. Only Buy now opens the drawer - a
 * drawer sliding in on every "+" would turn a quick adjustment into a detour.
 *
 * The card has no picker, so it adds the variant `variant-preference.ts`
 * chooses (last picked, else the closest match to what the shopper usually
 * picks, else first in stock), re-resolved on the server against live stock.
 * Which one it took is said under the stepper, with the way to change it.
 */
export function CardBuyControls({
  product,
  className,
}: {
  product: CardBuyProduct;
  className?: string;
}) {
  const {
    cart,
    addCartItem,
    updateCartItem,
    runCartMutation,
    reserveLineQuantity,
    settleLine,
    reportStatus,
    openCart,
    hasPendingMutations,
    flagAdded,
  } = useCart();

  const preference = useVariantPreference();

  const [trackedVariantId, setTrackedVariantId] = useState<string>();
  const [adding, setAdding] = useState<"add" | "buy" | null>(null);
  const addingRef = useRef(false);
  const [notice, setNotice] = useState("");

  // The plain lines of this product - a personalised one belongs to the
  // product page, and the stepper must never change what has initials on it.
  const lines = (cart?.lines ?? []).filter(
    (line) =>
      line.merchandise.product.handle === product.handle && isPlainLine(line)
  );
  const line =
    lines.find((l) => l.merchandise.id === trackedVariantId) ??
    lines.find(
      (l) => l.merchandise.id === preference?.products[product.handle]?.id
    ) ??
    lines[0];

  const soldOut = !product.availableForSale;

  function add(intent: "add" | "buy") {
    // A ref, not the `adding` state: two taps inside one frame both read
    // the state before it re-renders, and added two units (measured).
    if (addingRef.current || soldOut) return;
    addingRef.current = true;
    setNotice("");
    setAdding(intent);

    // Opened at once, like the product page: the line is in the drawer
    // optimistically before the server has answered.
    if (intent === "buy") openCart();

    const pref = preference ?? readVariantPreference();
    const guess = guessVariant(product.handle, product.variants ?? [], pref);

    startTransition(async () => {
      if (guess) {
        setTrackedVariantId(guess.id);
        addCartItem(guess, product, 1);
        if (intent === "buy") flagAdded(guess.id);
      }

      try {
        const outcome = await runCartMutation(() =>
          addPreferredItem({
            handle: product.handle,
            variantId: pref.products[product.handle]?.id,
            options: pref.options,
          })
        );
        if (outcome.ok) {
          setTrackedVariantId(outcome.variantId);
          // The server may have settled on a different size than the guess
          // (the remembered one sold out meanwhile) - mark the real line.
          if (intent === "buy" && outcome.variantId !== guess?.id) {
            flagAdded(outcome.variantId);
          }
          if (outcome.message) reportStatus(outcome);
        } else {
          setNotice(outcome.message);
          reportStatus(outcome);
        }
      } catch (caught) {
        console.error(caught);
        const failure = { ok: false, message: copy.errors.add };
        setNotice(failure.message);
        reportStatus(failure);
      } finally {
        addingRef.current = false;
        setAdding(null);
      }
    });
  }

  function step(type: "plus" | "minus") {
    const lineId = line?.id;
    if (!line || !lineId) return;
    setNotice("");

    // Through the same reservation map as the drawer's steppers, so a burst
    // of taps here and there resolves to one correct absolute quantity.
    const quantity = reserveLineQuantity(
      lineId,
      type === "plus" ? 1 : -1,
      line.quantity
    );

    startTransition(async () => {
      updateCartItem(lineId, type);
      try {
        const outcome = await runCartMutation(() =>
          updateItemQuantity(null, { lineId, quantity })
        );
        // A success can carry a message too: Shopify clamps to the stock
        // left rather than failing, and the count on the card snapping back
        // from 4 to 3 with no word of why reads as a broken button.
        if (outcome?.message) setNotice(outcome.message);
        reportStatus(outcome);
      } catch (caught) {
        console.error(caught);
        setNotice(copy.errors.update);
      } finally {
        settleLine(lineId);
      }
    });
  }

  /**
   * Straight to Shopify's checkout when the cart is settled - the fastest
   * path there is. The drawer instead whenever its guards would hold the
   * button back: a mutation in flight (the URL would check out the previous
   * contents) or a line that can no longer be bought.
   */
  function checkout() {
    const blocked =
      !cart?.checkoutUrl ||
      hasPendingMutations() ||
      cart.lines.some(
        (l) =>
          !l.id ||
          l.merchandise.availableForSale === false ||
          l.addOns?.some((a) => a.merchandise.availableForSale === false)
      );
    if (blocked) {
      openCart();
      return;
    }
    window.location.assign(cart.checkoutUrl);
  }

  const pill =
    "flex h-10 items-center justify-center rounded-full font-sans text-xs font-semibold uppercase tracking-normal transition-all duration-200 select-none sm:text-sm";

  if (soldOut) {
    return (
      <div className={className}>
        <button
          type="button"
          disabled
          className={clsx(pill, "w-full border border-ink/10 text-muted/60")}
        >
          {copy.soldOut}
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {line ? (
        <div className="flex items-center gap-2">
          {/* The stepper: what Add became. The count is the confirmation, so
              it is large and inked rather than a small "1 in cart" badge,
              which Baymard found shoppers miss. */}
          <div
            role="group"
            aria-label={copy.stepperLabel(product.title)}
            className="flex h-10 shrink-0 items-center justify-between rounded-full border border-ink bg-card px-1"
          >
            <button
              type="button"
              onClick={() => step("minus")}
              disabled={!line.id}
              aria-label={
                line.quantity <= 1
                  ? copy.remove(product.title)
                  : copy.decrease(product.title)
              }
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/10 active:scale-90 disabled:cursor-wait disabled:opacity-40"
            >
              <MinusIcon aria-hidden className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
            <span
              aria-live="polite"
              className="ui-mono w-7 text-center text-sm font-semibold tabular-nums text-ink"
            >
              <span className="sr-only">{copy.inCart} </span>
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => step("plus")}
              disabled={!line.id || line.quantity >= MAX_LINE_QUANTITY}
              aria-label={copy.increase(product.title)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/10 active:scale-90 disabled:cursor-wait disabled:opacity-40"
            >
              <PlusIcon aria-hidden className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>

          <button
            type="button"
            onClick={checkout}
            className={clsx(
              pill,
              "flex-1 gap-1.5 bg-ink px-3 text-paper hover:bg-sage hover:text-ink active:scale-[0.98]"
            )}
          >
            {copy.checkout} <span aria-hidden>&rarr;</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => add("add")}
            disabled={Boolean(adding)}
            aria-label={copy.add(product.title)}
            aria-busy={adding === "add"}
            title={copy.addTitle}
            className={clsx(
              pill,
              "relative w-10 shrink-0 border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-paper active:scale-95",
              adding && "cursor-wait opacity-70"
            )}
          >
            <ShoppingBagIcon aria-hidden className="h-4 w-4" />
            <PlusIcon
              aria-hidden
              className="absolute right-1.5 top-1.5 h-2.5 w-2.5 stroke-[3]"
            />
          </button>
          <button
            type="button"
            onClick={() => add("buy")}
            disabled={Boolean(adding)}
            aria-label={copy.buy(product.title)}
            aria-busy={adding === "buy"}
            className={clsx(
              pill,
              "flex-1 bg-ink px-4 text-paper hover:bg-sage hover:text-ink active:scale-[0.98]",
              adding && "cursor-wait opacity-70"
            )}
          >
            {adding === "buy" ? copy.buying : copy.buyNow}
          </button>
        </div>
      )}

      {/* Which size the card took, and the way to change it - a silent pick
          is only acceptable if it is said out loud. */}
      {line && line.merchandise.title !== DEFAULT_OPTION ? (
        <p className="spec-mono mt-2 flex flex-wrap items-baseline gap-x-1.5 text-muted">
          <span className="text-ink">{line.merchandise.title}</span>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={openCart}
            className="underline underline-offset-2 hover:text-ink"
          >
            {copy.change}
          </button>
        </p>
      ) : null}

      {notice ? (
        <p role="alert" className="spec-mono mt-2 text-center text-ink">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
