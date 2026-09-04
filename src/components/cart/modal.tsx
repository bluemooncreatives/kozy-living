"use client";

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useCart } from "./cart-context";
import { createUrl } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import Price from "../price";
import OpenCart from "./open-cart";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { DEFAULT_OPTION } from "@/lib/constants";
import { DeleteItemButton } from "./delete-item-button";
import { EditItemQuantityButton } from "./edit-item-quantity-button";
import type { CartItem } from "@/lib/shopify/types";
import clsx from "clsx";

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

  return a.merchandise.id.localeCompare(b.merchandise.id);
}

export default function CartModal() {
  const { cart, isMutating, status, clearStatus } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const quantityRef = useRef(cart?.totalQuantity ?? 0);
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const totalQuantity = cart?.totalQuantity ?? 0;

  // No cart is pre-created any more. `addItem` creates one on demand inside the
  // same action that adds the line, which removes the first-visit race where a
  // quick click hit a missing cookie, and stops the site minting a Shopify cart
  // for every visitor who never adds anything.

  useEffect(() => {
    // Only a genuine *increase* pops the drawer. The old condition fired on
    // decrements too, so removing an item could yank the drawer back open.
    if (totalQuantity > quantityRef.current && !isOpen) {
      setIsOpen(true);
    }
    quantityRef.current = totalQuantity;
  }, [totalQuantity, isOpen]);

  // Stale banner from a previous interaction shouldn't greet the next open.
  useEffect(() => {
    if (!isOpen) clearStatus();
  }, [isOpen, clearStatus]);

  // Copy before sorting: `cart.lines` is optimistic state, and sorting it in
  // place mutated React state during render. Memoization is left to the React
  // Compiler, which is enabled for this project.
  const lines = cart?.lines ? [...cart.lines].sort(compareLines) : [];

  const hasUnavailableLine = lines.some(
    (line) => line.merchandise.availableForSale === false
  );
  const canCheckout = Boolean(cart?.checkoutUrl) && !isMutating && lines.length > 0;

  return (
    <>
      <button aria-label="Open cart" onClick={openCart}>
        <OpenCart quantity={totalQuantity} />
      </button>
      <Transition show={isOpen}>
        <Dialog onClose={closeCart} className="relative z-[1000]">
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
                          // Keyed by variant, not list index. With an index key
                          // a sorted list reassigned rows to different products
                          // on every change.
                          key={item.merchandise.id}
                          className="rule-b flex gap-4 py-5"
                        >
                          <Link
                            href={merchandiseUrl}
                            onClick={closeCart}
                            className="plate h-24 w-20 shrink-0"
                          >
                            {item.merchandise.product.featuredImage?.url ? (
                              <Image
                                className="h-full w-full object-contain p-2"
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

                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <Link
                                href={merchandiseUrl}
                                onClick={closeCart}
                                className="min-w-0"
                              >
                                <p className="ui-mono normal-case">
                                  {item.merchandise.product.title}
                                </p>
                                {item.merchandise.title !== DEFAULT_OPTION ? (
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

                            <div className="mt-auto flex items-end justify-between pt-4">
                              <div className="flex items-center rounded-full border border-ink/20">
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
                              <Price
                                className="spec-mono"
                                amount={item.cost.totalAmount.amount}
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
                        Remove the out-of-stock items to check out.
                      </p>
                    ) : null}

                    {/* Held back while a mutation is in flight: the checkout URL
                        is only as current as the cart behind it, and sending a
                        customer mid-update checks them out against the previous
                        contents. */}
                    {canCheckout ? (
                      <a href={cart!.checkoutUrl} className="btn-amber mt-5 w-full">
                        Proceed to checkout <span aria-hidden>&rarr;</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        aria-busy={isMutating}
                        className="btn-amber mt-5 w-full cursor-wait opacity-70"
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
