"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import Price from "./price";
import { Badge } from "./ui/section";
import Plate from "./ui/plate";
import { addItem, type CartActionState } from "./cart/actions";
import { useCart } from "./cart/cart-context";
import { MAX_LINE_QUANTITY } from "@/lib/constants";
import type { Image, Money, ProductVariant } from "@/lib/shopify/types";

/**
 * Product card. A packshot on a rounded plate with a corner ↗ and a status
 * flag inset top-left, then the title, the price, and the controls that let
 * the card be bought from without opening it: a quantity stepper and an add
 * button. Where the product has more than one shot, arrows page through them
 * in place.
 *
 * The plate is 4/5 rather than square. The notch stays exactly as it was -
 * it is cut by `.notch-tr` on the media wrapper, which is a corner radius and
 * has nothing to do with the plate's proportions.
 *
 * WHY THIS IS NOT ONE BIG <Link> ANY MORE. It used to be, and a card that
 * carries buttons cannot be: a <button> inside an <a> is invalid HTML, and
 * browsers recover from it by breaking one or the other. The link is now an
 * overlay pinned across the photograph, with the controls sitting above it on
 * a higher layer, plus the title as a second, real link. That is also what
 * keeps the whole card keyboard-reachable in a sensible order: photograph,
 * arrows, title, stepper, add.
 */

/**
 * What a card needs, and no more.
 *
 * Structural rather than `Product` so the same card renders both the full
 * product from a detail page and the light `CatalogProduct` the shop grid
 * fetches - see `lib/shopify/fragments/product-card.ts`. `images` and
 * `variants` are optional for that reason too: a caller that has neither
 * still gets a card, just one that shows the featured shot and sends the
 * visitor to the detail page to buy.
 */
export type ProductCardProduct = {
  id: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  tags: string[];
  featuredImage?: Image | null;
  images?: Image[];
  variants?: ProductVariant[];
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
};

/** Shopify tags drive the flag; the first match wins. */
const BADGE_TAGS: Record<string, string> = {
  new: "New",
  seasonal: "Seasonal",
  sale: "Sale",
  limited: "Limited",
  bestseller: "Bestseller",
};

function badgeFor(product: ProductCardProduct): string | null {
  for (const tag of product.tags ?? []) {
    const label = BADGE_TAGS[tag.toLowerCase()];
    if (label) return label;
  }
  return null;
}

/**
 * The shots this card can page through, featured one first.
 *
 * Deduplicated by URL because `featuredImage` is almost always also the first
 * entry of `images`, and paging through the same photograph twice reads as a
 * broken carousel.
 */
function galleryFor(product: ProductCardProduct): Image[] {
  const shots = [
    ...(product.featuredImage ? [product.featuredImage] : []),
    ...(product.images ?? []),
  ];

  const seen = new Set<string>();
  return shots.filter((shot) => {
    if (!shot?.url || seen.has(shot.url)) return false;
    seen.add(shot.url);
    return true;
  });
}

