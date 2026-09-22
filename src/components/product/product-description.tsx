import Image from "next/image";
import { brandIcons } from "@/components/ui/brand-icons";
import { Product } from "@/lib/shopify/types";
import Price from "../price";
import VariantSelector from "./variant-selector";
import Prose from "../prose";
import { AddToCart } from "../cart/add-to-cart";
import { Headline } from "../ui/section";

/** Collection handle marking products carried in both pet and matching-parent versions. */
const PET_PARENT_COLLECTION_HANDLE = "pet-parent";
/** Collection handle marking pet-only products (no matching parent piece). */
const PET_COLLECTION_HANDLE = "pet-collection";
/** Collection handle for the in-house craft line. */
const KRAFTED_BY_KOZY_COLLECTION_HANDLE = "crafted-by-kozy";

/**
 * One box for every badge, sized so a two-badge cluster still leaves the
 * headline room: the buy panel is only ~509px wide at the breakpoint where the
 * grid splits, and the title already wraps to four lines there. The per-glyph
 * scale that keeps the badges level comes from `brandIcons`.
 */
const BADGE_ICON_CLASS =
  "h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14 md:h-16 md:w-16";

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
  const handles = new Set(
    product.collections.map((collection) => collection.handle)
  );
  const collectionIcon = handles.has(PET_PARENT_COLLECTION_HANDLE)
    ? brandIcons.petParent
    : handles.has(PET_COLLECTION_HANDLE)
      ? brandIcons.pet
      : handles.has(KRAFTED_BY_KOZY_COLLECTION_HANDLE)
        ? brandIcons.krafted
        : null;
  // the eco mark rides on every product, so it joins any collection mark
  const badges = collectionIcon
    ? [collectionIcon, brandIcons.eco]
    : [brandIcons.eco];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Headline as="h1" className="flex-1">
          {product.title}
        </Headline>
        <div className="flex shrink-0 items-start gap-1">
          {badges.map((badge) => (
            <span
              key={badge.alt}
              tabIndex={0}
              className="group/badge relative inline-flex focus:outline-none"
            >
              <Image
                src={badge.src}
                alt={badge.alt}
                className={`${BADGE_ICON_CLASS} ${badge.scale}`}
              />
              <span
                role="tooltip"
                className="chip pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap opacity-0 shadow-chip transition-opacity duration-150 group-hover/badge:opacity-100 group-focus/badge:opacity-100"
              >
                {badge.alt}
              </span>
            </span>
          ))}
        </div>
      </div>

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
