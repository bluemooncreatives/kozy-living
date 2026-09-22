"use client";

import clsx from "clsx";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import Price from "../price";
import { useCart } from "./cart-context";

/**
 * The standing order, at the bottom of a phone screen.
 *
 * A cart on a phone is easy to lose: the only sign of it is a small glyph in
 * the header, which scrolls under the thumb and carries a number rather than a
 * price. This keeps what is in the cart and what it costs in view from the
 * moment the first thing is added, and puts the way back to it inside the
 * thumb's reach.
 *
 * It opens the drawer rather than going straight to checkout. The drawer is
 * where a line can still be removed, where tax and shipping are broken out, and
 * where checkout is held back while a mutation is in flight - a bar that
 * shortcut all of that could hand someone a checkout built from a cart they
 * have already changed.
 *
 * Mounted once at the root and always rendered: sliding a mounted element out
 * of frame lets the last item leaving animate away, where unmounting on an
 * empty cart would make it vanish. The spacer is what stops it covering the end
 * of the page - the page can then be scrolled clear of it, which `position:
 * fixed` alone does not allow.
 */
export default function CartBar() {
  const { cart, openCart, isMutating, isCartOpen } = useCart();

  const totalQuantity = cart?.totalQuantity ?? 0;
  const showing = totalQuantity > 0;

  return (
    <>
      {/* Only as tall as the bar, and only while the bar is there. The extra
          pixel is the bar's own top border, without which the last line of the
          footer sits under it. */}
      <div
        aria-hidden
        className={clsx(
          "md:hidden",
          showing
            ? "h-[calc(4rem+1px)] pb-[env(safe-area-inset-bottom)]"
            : "h-0"
        )}
      />

      <div
        className={clsx(
          // Under the header and both overlays, over everything on the page.
          "fixed inset-x-0 bottom-0 z-[900] border-t border-ink/10 bg-paper/95 backdrop-blur-md transition-transform duration-300 ease-editorial motion-reduce:transition-none md:hidden",
          "pb-[env(safe-area-inset-bottom)]",
          showing ? "translate-y-0" : "translate-y-full"
        )}
        // Off-frame it is still in the DOM, so it has to leave the tab order
        // and the accessibility tree with it.
        aria-hidden={!showing || isCartOpen}
        inert={!showing || isCartOpen}
      >
        <button
          type="button"
          onClick={openCart}
          aria-busy={isMutating}
          aria-label={`Open cart - ${totalQuantity} ${
            totalQuantity === 1 ? "item" : "items"
          }`}
          className="flex h-16 w-full items-center justify-between gap-4 px-5 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
              <ShoppingBagIcon aria-hidden className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sage px-1 font-sans text-[0.65rem] font-semibold tabular-nums text-ink">
                {totalQuantity}
              </span>
            </span>
            <span className="min-w-0">
              <span className="eyebrow block">Your order</span>
              {cart ? (
                <Price
                  className="ui-mono block font-semibold"
                  amount={cart.cost.totalAmount.amount}
                  currencyCode={cart.cost.totalAmount.currencyCode}
                />
              ) : null}
            </span>
          </span>

          <span className="ui-mono shrink-0 rounded-chip bg-ink px-4 py-2 text-xs font-semibold text-paper">
            View cart
          </span>
        </button>
      </div>
    </>
  );
}
