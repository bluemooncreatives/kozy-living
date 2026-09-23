import Image from "next/image";
import { brandIcons } from "@/components/ui/brand-icons";
import { giTag } from "@/lib/site";
import giTagMark from "../../../public/icons/gi-tag-mark.png";
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
        {/* `leading-[0.9]`, tighter than the `display-xl` token's own 1.02.
            Franxurter's caps are only about 0.72em of its em box, so a line
            height that reads as tight in a grotesk leaves a visible band of
            air between lines here - and a product title routinely runs to
            three. The token stays as it is; this is the one heading on the
            site that is both display-sized AND multi-line in a narrow
            column. */}
        <Headline as="h1" className="flex-1 leading-[0.8]">
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

      {/* ------------------------------------------------------------ price

          The one number a shopper is looking for on this panel, and it was
          set at `text-ui` - 13px, the same size as a caption - so it read as
          metadata rather than as the price. It is now the UI face at
          `display-md`, the largest step that still belongs to Jakarta rather
          than to the display face. */}
      <p className="mt-5 flex items-baseline gap-2">
        {isRange ? <span className="ui-mono text-muted">from</span> : null}
        <Price
          className="serif text-display-md"
          amount={minVariantPrice.amount}
          currencyCode={minVariantPrice.currencyCode}
        />
        {!product.availableForSale ? (
          <span className="ui-mono text-muted">· Sold out</span>
        ) : null}
      </p>

      {/* --------------------------------------------------- the GI mark

          Its own row under the price, and it now SAYS what it is rather than
          hiding the words in a hover tooltip - a mark this small is
          unreadable, and a tooltip is no use at all on a touch screen.

          No panel behind it: it sits straight on the page ground, with a
          hairline doing the separating instead of a fill. The mark is already
          a printed label with its own paper and scalloped edge, so a second
          card behind it read as a box inside a box.

          Everything here is `spec-mono`/`ui-mono` - caption sizes. This is
          provenance, not a heading: it sits UNDER the price and must not
          compete with it. */}
      <div
        data-gi-mark
        className="mt-5 flex items-start gap-3 sm:gap-4"
      >
        {/* A trimmed cut of the artwork, not `/icons/gi-tag.png`. That file
            is a 7.64 MB, 2528x4288 canvas whose badge occupies only the
            middle ~54%, so at any height set here the mark would render
            around half the box and sit off-centre. This one is the same
            artwork trimmed to its ink box (2184x2329) at 299 KB. */}
        <Image
          src={giTagMark}
          alt={giTag.alt}
          className="h-14 w-auto shrink-0 sm:h-[4.25rem]"
        />

        {/* `self-stretch` rather than a fixed height, so the rule always
            matches whichever of the two columns is taller - which flips
            between them as the copy rewraps on a narrow screen. */}
        <span aria-hidden className="w-px shrink-0 self-stretch bg-rule" />

        {/* `min-w-0` or the long note refuses to wrap and pushes the row
            past the panel on a phone. */}
        <div className="min-w-0">
          {/* Title and registration on one line, told apart by weight rather
              than by a separator - a middot here dangles at the start of the
              second line as soon as the pair wraps on a phone. */}
          <p className="ui-mono flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{giTag.title}</span>
            <span className="spec-mono text-ink/70">{giTag.subtitle}</span>
          </p>
          {/* Desktop only. On a phone the buy panel is the whole screen and
              this paragraph pushed the variant picker and Add to Cart below
              the fold - the mark and its two named lines already carry the
              claim, and this is the elaboration. */}
          <p className="spec-mono mt-2 hidden text-pretty sm:block">
            {giTag.note}
          </p>
        </div>
      </div>

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
