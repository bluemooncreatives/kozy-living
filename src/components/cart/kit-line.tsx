"use client";

import Image from "@/components/ui/shop-image";
import { KIT_ATTRIBUTE } from "@/lib/constants";
import { kitCode } from "@/lib/shop/kit";
import type { CartItem } from "@/lib/shopify/types";
import { kitBuilder as kitCopy } from "@/lib/site";
import clsx from "clsx";
import Link from "next/link";
import Price from "../price";
import { fromMinor, lineTotalMinor, visibleAttributes } from "./cart-math";
import { DeleteItemButton } from "./delete-item-button";
import { EditItemQuantityButton } from "./edit-item-quantity-button";

/** Module-level so the ref is stable: an inline one re-runs every render. */
function scrollIntoViewOnce(node: HTMLLIElement | null) {
  node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * A built kit in the drawer: the ₹0 container as the heading, the choices it
 * carries (fabric, thread, initials) under it, then the pieces with their own
 * prices, and one total for the lot.
 *
 * The pieces have no remove button and no size switcher. Removing one could
 * leave a kit below its minimum, and a nested line's relationship cannot be
 * moved; changing a kit means removing it and building again, which the
 * "Edit" link starts.
 */
export function KitCartLine({
  item,
  highlighted,
  onNavigate,
}: {
  item: CartItem;
  highlighted: boolean;
  onNavigate: () => void;
}) {
  const pieces = item.addOns ?? [];
  const code = kitCode(item);
  // The kit code is for the workshop and the account page; the drawer shows it
  // once in the heading rather than on every row.
  const choices = visibleAttributes(item).filter(
    (attribute) =>
      attribute.key !== KIT_ATTRIBUTE &&
      attribute.key !== kitCopy.orderLabels.embroiderOn
  );
  const image =
    item.merchandise.product.featuredImage ??
    pieces.find((piece) => piece.merchandise.product.featuredImage)?.merchandise
      .product.featuredImage;

  return (
    <li
      ref={highlighted ? scrollIntoViewOnce : undefined}
      className="rule-b relative flex gap-4 py-5"
    >
      <span
        aria-hidden
        className={clsx(
          "pointer-events-none absolute -inset-x-5 inset-y-0 bg-sage-wash transition-opacity duration-700",
          highlighted ? "opacity-100" : "opacity-0"
        )}
      />
      <Link
        href="/kit-builder"
        onClick={onNavigate}
        className="plate relative h-24 w-20 shrink-0 rounded-lg"
      >
        {image?.url ? (
          <Image
            className="h-full w-full object-cover"
            fill
            sizes="80px"
            alt={image.altText || item.merchandise.product.title}
            src={image.url}
          />
        ) : null}
      </Link>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="micro-mono text-muted">
              {kitCopy.cartLabel}
              {code ? ` · ${code}` : ""}
            </p>
            <p className="ui-mono mt-1 normal-case">
              {item.merchandise.product.title}
            </p>
            {choices.length ? (
              <p className="spec-mono mt-1.5">
                {choices.map((attribute, index) => (
                  <span key={attribute.key}>
                    {index ? " · " : ""}
                    {attribute.key}:{" "}
                    <span className="font-semibold">{attribute.value}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          <DeleteItemButton
            item={item}
            label={`Remove ${item.merchandise.product.title} from cart`}
          />
        </div>

        <ul className="mt-3 space-y-1.5">
          {pieces.map((piece) => (
            <li
              key={piece.id ?? piece.merchandise.id}
              className="flex items-start justify-between gap-2"
            >
              <p className="spec-mono min-w-0">
                <span aria-hidden>· </span>
                {piece.merchandise.product.title}
                {piece.merchandise.title !== "Default Title"
                  ? ` · ${piece.merchandise.title}`
                  : ""}
                {piece.quantity > 1 ? ` × ${piece.quantity}` : ""}
                {piece.merchandise.availableForSale === false ? (
                  <span className="micro-mono block">No longer available</span>
                ) : null}
              </p>
              <Price
                className="spec-mono shrink-0"
                amount={piece.cost.totalAmount.amount}
                currencyCode={piece.cost.totalAmount.currencyCode}
              />
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div className="flex items-center overflow-hidden rounded-full border border-ink/20">
            <EditItemQuantityButton item={item} type="minus" />
            <span className="w-8 text-center font-sans text-spec">{item.quantity}</span>
            <EditItemQuantityButton item={item} type="plus" />
          </div>
          <div className="text-right">
            <Price
              className="spec-mono"
              amount={fromMinor(lineTotalMinor(item))}
              currencyCode={item.cost.totalAmount.currencyCode}
            />
            <Link
              href="/kit-builder"
              onClick={onNavigate}
              className="micro-mono mt-1 block text-sage-deep underline-offset-4 hover:underline"
            >
              {kitCopy.edit}
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
