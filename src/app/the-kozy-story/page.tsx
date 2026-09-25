import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/breadcrumb";
import Plate from "@/components/ui/plate";
import Seal from "@/components/ui/seal";
import ActionButton from "@/components/ui/action-button";
import CircledWord from "@/components/ui/circled-word";
import WordmarkBand from "@/components/ui/wordmark-band";
import IconMarquee from "@/components/ui/icon-marquee";
import { Eyebrow, Headline } from "@/components/ui/section";
import { splitText } from "@/components/motion/split-text";
import WordCollage from "@/components/story/word-collage";
import ChapterScatter from "@/components/story/chapter-scatter";
import FibreList, { type FibreKompanion } from "@/components/story/fibre-list";
import { imageKey } from "@/lib/shop/gallery";
import { getCollectionProducts, getProduct } from "@/lib/shopify";
import { aboutStory, kozyStory, whyKraft } from "@/lib/site";

/* ---------------------------------------------------------------------------
   /the-kozy-story

   A DESIGNED ROUTE OVER A SHOPIFY PAGE. `pages/the-kozy-story` exists on the
   store and the live menu links to it; a static segment beats the catch-all
   `[page]`, so this file renders instead of that page's body - exactly as
   `/shop-by-colour` does. The copy is `kozyStory` in `@/lib/site`. If the
   merchant ever needs to edit this page from Admin, this route has to go.

   Band order, and what each one is for:

     masthead    the claim, the four stats, one tall frame
     collage     the loudest gesture: ghosted type, scattered tiles, arcs
     wordmark    the bleeding line that ties every landing page together
     scatter     how it is made: four chapters of process photography,
                 hung around their own heading (media in `kozyStory`)
     ticker      the house glyphs
     fibres      the material palette as a list that answers back
     close       the line the whole page exists to arrive at

   Every product photograph on the page is one request's worth of live
   Shopify photography, resolved once in `stills()` and handed down. Two
   bands are the exception, because each of their frames goes with its
   words: the chapters' process photography is fixed per chapter in
   `kozyStory.chapters`, and each fibre is shown in the Kompanion made of
   it (`fibreKompanions()`).
--------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "The Kozy Story",
  description: `${kozyStory.lede} Rooted in Indian craft, krafted from 100% natural fibres with craft clusters across India.`,
  openGraph: { type: "article" },
};

/**
 * Which frames each band draws, as disjoint slices of one list. The bands
 * used to overlap (fibres started at 2, inside the collage's 1-4), so all five
 * fibre photographs were ones the reader had already scrolled past.
 */
const SLOT = { mast: 0, collage: 1, close: 5 } as const;
/**
 * The collage's other three sets - one per line it can switch to - come from
 * the frames past `close`, so the opening set stays disjoint from every other
 * band and the rest only repeat once the store runs out of photographs.
 */
const COLLAGE_EXTRA = 6;
const SHOTS = 18;

