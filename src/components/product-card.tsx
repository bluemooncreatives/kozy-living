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
 * Product card.
 *
 * A self-contained card box with:
 * - Elongated photographic plate (4/5 aspect ratio)
 * - Top-right notched corner curve with the iconic ↗ arrow button
 * - In-plate vertically centered left and right navigation buttons for gallery browsing
 * - In-plate dotted carousel indicator at the bottom of the card plate
 * - Status badge (Sold out / New / Bestseller)
 * - Product title and formatted price row
 * - Integrated Order Add Counter [- 1 +] and dynamic Add to Cart button [ADD]
 *   strictly contained inside the card box.
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
 * Deduplicated by URL to avoid showing the same photograph twice.
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

  const variants = product.variants ?? [];
  const selectedVariant =
    variants.find((v) => v.availableForSale) ?? variants[0];
  const isAvailable = Boolean(
    product.availableForSale &&
    (selectedVariant ? selectedVariant.availableForSale : true)
  );

  const step = (by: number) => {
    setQuantity((current) =>
      Math.min(MAX_LINE_QUANTITY, Math.max(1, current + by))
    );
  };

  const page = (e: React.MouseEvent, by: number) => {
    e.preventDefault();
    e.stopPropagation();
    setShot((current) => {
      const len = gallery.length || 1;
      return (((current + by) % len) + len) % len;
    });
  };

  const goToShot = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setShot(index);
  };

  const activeIndex =
    gallery.length > 0
      ? ((shot % gallery.length) + gallery.length) % gallery.length
      : 0;

  async function add(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!selectedVariant || !isAvailable || pending) return;

    setResult(null);
    setPending(true);
    addCartItem(selectedVariant, product, quantity);

    try {
      const outcome = await runCartMutation(() =>
        addItem(null, { merchandiseId: selectedVariant.id, quantity })
      );
      setResult(outcome);
      reportStatus(outcome);
      if (outcome?.ok !== false) {
        setAdded(true);
        setQuantity(1);
        window.setTimeout(() => setAdded(false), 2000);
      }
    } catch (error) {
      console.error(error);
      const failure = {
        ok: false,
        message: "We couldn't add that to your cart.",
      };
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
      className={clsx(
        "group flex h-full flex-col rounded-plate transition-all duration-300 hover:border-ink/20 hover:shadow-sm",
        className
      )}
    >
      {/* 1. Photography Plate with Top-Right Curve Notch & Gallery Arrows */}
      <div className="relative overflow-hidden rounded-[1.125rem]">
        <Plate
          src={gallery.length ? undefined : product.featuredImage?.url}
          gallery={gallery.length ? gallery : undefined}
          galleryIndex={shot}
          alt={product.featuredImage?.altText || product.title}
          aspect="4/5"
          placeholderText={product.title.split(" ")[0] ?? "kozy"}
          sizes={sizes}
          priority={priority}
          reveal={reveal}
          arrow
          tone={1}
        >
          {/* Card's main navigation link overlay */}
          <Link
            href={href}
            prefetch
            aria-label={product.title}
            className="absolute inset-0 z-10"
          />

          {/* Availability / Status Flag */}
          {!product.availableForSale || badge ? (
            <span className="pointer-events-none absolute left-3 top-3 z-20">
              <Badge>{product.availableForSale ? badge : "Sold out"}</Badge>
            </span>
          ) : null}

          {/* In-plate Gallery Navigation Buttons (Left & Right) - Vertically Centered & Smaller */}
          {gallery.length > 1 ? (
            <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => page(e, -1)}
                aria-label={`Previous image of ${product.title}`}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-white/85 text-ink backdrop-blur-sm transition-all duration-200 hover:bg-white active:scale-95"
              >
                <ChevronLeftIcon aria-hidden className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={(e) => page(e, 1)}
                aria-label={`Next image of ${product.title}`}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-white/85 text-ink backdrop-blur-sm transition-all duration-200 hover:bg-white active:scale-95"
              >
                <ChevronRightIcon aria-hidden className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : null}

          {/* In-plate Transparent Dotted / Dashed Carousel Indicator at the Bottom */}
          {gallery.length > 1 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-center justify-center">
              <div className="flex items-center gap-1.5 py-1">
                {gallery.map((_, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => goToShot(e, index)}
                      aria-label={`Go to slide ${index + 1} of ${gallery.length} for ${product.title}`}
                      aria-current={isActive}
                      className="pointer-events-auto group/dot flex h-5 items-center justify-center px-0.5 transition-transform active:scale-90"
                    >
                      <span
                        className={clsx(
                          "block shrink-0 rounded-full transition-all duration-300 ease-out",
                          isActive
                            ? "h-1.5 w-5 bg-white"
                            : "h-1.5 w-1.5 bg-white/50 group-hover/dot:bg-white/80"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Plate>
      </div>

      {/* 2. Details & Controls: Strictly inside the card box */}
      <div className="mt-3 flex flex-1 flex-col justify-between px-0.5">
        {/* Title and Price Row */}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="ui-mono font-semibold text-ink text-sm sm:text-base leading-snug">
            <Link href={href} prefetch className="hover:underline">
              {product.title}
            </Link>
          </h3>
          <div className="flex shrink-0 items-baseline gap-1 text-sm sm:text-base">
            {isRange ? (
              <span className="spec-mono text-xs text-muted">from</span>
            ) : null}
            <Price
              className="ui-mono font-semibold"
              amount={price.amount}
              currencyCode={price.currencyCode}
            />
          </div>
        </div>

        {/* 3. In-Box Order Counter & Dynamic Add Button */}
        <div className="mt-3 pt-1">
          <form
            onSubmit={add}
            className="flex items-center gap-2"
          >
            {/* Pill Order Add Counter: [- 1 +] */}
            <div
              className={clsx(
                "flex h-10 shrink-0 items-center justify-between rounded-full border border-ink/20 px-1 bg-card transition-opacity",
                !isAvailable && "opacity-40 pointer-events-none"
              )}
            >
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={quantity <= 1 || !isAvailable}
                aria-label={`Decrease quantity of ${product.title}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
              >
                <MinusIcon aria-hidden className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>

              <span
                aria-live="polite"
                className="ui-mono w-6 text-center font-semibold text-sm tabular-nums text-ink select-none"
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => step(1)}
                disabled={quantity >= MAX_LINE_QUANTITY || !isAvailable}
                aria-label={`Increase quantity of ${product.title}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
              >
                <PlusIcon aria-hidden className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Pill Dynamic Add to Cart Button: [ ADD ] */}
            <button
              type="submit"
              disabled={!isAvailable || pending}
              aria-label={`Add ${product.title} to cart`}
              aria-busy={pending}
              className={clsx(
                "flex h-10 flex-1 items-center justify-center rounded-full border border-ink/25 px-4 font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all duration-200 select-none",
                isAvailable
                  ? added
                    ? "border-sage-deep bg-sage text-ink font-bold"
                    : pending
                      ? "border-ink/20 bg-ink/5 text-ink/70 cursor-wait"
                      : "border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-paper active:scale-[0.98]"
                  : "border-ink/10 bg-transparent text-muted/60 cursor-not-allowed"
              )}
            >
              {pending ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-ink/70" />
                  ADDING…
                </span>
              ) : added ? (
                <span>ADDED ✓</span>
              ) : isAvailable ? (
                <span>ADD</span>
              ) : (
                <span>SOLD OUT</span>
              )}
            </button>
          </form>

          {errorMessage ? (
            <p role="alert" className="spec-mono mt-2 text-center text-xs text-red-600">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
