import Image from "next/image";
import Link from "next/link";
import { getCollectionProducts, getCollections } from "@/lib/shopify";
import type { Collection, Image as ShopifyImage } from "@/lib/shopify/types";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import { Headline } from "@/components/ui/section";

/**
 * The three collection stories that lead the homepage.
 *
 * Handles, rather than array positions, keep the intended editorial order
 * when Shopify sorts or renames its collections. Any unpublished choice is
 * replaced by the next live collection, so the section never carries a dead
 * card after an Admin change.
 */
const FEATURED_HANDLES = [
  "ritual-kits",
  "kessentials",
  "crafted-by-kozy",
] as const;

const EXCLUDED_HANDLES = new Set(["frontpage"]);

type CollectionCard = {
  collection: Collection;
  image: ShopifyImage | null;
};

function chooseCollections(collections: Collection[]): Collection[] {
  const published = collections.filter(
    (collection) =>
      collection.handle && !EXCLUDED_HANDLES.has(collection.handle),
  );
  const byHandle = new Map(
    published.map((collection) => [collection.handle, collection]),
  );
  const chosen = FEATURED_HANDLES.flatMap((handle) => {
    const collection = byHandle.get(handle);
    return collection ? [collection] : [];
  });
  const chosenHandles = new Set(chosen.map((collection) => collection.handle));

  for (const collection of published) {
    if (chosen.length === 3) break;
    if (!chosenHandles.has(collection.handle)) chosen.push(collection);
  }

  return chosen.slice(0, 3);
}

async function cardFor(collection: Collection): Promise<CollectionCard> {
  if (collection.image) return { collection, image: collection.image };

  // Some older Shopify collections were created without a collection image.
  // Their first product still gives the card a truthful, collection-owned
  // photograph instead of a hard-coded marketing asset that can go stale.
  const products = await getCollectionProducts({
    collection: collection.handle,
  }).catch(() => []);

  return {
    collection,
    image: products.find((product) => product.featuredImage)?.featuredImage ?? null,
  };
}

export default async function CollectionShowcase() {
  const collections = await getCollections().catch(() => []);
  const selected = chooseCollections(collections);
  if (!selected.length) return null;

  const cards = await Promise.all(selected.map(cardFor));

  return (
    <section
      aria-labelledby="collection-showcase-title"
      className="shell py-10 md:py-14"
    >
      <div className="mb-7 flex items-end justify-between gap-6 md:mb-10">
        <Headline as="h2" id="collection-showcase-title" size="lg">
          Find Your Kozy Ritual
        </Headline>
        <p className="eyebrow hidden pb-1 text-sage-deep md:block">
          Rooted in rituals
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map(({ collection, image }, index) => (
          <li key={collection.handle}>
            <Link
              href={collection.path}
              prefetch={false}
              className="group relative block aspect-[9/10] overflow-hidden rounded-plate bg-tint outline-none ring-ink/30 focus-visible:ring-2"
            >
              {image ? (
                <Image
                  src={image.url}
                  alt={image.altText || collection.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.035]"
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-end overflow-hidden bg-[linear-gradient(145deg,#F0E7D9,#D4BE9D)] p-6 font-display text-[18vw] leading-[0.72] text-ink/10 md:text-[7vw]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}

              <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25 opacity-70 transition-opacity duration-500 group-hover:opacity-90" />

              <span className="absolute left-4 top-4 max-w-[calc(100%-5rem)] bg-paper px-4 py-3 font-display text-base font-bold leading-tight text-ink shadow-sm sm:left-5 sm:top-5 sm:text-lg">
                {collection.title}
              </span>

              <span className="arrow-btn absolute bottom-4 right-4 h-10 w-10 border border-white/50 bg-paper text-ink shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 sm:bottom-5 sm:right-5">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CollectionShowcaseFallback() {
  return (
    <section className="shell py-10 md:py-14" aria-hidden>
      <div className="mb-7 h-9 w-64 animate-pulse rounded bg-wash md:mb-10" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[9/10] animate-pulse rounded-plate bg-wash"
          />
        ))}
      </div>
    </section>
  );
}
