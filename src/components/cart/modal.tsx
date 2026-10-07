"use client";

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { getVariantChoices, type VariantChoice } from "./actions";
import { LineVariantSelect } from "./line-variant-select";
import { useCart } from "./cart-context";
import { createUrl } from "@/lib/utils";
import Image from "@/components/ui/shop-image";
import Link from "next/link";
import Price from "../price";
import OpenCart from "./open-cart";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { DEFAULT_OPTION } from "@/lib/constants";
import { DeleteItemButton } from "./delete-item-button";
import { EditItemQuantityButton } from "./edit-item-quantity-button";
import type { CartItem } from "@/lib/shopify/types";
import clsx from "clsx";
import { fromMinor, lineTotalMinor, visibleAttributes } from "./cart-math";
import { KitCartLine } from "./kit-line";
import { isKitLine } from "@/lib/shop/kit";

type MerchandiseSearchParams = {
  [key: string]: string;
};

/**
 * Deterministic ordering. Sorting on product title alone left variants of the
 * same product in an unstable order, so lines visibly swapped places whenever
 * the cart re-rendered.
 */
function compareLines(a: CartItem, b: CartItem): number {
  const byProduct = a.merchandise.product.title.localeCompare(
    b.merchandise.product.title
  );
  if (byProduct !== 0) return byProduct;

  const byVariant = a.merchandise.title.localeCompare(b.merchandise.title);
  if (byVariant !== 0) return byVariant;

  const byMerchandise = a.merchandise.id.localeCompare(b.merchandise.id);
  if (byMerchandise !== 0) return byMerchandise;

  // Two totes with different initials share everything above.
  return lineKey(a).localeCompare(lineKey(b));
}

/**
 * Stable identity for a row. Line id where the server has given one; the
 * optimistic key until then. Never the variant: two personalised lines share
 * it, and a shared key made React render one row twice.
 */
/**
 * Brings the just-added line into view - once, as it mounts or is first
 * flagged, not on every render while the flag holds.
 */
