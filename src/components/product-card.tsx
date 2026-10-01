"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import NextImage from "next/image";
import clsx from "clsx";
import { useEffect, useState } from "react";
import Price from "./price";
import { Badge } from "./ui/section";
import Plate from "./ui/plate";
import { CardBuyControls } from "./cart/card-buy-controls";
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
 * - Buy now / Add, morphing into an in-cart quantity stepper and Checkout
 *   (`CardBuyControls`), strictly contained inside the card box.
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
  const [shot, setShot] = useState(0);
  const [motionReady, setMotionReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Set by any manual paging, cleared when the pointer leaves. Without it the
  // hover preview would win over the shopper paging back to the first shot.
  const [paged, setPaged] = useState(false);

  // Product rails can arrive through a streamed Suspense boundary. Opting in
  // to the global motion layer from an effect guarantees GSAP never writes an
  // inline transform before React has hydrated this client component.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMotionReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const price = product.priceRange.minVariantPrice;
  const isRange = price.amount !== product.priceRange.maxVariantPrice.amount;
  const badge = badgeFor(product);
  const gallery = galleryFor(product);
  const href = `/product/${product.handle}`;

  const page = (e: React.MouseEvent, by: number) => {
    e.preventDefault();
    e.stopPropagation();
    // From the shot ON SCREEN, not the stored one: under a hover those differ
    // (see `activeIndex`), and stepping from the stored 0 would land on the
    // shot the hover is already showing - a first click that does nothing.
    const len = gallery.length || 1;
    setPaged(true);
    setShot((((activeIndex + by) % len) + len) % len);
  };

  const goToShot = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setPaged(true);
    setShot(index);
  };

  const pagedIndex =
    gallery.length > 0
      ? ((shot % gallery.length) + gallery.length) % gallery.length
      : 0;

  // A mouse resting on an untouched card turns it to its second shot - the
  // plate already stacks every shot and cross-fades between them, so this is
  // state, not another image. Only while the shopper has not paged the card
  // themselves: their choice wins over the hover. Mouse only - on touch the
  // pointerenter that precedes a tap would flip the photograph mid-tap.
  const activeIndex =
    hovered && !paged && pagedIndex === 0 && gallery.length > 1
      ? 1
      : pagedIndex;

  return (
    <article
      {...(reveal
        ? motionReady
          ? { "data-reveal": "" }
          : { "data-reveal-client": "" }
        : {})}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
        setPaged(false);
      }}
      className={clsx(
        "group flex h-full flex-col rounded-plate transition-all duration-300 hover:border-ink/20 hover:shadow-sm",
        className,
      )}
    >
      {/* 1. Photography Plate with Top-Right Curve Notch & Gallery Arrows */}
      <div className="relative overflow-hidden rounded-[1.125rem]">
        <Plate
          src={gallery.length ? undefined : product.featuredImage?.url}
          gallery={gallery.length ? gallery : undefined}
          galleryIndex={activeIndex}
          alt={product.featuredImage?.altText || product.title}
          aspect="4/5"
          placeholderText={product.title.split(" ")[0] ?? "kozy"}
          sizes={sizes}
          priority={priority}
          reveal={false}
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

          {/* GI tag + Availability / Status Flag */}
          <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5">
            <NextImage
              src="/icons/gi-tag.png"
              alt="GI registered craft"
              width={189}
              height={320}
              className="h-10 w-auto sm:h-11"
            />
            {!product.availableForSale || badge ? (
              <Badge>{product.availableForSale ? badge : "Sold out"}</Badge>
            ) : null}
          </div>

          {/* In-plate Gallery Navigation Buttons (Left & Right) - Vertically Centered & Smaller */}
          {gallery.length > 1 ? (
            <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => page(e, -1)}
                aria-label={`Previous image of ${product.title}`}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-white/85 text-ink backdrop-blur-sm transition-all duration-200 hover:bg-white active:scale-95"
              >
                <ChevronLeftIcon
                  aria-hidden
                  className="h-3.5 w-3.5 stroke-[2.5]"
                />
              </button>
              <button
                type="button"
                onClick={(e) => page(e, 1)}
                aria-label={`Next image of ${product.title}`}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-white/85 text-ink backdrop-blur-sm transition-all duration-200 hover:bg-white active:scale-95"
              >
                <ChevronRightIcon
                  aria-hidden
                  className="h-3.5 w-3.5 stroke-[2.5]"
                />
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
                            : "h-1.5 w-1.5 bg-white/50 group-hover/dot:bg-white/80",
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

        {/* 3. Buy now / Add, becoming the in-cart stepper. Every card can
            be bought from here now, variants included - the owner's call,
            for a shorter path to checkout. Which variant it takes, and why,
            is in `CardBuyControls`. */}
        <CardBuyControls product={product} className="mt-3 pt-1" />
      </div>
    </article>
  );
}
