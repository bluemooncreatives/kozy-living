import Link from "next/link";
import Price from "../price";
import { Product } from "@/lib/shopify/types";
import QuickAdd from "./quick-add";

/**
 * The "Studio Catalog" listing. A dense mono table that lets someone
 * scan the range by room, material, and craft finish.
 */

const ROOMS = [
  "Living Room",
  "Bedroom",
  "Dining Room",
  "Study & Workspace",
  "Entryway",
  "Kitchen & Table",
  "Outdoor & Patio",
  "Living",
  "Dining",
  "Bedroom",
  "Lighting",
  "Decor",
];

const MATERIALS = [
  "Solid Oak",
  "Organic Linen",
  "Stoneware Clay",
  "Brushed Brass",
  "Hand-Woven Jute",
  "Bouclé Wool",
  "Travertine Stone",
  "Natural Teak",
  "Smoked Glass",
  "Terracotta",
  "Walnut Wood",
  "Ceramic",
  "Cotton",
  "Wood",
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
          Kozy Living objects, by space and material
        </caption>
        <thead>
          <tr className="rule-b">
            <th scope="col" className="spec-mono px-4 py-4 uppercase">
              <span aria-hidden className="mr-2">
                &uarr;
              </span>
              Object
            </th>
            <th scope="col" className="spec-mono px-4 py-4 uppercase">
              Space / Room
            </th>
            <th scope="col" className="spec-mono px-4 py-4 uppercase">
              Material & Craft
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
                  {matchTag(product, ROOMS) ?? <span aria-hidden>&mdash;</span>}
                </td>
                <td className="spec-mono px-4 py-4">
                  {matchTag(product, MATERIALS) ?? (
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
