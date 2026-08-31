import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import Price from "./price";
import { Badge } from "./ui/section";
import { Product } from "@/lib/shopify/types";

/**
 * Product cell (DESIGN.md §5). A packshot on the mist tile with a status badge
 * inset top-left, then a single mono row: title left, price right. Cards carry
 * no border of their own - they sit flush inside the hairline grid, which owns
 * the dividing rules.
 */

/** Shopify tags drive the flag; the first match wins. */
const BADGE_TAGS: Record<string, string> = {
  new: "New!",
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
  const isRange =
    price.amount !== product.priceRange.maxVariantPrice.amount;
  const badge = badgeFor(product);

  return (
    <Link
      href={`/product/${product.handle}`}
      prefetch
      className={clsx("group flex h-full flex-col p-3 md:p-4", className)}
    >
      <div className="plate aspect-square w-full">
        {product.featuredImage?.url ? (
          <Image
            src={product.featuredImage.url}
            alt={product.featuredImage.altText || product.title}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="eyebrow">No image</span>
          </div>
        )}

        {/* Availability outranks a marketing tag - never flag a sold-out bag
            as "New!". */}
        {!product.availableForSale || badge ? (
          <span className="absolute left-4 top-4">
            <Badge>{product.availableForSale ? badge : "Sold out"}</Badge>
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="ui-mono normal-case group-hover:underline">
          {product.title}
        </h3>
        <div className="flex shrink-0 items-baseline gap-1.5">
          {isRange ? <span className="ui-mono normal-case">from</span> : null}
          <Price
            className="ui-mono normal-case"
            amount={price.amount}
            currencyCode={price.currencyCode}
          />
        </div>
      </div>
    </Link>
  );
}
