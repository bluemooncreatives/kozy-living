import clsx from "clsx";
import Link from "next/link";
import { getCollectionProducts } from "@/lib/shopify";
import type { Image as ShopifyImage, Product } from "@/lib/shopify/types";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import { Headline } from "@/components/ui/section";
import ProductImageRotator from "@/components/ui/product-image-rotator";

/**
 * Search-led stories. These point at the same browsable shop routes the nav
 * uses, while borrowing live product photography from each matching collection.
 */
const STORIES = [
  {
    title: "Bathrobes",
    handle: "bathrobes",
    href: "/search/bathrobes",
    copy: "Soft layers for slow mornings, long evenings and everything in between.",
  },
  {
    title: "Dabu Printed Pillows",
    handle: "dabu-printed-pillows",
    href: "/search/dabu-printed-pillows",
    copy: "Handcrafted patterns that bring a quiet, artful mood to your corners.",
  },
  {
    title: "Pet & Parent",
    handle: "pet-parent",
    href: "/search/pet-parent",
    copy: "Matching comfort made for shared rituals with your little companion.",
  },
  {
    title: "Pet Collection",
    handle: "pet-collection",
    href: "/search/pet-collection",
    copy: "Everyday Kozy pieces for the pets who make a house feel more like home.",
  },
] as const;

const GRID =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[20rem_20rem] xl:grid-rows-[23rem_23rem]";
const CELL = [
  "sm:col-span-2 lg:col-span-1 lg:row-span-2",
  "",
  "",
  "sm:col-span-2 lg:col-start-2",
];
type CollectionCard = {
  story: (typeof STORIES)[number];
  images: ShopifyImage[];
};

function uniqueProductImages(products: Product[]): ShopifyImage[] {
  const images = new Map<string, ShopifyImage>();

  for (const product of products) {
    const gallery = [product.featuredImage, ...(product.images ?? [])].filter(
      Boolean,
    ) as ShopifyImage[];

    for (const image of gallery) {
      if (image.url && !images.has(image.url)) images.set(image.url, image);
      if (images.size >= 6) return Array.from(images.values());
    }
  }

  return Array.from(images.values());
}

async function cardFor(
  story: (typeof STORIES)[number],
): Promise<CollectionCard> {
  const products = await getCollectionProducts({
    collection: story.handle,
  }).catch(() => []);
  return {
    story,
    images: uniqueProductImages(products),
  };
}

export default async function CollectionShowcase() {
  const cards = await Promise.all(STORIES.map(cardFor));

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

      <ul className={GRID}>
        {cards.map(({ story, images }, index) => (
          <li key={story.handle} className={clsx("min-w-0", CELL[index])}>
            <Link
              href={story.href}
              prefetch={false}
              className={clsx(
                "collection-story group relative isolate block h-full min-w-0 overflow-hidden rounded-plate bg-ink text-paper outline-none ring-ink/40 focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-paper",
                index === 0
                  ? "min-h-[32rem] sm:min-h-[36rem] lg:min-h-0"
                  : "min-h-[25rem] lg:min-h-0",
              )}
            >
              <div
                className={clsx(
                  "relative z-10 p-6 pb-24 md:p-7",
                  index === 3 && "sm:max-w-[60%]",
                )}
              >
                <h3 className="font-display max-w-sm text-[1.35rem] font-normal leading-tight !text-paper md:text-[1.65rem]">
                  {story.title}
                </h3>
                <p
                  className={clsx(
                    "mt-4 max-w-sm text-sm leading-relaxed",
                    "text-paper/90",
                  )}
                >
                  {story.copy}
                </p>
              </div>

              <div className="absolute inset-0 -z-10 overflow-hidden">
                {images.length ? (
                  <ProductImageRotator
                    images={images}
                    sizes={
                      index === 3
                        ? "(min-width: 1024px) 66vw, 100vw"
                        : index === 0
                          ? "(min-width: 1024px) 33vw, 100vw"
                          : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    }
                    className="collection-story-image object-cover"
                    delay={index * 550}
                    interval={3800}
                    showIndicators={false}
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-[linear-gradient(145deg,#F0E7D9,#D4BE9D)]"
                  />
                )}
              </div>
              <span
                aria-hidden
                className="collection-story-shade pointer-events-none absolute inset-0 -z-10"
              />
              <span
                aria-hidden
                className="collection-story-arrow arrow-btn absolute bottom-5 right-5 h-11 w-11 border border-white/50 bg-paper text-ink shadow-sm md:bottom-6 md:right-6"
              >
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
      <div className={GRID}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              "min-h-[24rem] animate-pulse rounded-plate bg-wash lg:min-h-0",
              CELL[index],
            )}
          />
        ))}
      </div>
    </section>
  );
}
