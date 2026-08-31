import { Product } from "@/lib/shopify/types";
import Price from "../price";
import VariantSelector from "./variant-selector";
import Prose from "../prose";
import { AddToCart } from "../cart/add-to-cart";
import { Headline } from "../ui/section";

/**
 * Buy panel: Object title, pricing, variant selections (sizing/finishes),
 * Add to Cart action, and architectural material & care specifications.
 */

/** Spec rows read from Shopify tags; unmatched vocabularies are omitted. */
const SPEC_VOCABULARIES: { label: string; terms: string[] }[] = [
  {
    label: "Space / Room",
    terms: ["Living Room", "Bedroom", "Dining", "Study", "Entryway", "Outdoor"],
  },
  {
    label: "Material",
    terms: [
      "Solid Oak",
      "Organic Linen",
      "Stoneware Clay",
      "Brushed Brass",
      "Hand-Woven Jute",
      "Bouclé Wool",
      "Travertine",
      "Natural Teak",
      "Walnut",
    ],
  },
  {
    label: "Craft Technique",
    terms: [
      "Hand-Joined Timber",
      "Wheel-Thrown",
      "Hand-Loomed",
      "Mineral Glazed",
      "Plant-Oil Finished",
    ],
  },
  {
    label: "Sustainability",
    terms: ["100% FSC Certified", "Plastic-Free", "Zero Toxic VOC", "Organic GOTS"],
  },
  {
    label: "Care",
    terms: ["Wipe with Damp Cloth", "Hand Wash Only", "Dry Clean", "Natural Wax Care"],
  },
];

function specsFor(product: Product) {
  const tags = (product.tags ?? []).map((tag) => tag.toLowerCase().trim());

  return SPEC_VOCABULARIES.flatMap(({ label, terms }) => {
    const value = terms.find((term) => tags.includes(term.toLowerCase()));
    return value ? [{ label, value }] : [];
  });
}

export function ProductDescription({ product }: { product: Product }) {
  const { minVariantPrice, maxVariantPrice } = product.priceRange;
  const isRange = minVariantPrice.amount !== maxVariantPrice.amount;
  const specs = specsFor(product);

  return (
    <div>
      <Headline as="h1">{product.title}</Headline>

      <p className="ui-mono mt-4 flex items-baseline gap-2">
        {isRange ? <span>from</span> : null}
        <Price
          amount={minVariantPrice.amount}
          currencyCode={minVariantPrice.currencyCode}
        />
        {!product.availableForSale ? (
          <span className="ml-2 opacity-70">· Sold out</span>
        ) : null}
      </p>

      <div className="mt-8">
        <VariantSelector options={product.options} variants={product.variants} />
      </div>

      <div className="mt-6">
        <AddToCart product={product} />
      </div>

      {product.descriptionHtml ? (
        <div className="rule-t mt-8 pt-6">
          <Prose className="body-mono" html={product.descriptionHtml} />
        </div>
      ) : null}

      {specs.length ? (
        <dl className="rule-t mt-8">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="rule-b grid grid-cols-3 items-baseline gap-4 py-3"
            >
              <dt className="spec-mono">{spec.label}</dt>
              <dd className="spec-mono col-span-2">{spec.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
