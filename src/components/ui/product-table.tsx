import Link from "next/link";
import Price from "../price";
import { Product } from "@/lib/shopify/types";
import QuickAdd from "./quick-add";

/**
 * The "Straight from the Source" listing (DESIGN.md §5). A dense mono table
 * that lets someone scan the whole single-origin range without scrolling a
 * carousel - the counterpoint to the image-led rails above it.
 */

/**
 * Shopify gives us free-text tags, not structured metafields, so the table
 * matches them against known vocabularies rather than guessing by position.
 * An unmatched product simply shows an em dash instead of a wrong value.
 */
const REGIONS = [
  "Coorg",
  "Chikmagalur",
  "Wayanad",
  "Araku",
  "Nilgiris",
  "Brazil",
  "Colombia",
  "Ethiopia",
  "Kenya",
  "Indonesia",
  "Peru",
  "Vietnam",
  "Nepal",
  "India",
];

const BREW_METHODS = [
  "Espresso",
  "Filter",
  "Aeropress",
  "Moka pot",
  "French press",
  "Pour over",
  "Cold brew",
];

function matchTag(product: Product, vocabulary: string[]): string | null {
  const tags = (product.tags ?? []).map((tag) => tag.toLowerCase().trim());
  return (
    vocabulary.find((term) => tags.includes(term.toLowerCase())) ?? null
  );
}

export default function ProductTable({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <div data-lenis-prevent-horizontal className="rule-t overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <caption className="sr-only">
          Single-origin coffee, by region and brew method
        </caption>
        <thead>
          <tr className="rule-b">
            <th scope="col" className="spec-mono px-4 py-4 uppercase">
              <span aria-hidden className="mr-2">
                &uarr;
              </span>
              Title
            </th>
            <th scope="col" className="spec-mono px-4 py-4 uppercase">
              Region
            </th>
            <th scope="col" className="spec-mono px-4 py-4 uppercase">
              Best for
            </th>
            <th scope="col" className="spec-mono px-4 py-4 text-right uppercase">
              Price
            </th>
            <th scope="col" className="w-12 px-4 py-4">
              <span className="sr-only">Add to cart</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const price = product.priceRange.minVariantPrice;
            const isRange =
              price.amount !== product.priceRange.maxVariantPrice.amount;

            return (
              <tr
                key={product.handle}
                className="rule-b transition-colors hover:bg-wash"
              >
                <th scope="row" className="px-4 py-4 font-normal">
                  <Link
                    href={`/product/${product.handle}`}
                    prefetch
                    className="spec-mono hover:underline"
                  >
                    {product.title}
                  </Link>
                </th>
                <td className="spec-mono px-4 py-4">
                  {matchTag(product, REGIONS) ?? <span aria-hidden>&mdash;</span>}
                </td>
                <td className="spec-mono px-4 py-4">
                  {matchTag(product, BREW_METHODS) ?? (
                    <span aria-hidden>&mdash;</span>
                  )}
                </td>
                <td className="spec-mono whitespace-nowrap px-4 py-4 text-right">
                  <span className="inline-flex items-baseline gap-1.5">
                    {isRange ? <span>from</span> : null}
                    <Price
                      className="inline"
                      amount={price.amount}
                      currencyCode={price.currencyCode}
                    />
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <QuickAdd product={product} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