export default function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  reveal = true,
  className,
}: {
  product: ProductCardProduct;
  priority?: boolean;
  sizes?: string;
  /**
   * Scroll-reveal on entry. Turn it off wherever the grid is rebuilt in place
   * - the shop's filters do that on every tick, and a card that re-plays an
   * 800ms entrance each time makes filtering feel like a page reload. Those
   * grids fade in through the CSS `animate-fadeIn` on the cell instead, which
   * costs no JavaScript and cannot leave a card stranded at zero opacity if a
   * scroll trigger never fires for it.
   */
  reveal?: boolean;
  className?: string;
}) {
  const { addCartItem, runCartMutation, reportStatus } = useCart();

  const [shot, setShot] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [result, setResult] = useState<CartActionState>(null);

  const price = product.priceRange.minVariantPrice;
  const isRange = price.amount !== product.priceRange.maxVariantPrice.amount;
  const badge = badgeFor(product);
  const gallery = galleryFor(product);
  const href = `/product/${product.handle}`;

  // The fragment caps variants at two, which is all this question needs: one
  // variant is a product a card can sell outright, more than one has choices
  // that belong on the detail page rather than crammed into a grid cell.
  const variants = product.variants ?? [];
  const only = variants.length === 1 ? variants[0] : undefined;
  const hasChoices = variants.length > 1;
  const sellable =
    product.availableForSale && !!only && only.availableForSale ? only : undefined;

  const step = (by: number) =>
    setQuantity((current) =>
      Math.min(MAX_LINE_QUANTITY, Math.max(1, current + by))
    );

  const page = (by: number) => {
    setShot((current) => current + by);
    // A new photograph is a new look at the product, not a new product: the
    // quantity the visitor dialled in deliberately survives it.
  };

  async function add() {
    if (!sellable) return;

    setResult(null);
    setPending(true);
    // Optimistic first, so the header count moves on the click rather than on
    // the round trip. Safe to do here: a form action is already a transition.
    addCartItem(sellable, product, quantity);

    try {
      const outcome = await runCartMutation(() =>
        addItem(null, { merchandiseId: sellable.id, quantity })
      );
      setResult(outcome);
      // Mirrored into the drawer, which pops open on a successful add.
      reportStatus(outcome);
      if (outcome?.ok !== false) {
        setAdded(true);
        setQuantity(1);
        window.setTimeout(() => setAdded(false), 2000);
      }
    } catch (error) {
      console.error(error);
      const failure = { ok: false, message: "We couldn't add that to your cart." };
      setResult(failure);
      reportStatus(failure);
    } finally {
      setPending(false);
    }
  }

  const errorMessage = result && !result.ok ? result.message : "";

  return (
    <article
      {...(reveal ? { "data-reveal": "" } : {})}
      className={clsx("group flex h-full flex-col", className)}
    >
      <div className="relative">
        <Plate
          src={gallery.length ? undefined : product.featuredImage?.url}
          gallery={gallery.length ? gallery : undefined}
          galleryIndex={shot}
          alt={product.featuredImage?.altText || product.title}
          // Taller than wide. The notch is a corner cut, not a ratio, so it
          // survives the change untouched.
          aspect="4/5"
          placeholderText={product.title.split(" ")[0] ?? "kozy"}
          sizes={sizes}
          priority={priority}
          reveal={reveal}
          arrow
          tone={1}
        >
          {/* The card's main link. An overlay rather than a wrapper, so the
              controls below can be real buttons. */}
          <Link
            href={href}
            prefetch
            aria-label={product.title}
            className="absolute inset-0 z-10 rounded-plate"
          />

          {/* Availability outranks a marketing tag - never flag a sold-out
              piece as "New". */}
          {!product.availableForSale || badge ? (
            <span className="pointer-events-none absolute left-4 top-4 z-20">
              <Badge>{product.availableForSale ? badge : "Sold out"}</Badge>
            </span>
          ) : null}

          {gallery.length > 1 ? (
            <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between">
              {[
                { by: -1, label: "Previous image", Icon: ChevronLeftIcon },
                { by: 1, label: "Next image", Icon: ChevronRightIcon },
              ].map(({ by, label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => page(by)}
                  // Icon-only, so the accessible name comes from aria-label.
                  // Named per card, or a grid of them reads as fifty
                  // identical "Next image" buttons to a screen reader.
                  aria-label={`${label} of ${product.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-card/90 text-ink shadow-chip backdrop-blur-sm transition-colors duration-200 hover:bg-ink hover:text-paper"
                >
                  <Icon aria-hidden className="h-4 w-4" />
                </button>
              ))}
            </div>
          ) : null}
        </Plate>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-3 px-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="ui-mono font-semibold">
            <Link href={href} prefetch className="hover:underline">
              {product.title}
            </Link>
          </h3>
          <div className="flex shrink-0 items-baseline gap-1.5">
            {isRange ? <span className="spec-mono">from</span> : null}
            <Price
              className="ui-mono font-semibold"
              amount={price.amount}
              currencyCode={price.currencyCode}
            />
          </div>
        </div>

        {/* Pushed to the bottom, so cards with titles of different lengths
            still line their controls up across a row. */}
        <div className="mt-auto">
          {!product.availableForSale || (!sellable && !hasChoices) ? (
            <button disabled className="btn-outline w-full">
              {product.availableForSale ? "Unavailable" : "Sold out"}
            </button>
          ) : hasChoices ? (
            // More than one variant: the choice is the detail page's job.
            <Link href={href} prefetch className="btn-outline w-full">
              Choose options <span aria-hidden>&rarr;</span>
            </Link>
          ) : (
            <form action={add} className="flex items-center gap-2">
              <div className="flex shrink-0 items-center rounded-full border border-ink/20">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={quantity <= 1}
                  aria-label={`Remove one ${product.title}`}
                  className="flex h-9 w-8 items-center justify-center rounded-l-full text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink"
                >
                  <MinusIcon aria-hidden className="h-3.5 w-3.5" />
                </button>
                {/* aria-live, so the stepper announces the new number rather
                    than leaving a screen-reader user to guess at it. */}
                <span
                  aria-live="polite"
                  className="ui-mono w-6 text-center font-semibold tabular-nums"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={quantity >= MAX_LINE_QUANTITY}
                  aria-label={`Add one ${product.title}`}
                  className="flex h-9 w-8 items-center justify-center rounded-r-full text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink"
                >
                  <PlusIcon aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                aria-label={`Add ${product.title} to cart`}
                aria-busy={pending}
                // Guards the double-submit that otherwise adds twice on a
                // double click.
                disabled={pending}
                className={clsx(
                  "btn-outline flex-1",
                  pending && "cursor-wait opacity-70"
                )}
              >
                {pending ? "Adding…" : added ? "Added ✓" : "Add"}
              </button>
            </form>
          )}

          {errorMessage ? (
            <p role="alert" className="spec-mono mt-2 text-center">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