/** Photography for the whole page, live where possible. */
async function stills() {
  const products = await getCollectionProducts({
    collection: kozyStory.collection,
  }).catch(() => []);

  // Round-robin across products rather than `galleryFor`'s order, which runs
  // one product's alternates back to back: those are frames from a single
  // shoot, and two of them landed side by side in one band - the same
  // model, same robe, a step apart - which read as a duplicated card.
  const lanes = products.map((product) =>
    [product.featuredImage, ...(product.images ?? [])].filter(
      (image): image is NonNullable<typeof image> => Boolean(image?.url),
    ),
  );
  const depth = Math.max(0, ...lanes.map((lane) => lane.length));
  const live = Array.from({ length: depth }, (_, i) =>
    lanes.flatMap((lane) => (lane[i] ? [lane[i]!] : [])),
  ).flat();

  // `imageKey` rather than the URL: the image fragment's transform renames the
  // file, so the same photograph arrives under two different addresses.
  const seen = new Set<string>();
  const unique = live
    .filter((image) => {
      const key = imageKey(image.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, SHOTS);

  // The page asks for a lot of frames; below a full set the styled stills are
  // the better answer, because a handful of live shots repeated across four
  // bands reads as a store with one product.
  if (unique.length >= 10) {
    return unique.map((image) => ({
      url: image.url,
      alt: image.altText || kozyStory.alt,
    }));
  }

  return aboutStory.pillars.flatMap((pillar) =>
    pillar.images.map((url) => ({ url, alt: pillar.alt })),
  );
}

/**
 * The Kompanion each weave is shown in - the product whose own copy names
 * that fabric (see `kozyStory.fibres`), not the next frame in the pile. A
 * handle that no longer resolves is `null`, and the card shows the weave's
 * name instead of a photograph of some other cloth.
 */
async function fibreKompanions(): Promise<(FibreKompanion | null)[]> {
  return Promise.all(
    kozyStory.fibres.map(async (fibre) => {
      if (!("product" in fibre)) return null;
      const product = await getProduct(fibre.product).catch(() => undefined);
      const image = product?.featuredImage;
      if (!product || !image?.url) return null;

      return {
        title: product.title,
        handle: product.handle,
        image: { url: image.url, alt: image.altText || product.title },
      };
    }),
  );
}

/** Rotates through the set rather than running out. */
const pick = (shots: { url: string; alt: string }[], from: number, count: number) =>
  Array.from({ length: count }, (_, i) => shots[(from + i) % shots.length]!);

export default async function KozyStoryPage() {
  const [shots, kompanions] = await Promise.all([stills(), fibreKompanions()]);

  return (
    <>
      <Breadcrumb current={kozyStory.eyebrow} />
      <Masthead lead={shots[SLOT.mast]} />

      <div className="shell">
        <WordCollage
          sets={[
            pick(shots, SLOT.collage, 4),
            pick(shots, COLLAGE_EXTRA, 4),
            pick(shots, COLLAGE_EXTRA + 4, 4),
            pick(shots, COLLAGE_EXTRA + 8, 4),
          ]}
        />
      </div>

      <section className="shell overflow-x-clip">
        {/* Sized to fit, not at the hero's 18vw. "moments of rest" measures
            7.18em against "kozy living"'s 4.94em, so at the hero size it
            needed ~129vw: the flex row squeezed the seal's box into an oval
            and wrapped "rest" inside its own span, indented under "ments".
            The divisor is that width plus a hair for a desktop scrollbar,
            and the shell's cap (96rem) is the ceiling. */}
        <WordmarkBand
          text={kozyStory.wordmark}
          seal={kozyStory.seal}
          className="pb-10 text-[calc((min(100vw,96rem)-2*var(--gutter))/7.35)] md:pb-14"
        />
      </section>

      <ChapterScatter />

      <section
        aria-label="What every Kompanion carries"
        className="rule-y overflow-x-clip bg-paper py-6 md:py-8"
      >
        <IconMarquee />
      </section>

      <FibreList kompanions={kompanions} />
      <Close shot={pick(shots, SLOT.close, 1)[0]} />
    </>
  );
}

/* ---------------------------------------------------------------- masthead */

/**
 * Centred, not bottom-aligned, and the frame is capped in height: a tall
 * plate beside a short column of copy is what put half a widescreen of empty
 * cream above this headline in the first cut.
 */
function Masthead({ lead }: { lead?: { url: string; alt: string } }) {
  return (
    <section aria-labelledby="story" className="shell overflow-x-clip pb-6">
      <div className="grid grid-cols-1 items-center gap-6 md:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        <div data-reveal-group>
          <Eyebrow align="left">{kozyStory.eyebrow}</Eyebrow>
          <Headline as="h1" id="story" className="mt-4">
            {kozyStory.title}
          </Headline>
          <p className="body-mono mt-6 max-w-measure text-pretty">
            {kozyStory.lede}
          </p>

          {/* The four things the brand actually claims, borrowed from the
              About page so the two pages cannot drift apart. */}
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-rule pt-6 sm:grid-cols-4 lg:mt-10">
            {whyKraft.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="serif text-display-sm">{stat.value}</dt>
                <dd className="micro-mono mt-1 text-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Plate
          src={lead?.url}
          alt={lead?.alt ?? kozyStory.alt}
          aspect="4/5"
          tone={1}
          parallax={40}
          placeholderText="rest"
          priority
          sizes="(min-width: 1024px) 44vw, 100vw"
          className="lg:max-h-[32rem] xl:max-h-[36rem]"
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- close */

/**
 * The closing panel. Sage type on indigo measures 6.50, which is the only
 * ground the ring and the accent are allowed on - on cream this ellipse would
 * be drawn at 1.85 and simply would not be there.
 */
function Close({ shot }: { shot?: { url: string; alt: string } }) {
  const { close } = kozyStory;

  return (
    <section aria-labelledby="close" className="shell pb-16 md:pb-24">
      <div className="panel-ink relative grid grid-cols-1 items-center gap-10 overflow-hidden px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14 lg:px-14">
        <div>
          <Eyebrow align="left">{close.eyebrow}</Eyebrow>
          <h2
            id="close"
            data-split=""
            className="display-face mt-5 text-balance text-display-xl font-normal tracking-[-0.015em] text-paper"
          >
            {/* One balanced run, not a block per line: no line of the copy
                fits this column at display-xl, so each block wrapped on its
                own and stranded "add" and "just do" as one-word lines. */}
            {splitText(ringWord(close.lines.join(" "), close.circled))}
          </h2>
          <p className="body-mono mt-6 max-w-measure text-pretty">
            {close.body}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {/* Sage, not `solid`: the solid pill is indigo, and on this
                indigo panel it vanished to a bare label beside the glass
                one. Indigo on sage measures 6.50, and the well flips to
                indigo so the arrow does not sit sage-on-sage. */}
            <ActionButton
              label={close.primary.label}
              href={close.primary.href}
              icon="arrow"
              variant="solid"
              className="bg-sage text-ink [&_.action-btn-icon]:bg-ink [&_.action-btn-icon]:text-sage"
            />
            <ActionButton
              label={close.secondary.label}
              href={close.secondary.href}
              icon="arrow"
              variant="glass"
            />
          </div>
        </div>

        {/* The second column, so the panel is a composition rather than a
            headline with a field of indigo beside it. The seal is parked on
            the frame's corner - it appears over the hero wordmark, the
            closing CTA and as back-to-top, and nowhere else. */}
        <div className="relative">
          <Plate
            src={shot?.url}
            alt={shot?.alt ?? kozyStory.alt}
            aspect="4/5"
            tone={2}
            placeholderText="kozy"
            sizes="(min-width: 1024px) 34vw, 100vw"
            className="lg:max-h-[26rem]"
          />
          <Seal
            text={kozyStory.seal}
            size="md"
            className="pointer-events-none absolute -bottom-5 -left-5 hidden md:block"
          />
        </div>
      </div>
    </section>
  );
}

/** Wraps the ringed phrase where it sits inside a line. */
function ringWord(line: string, phrase: string) {
  const at = line.indexOf(phrase);
  if (at === -1) return line;

  return (
    <>
      {line.slice(0, at)}
      <CircledWord tone="sage">{phrase}</CircledWord>
      {line.slice(at + phrase.length)}
    </>
  );
}