function scrollIntoViewOnce(node: HTMLLIElement | null) {
  node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function lineKey(item: CartItem): string {
  return item.id ?? item.tempKey ?? item.merchandise.id;
}

export default function CartModal() {
  const {
    cart,
    isMutating,
    status,
    clearStatus,
    isCartOpen: isOpen,
    openCart,
    closeCart,
    justAdded,
  } = useCart();

  const totalQuantity = cart?.totalQuantity ?? 0;

  // No cart is pre-created any more. `addItem` creates one on demand inside the
  // same action that adds the line, which removes the first-visit race where a
  // quick click hit a missing cookie, and stops the site minting a Shopify cart
  // for every visitor who never adds anything.

  // The drawer used to open itself on any rise in `totalQuantity`. With a
  // stepper on every card that meant a drawer sliding in on each "+", so it
  // is now opened by the adds that mean "show me": the product page's Add to
  // cart, a card's Buy now, the table's quick add.

  // A double-clicked Buy now opened the drawer on the first click and shut it
  // on the second: by then the backdrop is under the cursor, and a click
  // there is "outside". Closes in the first moments after opening are taken
  // as that echo, not as intent.
  const openedAt = useRef(0);
  useEffect(() => {
    if (isOpen) openedAt.current = performance.now();
  }, [isOpen]);
  const closeUnlessJustOpened = () => {
    if (performance.now() - openedAt.current < 400) return;
    closeCart();
  };

  // Stale banner from a previous interaction shouldn't greet the next open.
  useEffect(() => {
    if (!isOpen) clearStatus();
  }, [isOpen, clearStatus]);

  // Copy before sorting: `cart.lines` is optimistic state, and sorting it in
  // place mutated React state during render. Memoization is left to the React
  // Compiler, which is enabled for this project.
  const lines = cart?.lines ? [...cart.lines].sort(compareLines) : [];

  // The options each line can switch to, fetched the first time the drawer
  // opens with that product in it - not with the cart, which would make every
  // page load pay for a product read per line. Products with one variant come
  // back absent, and simply show no switcher.
  const [choices, setChoices] = useState<Record<string, VariantChoice[]>>({});
  const requested = useRef(new Set<string>());
  const handlesKey = [
    ...new Set(lines.map((line) => line.merchandise.product.handle)),
  ]
    .filter(Boolean)
    .sort()
    .join(",");

  useEffect(() => {
    if (!isOpen || !handlesKey) return;
    const missing = handlesKey
      .split(",")
      .filter((handle) => !requested.current.has(handle));
    if (!missing.length) return;
    missing.forEach((handle) => requested.current.add(handle));

    getVariantChoices(missing)
      .then((found) => setChoices((current) => ({ ...current, ...found })))
      .catch((error) => {
        console.error(error);
        // Let the next open try again.
        missing.forEach((handle) => requested.current.delete(handle));
      });
  }, [isOpen, handlesKey]);

  // An add-on that has gone unavailable blocks checkout the same way its
  // Kompanion would - Shopify refuses the whole cart either way.
  const hasUnavailableLine = lines.some(
    (line) =>
      line.merchandise.availableForSale === false ||
      line.addOns?.some((addOn) => addOn.merchandise.availableForSale === false)
  );
  const canCheckout = Boolean(cart?.checkoutUrl) && !isMutating && lines.length > 0;

  return (
    <>
      <button aria-label="Open cart" onClick={openCart}>
        <OpenCart quantity={totalQuantity} />
      </button>
      <Transition show={isOpen}>
        <Dialog onClose={closeUnlessJustOpened} className="relative z-[1000]">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" aria-hidden />
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="transition-transform ease-editorial duration-500"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <DialogPanel
              data-lenis-prevent
              className="fixed inset-y-0 right-0 flex w-full flex-col bg-paper text-ink md:w-[27rem]"
            >
              <div className="rule-b flex items-center justify-between px-5 py-4">
                <p className="eyebrow">
                  Your order
                  {totalQuantity ? ` · ${totalQuantity}` : ""}
                </p>
                <button
                  aria-label="Close cart"
                  onClick={closeCart}
                  className="transition-opacity hover:opacity-60"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {status?.message ? (
                <p
                  role={status.ok ? "status" : "alert"}
                  aria-live="polite"
                  className={clsx(
                    "spec-mono border-b border-rule px-5 py-3",
                    status.ok ? "bg-tint" : "bg-wash"
                  )}
                >
                  {status.message}
                </p>
              ) : null}

              {lines.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                  <p className="serif text-display-md">Your cart is empty</p>
                  <p className="body-mono mt-3">
                    Nothing here yet. Go meet your in-between Kompanions.
                  </p>
                  <Link href="/search" onClick={closeCart} className="btn-outline mt-8">
                    Explore collection
                  </Link>
                </div>
              ) : (
                <div className="flex h-full flex-col overflow-hidden">
                  <ul data-lenis-prevent className="flex-grow overflow-auto px-5">
                    {lines.map((item) => {
                      if (isKitLine(item)) {
                        return (
                          <KitCartLine
                            key={lineKey(item)}
                            item={item}
                            highlighted={item.merchandise.id === justAdded}
                            onNavigate={closeCart}
                          />
                        );
                      }

                      const merchandiseSearchParams =
                        {} as MerchandiseSearchParams;

                      item.merchandise.selectedOptions.forEach(
                        ({ name, value }) => {
                          if (value !== DEFAULT_OPTION) {
                            merchandiseSearchParams[name.toLocaleLowerCase()] =
                              value;
                          }
                        }
                      );
                      const merchandiseUrl = createUrl(
                        `/product/${item.merchandise.product.handle}`,
                        new URLSearchParams(merchandiseSearchParams)
                      );
                      const isUnavailable =
                        item.merchandise.availableForSale === false;

                      return (
                        <li
                          // Keyed by line, not list index or variant. With an
                          // index key a sorted list reassigned rows to
                          // different products on every change.
                          key={lineKey(item)}
                          ref={
                            item.merchandise.id === justAdded
                              ? scrollIntoViewOnce
                              : undefined
                          }
                          className="rule-b relative flex gap-4 py-5"
                        >
                          {/* The just-added mark: a wash behind the row that
                              fades in and out, bled into the list's gutter so
                              the row's own rule stays where it was. Painted
                              first, so the positioned content sits over it. */}
                          <span
                            aria-hidden
                            className={clsx(
                              "pointer-events-none absolute -inset-x-5 inset-y-0 bg-sage-wash transition-opacity duration-700",
                              item.merchandise.id === justAdded
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <Link
                            href={merchandiseUrl}
                            onClick={closeCart}
                            className="plate h-24 w-20 shrink-0 rounded-lg"
                          >
                            {item.merchandise.product.featuredImage?.url ? (
                              <Image
                                className="h-full w-full object-cover"
                                fill
                                sizes="80px"
                                alt={
                                  item.merchandise.product.featuredImage
                                    .altText || item.merchandise.product.title
                                }
                                src={item.merchandise.product.featuredImage.url}
                              />
                            ) : null}
                          </Link>

                          <div className="relative flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <Link
                                href={merchandiseUrl}
                                onClick={closeCart}
                                className="min-w-0"
                              >
                                <p className="ui-mono normal-case">
                                  {item.merchandise.product.title}
                                </p>
                                {item.merchandise.title !== DEFAULT_OPTION &&
                                !choices[item.merchandise.product.handle] ? (
                                  <p className="spec-mono mt-1.5">
                                    {item.merchandise.title}
                                  </p>
                                ) : null}
                                {isUnavailable ? (
                                  <p className="micro-mono mt-1.5">Out of stock</p>
                                ) : null}
                              </Link>
                              <DeleteItemButton item={item} />
                            </div>

                            {/* Outside the link above: a control inside an
                                <a> is invalid and steals its clicks. Plain
                                and personalised lines alike - the initials
                                travel with the line when its size changes. */}
                            {choices[item.merchandise.product.handle] ? (
                              <LineVariantSelect
                                item={item}
                                choices={choices[item.merchandise.product.handle]!}
                              />
                            ) : null}

                            {item.addOns?.length ? (
                              <ul className="mt-3 space-y-1.5">
                                {item.addOns.map((addOn) => (
                                  <li
                                    key={lineKey(addOn)}
                                    className="flex items-start justify-between gap-2"
                                  >
                                    <p className="spec-mono min-w-0">
                                      <span aria-hidden>+ </span>
                                      {addOn.merchandise.product.title}
                                      {visibleAttributes(addOn).map(
                                        (attribute) => (
                                          <span key={attribute.key}>
                                            {" · "}
                                            {/* "Personalised Initials ·
                                                Initials: KF" says it twice;
                                                the name is dropped where the
                                                title already carries it. */}
                                            {addOn.merchandise.product.title
                                              .toLowerCase()
                                              .includes(attribute.key.toLowerCase())
                                              ? null
                                              : `${attribute.key}: `}
                                            <span className="font-semibold">
                                              {attribute.value}
                                            </span>
                                          </span>
                                        )
                                      )}
                                      {addOn.quantity > 1
                                        ? ` × ${addOn.quantity}`
                                        : ""}
                                      {addOn.merchandise.availableForSale ===
                                      false ? (
                                        <span className="micro-mono block">
                                          No longer available
                                        </span>
                                      ) : null}
                                    </p>
                                    <span className="flex shrink-0 items-center gap-1">
                                      <Price
                                        className="spec-mono"
                                        amount={addOn.cost.totalAmount.amount}
                                        currencyCode={
                                          addOn.cost.totalAmount.currencyCode
                                        }
                                      />
                                      <DeleteItemButton
                                        item={addOn}
                                        label={`Remove ${addOn.merchandise.product.title} from ${item.merchandise.product.title}`}
                                      />
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}

                            <div className="mt-auto flex items-end justify-between pt-4">
                              <div className="flex items-center overflow-hidden rounded-full border border-ink/20">
                                <EditItemQuantityButton
                                  item={item}
                                  type="minus"
                                />
                                <span className="w-8 text-center font-sans text-spec">
                                  {item.quantity}
                                </span>
                                <EditItemQuantityButton
                                  item={item}
                                  type="plus"
                                />
                              </div>
                              {/* The Kompanion with its add-ons: what this row
                                  actually costs. The add-on rows above show
                                  their own share. */}
                              <Price
                                className="spec-mono"
                                amount={fromMinor(lineTotalMinor(item))}
                                currencyCode={item.cost.totalAmount.currencyCode}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="rule-t px-5 py-5">
                    <dl className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <dt className="spec-mono uppercase">Taxes</dt>
                        <dd>
                          <Price
                            className="spec-mono"
                            amount={cart!.cost.totalTaxAmount.amount}
                            currencyCode={
                              cart!.cost.totalTaxAmount.currencyCode
                            }
                          />
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="spec-mono uppercase">Shipping</dt>
                        <dd className="spec-mono">Free across India</dd>
                      </div>
                      <div className="rule-t flex items-baseline justify-between pt-3">
                        <dt className="spec-mono uppercase">Total</dt>
                        <dd>
                          <Price
                            className="serif text-display-sm"
                            amount={cart!.cost.totalAmount.amount}
                            currencyCode={cart!.cost.totalAmount.currencyCode}
                            showCurrencyCode
                            currencyCodeClassName="spec-mono"
                          />
                        </dd>
                      </div>
                    </dl>

                    {hasUnavailableLine ? (
                      <p className="spec-mono mt-4">
                        Remove the unavailable items to check out.
                      </p>
                    ) : null}

                    {/* Held back while a mutation is in flight: the checkout URL
                        is only as current as the cart behind it, and sending a
                        customer mid-update checks them out against the previous
                        contents. */}
                    {canCheckout ? (
                      <a href={cart!.checkoutUrl} className="btn-solid mt-5 w-full">
                        Proceed to checkout <span aria-hidden>&rarr;</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        aria-busy={isMutating}
                        className="btn-solid mt-5 w-full cursor-wait opacity-70"
                      >
                        {isMutating ? "Updating…" : "Proceed to checkout"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}
