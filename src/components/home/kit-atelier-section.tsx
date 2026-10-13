import KitAtelier from "@/components/home/kit-atelier";
import CircledWord from "@/components/ui/circled-word";
import { Eyebrow, Headline } from "@/components/ui/section";
import { getKitBuilder } from "@/lib/shopify";
import { kitAtelier as copy } from "@/lib/site";

/**
 * The Kustom kit, on the homepage, on the page's own cream, after Shop by mood and
 * the ticker that follows it. By then the shelves and the moods have shown
 * what the Kompanions are, and this is where a set of them is made your own
 * (the owner's call, 2026-10-13).
 *
 * Server half: reads the kit and frames it. The kit is merchant data; when
 * the builder rests - no settings, a container that cannot be sold, or no
 * pieces - the section is simply not there. A homepage must not advertise a
 * builder that would turn the shopper away at the last step (`addKitItem`
 * refuses all three).
 */
export default async function KitAtelierSection() {
  const kit = await getKitBuilder().catch(() => null);
  if (!kit || !kit.containerAvailable || !kit.pieces.length) return null;

  const at = copy.title.indexOf(copy.circled);

  return (
    <section
      id="kustom-kit"
      aria-labelledby="kit-atelier-title"
      className="shell relative scroll-mt-[var(--header-h)] overflow-x-clip py-14 md:py-20"
    >
      {/* The section's watermark: the K word, bled off the corner at 4%. */}
      <span
        aria-hidden
        className="display-face pointer-events-none absolute -right-[0.04em] bottom-0 select-none text-[clamp(6rem,24vw,22rem)] leading-[0.8] text-ink/[0.04]"
      >
        kustom
      </span>

      <div className="relative grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
        <div data-reveal-group className="lg:col-span-7">
          <Eyebrow align="left">{copy.eyebrow}</Eyebrow>
          <Headline id="kit-atelier-title" className="mt-4">
            {at === -1 ? (
              copy.title
            ) : (
              <>
                {copy.title.slice(0, at)}
                <CircledWord>{copy.circled}</CircledWord>
                {copy.title.slice(at + copy.circled.length)}
              </>
            )}
          </Headline>
        </div>
        <p
          data-reveal
          className="body-mono max-w-measure text-pretty lg:col-span-5 lg:pb-2"
        >
          {copy.intro}
        </p>
      </div>

      <div data-reveal className="relative mt-10 md:mt-14">
        <KitAtelier kit={kit} />
      </div>
    </section>
  );
}

/** Holds the section's place while the kit streams, so the page does not jump. */
export function KitAtelierFallback() {
  return (
    <div className="shell py-6 md:py-10" aria-hidden>
      <div className="min-h-[56rem] animate-pulse rounded-plate bg-wash lg:min-h-[48rem]" />
    </div>
  );
}
