import Image from "@/components/ui/shop-image";
import { Eyebrow, Headline } from "@/components/ui/section";
import { kozyStory } from "@/lib/site";
import ChapterVideo from "./chapter-video";

/**
 * How a Kompanion is made, in four chapters scattered around the section's
 * own heading. Each chapter carries its own photograph (or clip) in
 * `kozyStory.chapters` - process photography that goes with its words, not
 * product frames borrowed from a collection, which is what this band showed
 * before it had a subject.
 *
 * The heading sits INSIDE the cluster rather than above it, and each card
 * carries its kicker as a pill laid over the photograph. That is what stops
 * an editorial page from being a column of paragraphs with a field of cream
 * beside it - the reason this replaced the sticky-thread version.
 *
 * The scatter is a twelve-column map at lg, not a pile of margins: each card
 * names its own columns and rows in `.scatter`, so the layout is legible
 * there rather than emergent from four different `mt-` values. Below lg the
 * cards stack in reading order, which is also their DOM order - the numerals
 * stay meaningful either way.
 *
 * NO CARD IS A LINK, AND NOTHING ON ONE SAYS IT IS. The chapters are prose,
 * not destinations. The pill used to carry an up-right arrow and invert on
 * hover - the site's own "this goes somewhere" signals - on a card that went
 * nowhere, which is worse than a card that does not look clickable at all.
 */
export default function ChapterScatter() {
  const { chapters } = kozyStory;

  return (
    <section aria-labelledby="chapters" className="shell scatter">
      <div className="scatter-intro">
        {/* Centred with the heading at lg, where the intro is the middle of
            the cluster; flush left below it, with everything else. */}
        <Eyebrow align="left" className="lg:justify-center">
          {kozyStory.chaptersEyebrow}
        </Eyebrow>
        <Headline id="chapters" size="lg" className="mt-4">
          {/* Keyed because `splitText` maps the heading's children as an
              array, and an unkeyed element inside one is a React warning. */}
          <span key="glyph" aria-hidden className="scatter-glyph">
            ✳
          </span>{" "}
          {kozyStory.chaptersTitle}
        </Headline>
      </div>

      {chapters.map((chapter, i) => {
        const { media } = chapter;

        return (
          <article key={chapter.index} className={`scatter-card card-${i + 1}`}>
            <div className="scatter-frame">
              {media.type === "video" ? (
                <ChapterVideo
                  src={media.url}
                  poster={media.poster}
                  label={media.alt}
                />
              ) : (
                <Image
                  src={media.url}
                  alt={media.alt}
                  fill
                  sizes="(min-width: 1280px) 24vw, (min-width: 640px) 45vw, 92vw"
                  className="scatter-photo"
                />
              )}

              <p className="scatter-pill">{chapter.kicker}</p>

              <span aria-hidden className="scatter-index">
                {chapter.index}
              </span>
            </div>

            <h3 className="serif mt-4 text-display-sm text-balance">
              {chapter.title}
            </h3>
            <p className="scatter-body body-mono mt-2 text-pretty">
              <span aria-hidden className="scatter-bullet">
                ●
              </span>
              {chapter.body}
            </p>
          </article>
        );
      })}
    </section>
  );
}
