import Link from "next/link";
import clsx from "clsx";
import Price from "./price";
import { Badge } from "./ui/section";
import Plate from "./ui/plate";
import { Product } from "@/lib/shopify/types";

/**
 * Product cell. A packshot on a rounded plate with a corner ↗ and a status
 * flag inset top-left, then a single row: title left, price right.
 *
 * Cards carry no border - they are separated by the grid's gap, and the plate's
 * own radius is what reads as the card edge.
 */

/** Shopify tags drive the flag; the first match wins. */
const BADGE_TAGS: Record<string, string> = {
  new: "New",
  seasonal: "Seasonal",
  sale: "Sale",
  limited: "Limited",
  bestseller: "Bestseller",
};

function badgeFor(product: Product): string | null {
  for (const tag of product.tags ?? []) {
    const label = BADGE_TAGS[tag.toLowerCase()];
    if (label) return label;
  }
  return null;
}

export default function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className,
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const price = product.priceRange.minVariantPrice;
  const isRange = price.amount !== product.priceRange.maxVariantPrice.amount;
  const badge = badgeFor(product);

  return (
    <Link
      href={`/product/${product.handle}`}
      prefetch
      className={clsx("group flex h-full flex-col", className)}
    >
      <Plate
        src={product.featuredImage?.url}
        alt={product.featuredImage?.altText || product.title}
        aspect="1/1"
        placeholderText={product.title.split(" ")[0] ?? "kozy"}
        sizes={sizes}
        priority={priority}
        arrow
        tone={1}
      >
        {/* Availability outranks a marketing tag - never flag a sold-out
            piece as "New". */}
        {!product.availableForSale || badge ? (
          <span className="absolute left-4 top-4 z-10">
            <Badge>{product.availableForSale ? badge : "Sold out"}</Badge>
          </span>
        ) : null}
      </Plate>

      <div className="mt-3 flex items-baseline justify-between gap-4 px-1">
        <h3 className="ui-mono font-semibold group-hover:underline">
          {product.title}
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
    </Link>
  );
}
