import { getCollectionProducts, getCollections } from "@/lib/shopify";
import { galleryFor } from "@/lib/shop/gallery";
import { aboutStory } from "@/lib/site";
import StoryBoard, { type StoryCard } from "./story-board";

/**
 * The About band on the homepage - the brand speaking for itself, between the
 * icon ticker and the studio quote.
 *
 * DYNAMIC IN BOTH DIRECTIONS. The copy is `aboutStory` in `@/lib/site`, so the
 * voice is revised in one file; the photography and the destinations come from
 * Shopify, so a card follows the shop rather than a hard-coded list of URLs.
 *
 * Each pillar names a collection handle, which does two jobs:
 *
 *   PHOTOGRAPHY  the card borrows that collection's own product shots, and
 *                falls back to the studio stills in the config when the
 *                collection is empty or missing.
 *   DESTINATION  the card links into `/search/<handle>` only when the handle
 *                is actually on the store. This storefront 404s an unknown
 *                collection, so an aspirational handle would otherwise ship a
 *                dead link the day someone renamed it in Shopify.
 *
 * Every fetch is individually caught. A Storefront API outage costs this band
 * its live photography, never the section.
 */

export default async function StoryBand() {
  const live = new Set(
    (await getCollections().catch(() => [])).map(
      (collection) => collection.handle,
    ),
  );

  const cards: StoryCard[] = await Promise.all(
    aboutStory.pillars.map(async (pillar) => {
      const products = pillar.collection
        ? await getCollectionProducts({ collection: pillar.collection }).catch(
            () => [],
          )
        : [];

      const shot = galleryFor(products);
      // Two is the floor: one photograph does not rotate, and a single live
      // shot beside three styled stills is a worse card than the stills.
      const images =
        shot.length >= 2
          ? shot.map((image) => ({
              url: image.url,
              altText: image.altText || pillar.alt,
            }))
          : pillar.images.map((url) => ({ url, altText: pillar.alt }));

      return {
        index: pillar.index,
        kicker: pillar.kicker,
        lede: { lead: pillar.lede.lead, accent: pillar.lede.accent },
        body: pillar.body,
        cta: pillar.cta,
        href:
          pillar.collection && live.has(pillar.collection)
            ? `/search/${pillar.collection}`
            : pillar.href,
        alt: pillar.alt,
        images,
      };
    }),
  );

  return (
    <section
      aria-labelledby="home-story"
      className="shell overflow-x-clip py-12 md:py-16"
    >
      <StoryBoard cards={cards} />
    </section>
  );
}

/**
 * Streamed placeholder. It holds the band's real geometry - meter row, copy
 * column, two cards - so the page below does not jump when the Shopify call
 * resolves.
 */
export function StoryBandFallback() {
  return (
    <section aria-hidden className="shell py-12 md:py-16">
      <div className="story-grid">
        <div className="story-meter flex items-center gap-4">
          <span className="h-10 w-10 animate-pulse rounded-full bg-wash" />
          <span className="h-px flex-1 bg-rule" />
          <span className="h-10 w-24 animate-pulse rounded-chip bg-wash" />
        </div>

        <div className="story-copy">
          <div className="h-4 w-28 animate-pulse rounded-chip bg-wash" />
          <div className="mt-5 h-10 w-full max-w-md animate-pulse rounded bg-wash" />
          <div className="mt-3 h-10 w-3/4 max-w-sm animate-pulse rounded bg-wash" />
          <div className="mt-6 h-16 w-full max-w-measure animate-pulse rounded bg-wash" />
        </div>

        <div className="story-rail-area flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              /* Mirrors the live cell shape in `story-board.tsx` - if that
                 changes, this has to move with it or the band jumps when the
                 Shopify call resolves. */
              className="aspect-[2/3] min-h-[24rem] w-[80%] shrink-0 animate-pulse rounded-plate bg-wash sm:w-[58%] md:w-[52%] lg:aspect-auto lg:h-[31rem] lg:min-h-0 xl:h-[35rem]"
            />
          ))}
        </div>

        <div className="story-nav flex items-center gap-2.5">
          <span className="h-10 w-10 animate-pulse rounded-full bg-wash" />
          <span className="h-10 w-10 animate-pulse rounded-full bg-wash" />
        </div>
      </div>
    </section>
  );
}
