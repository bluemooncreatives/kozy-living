import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/breadcrumb";
import Plate from "@/components/ui/plate";
import Seal from "@/components/ui/seal";
import ActionButton from "@/components/ui/action-button";
import CircledWord from "@/components/ui/circled-word";
import FounderReel from "@/components/story/founder-reel";
import { Eyebrow, Headline } from "@/components/ui/section";
import { founderImages, foundersNote, kozyStory, site } from "@/lib/site";

/* ---------------------------------------------------------------------------
   /founders-note

   Like `/the-kozy-story`, a designed route standing over the Shopify page of
   the same handle (`pages/founders-note`, linked from the live menu).

   THE ONLY FIRST-PERSON SURFACE ON THE SITE. Everything else is written in
   studio voice, including `studioNote` on /about-us, which says a version of
   this and is signed by the studio. Khushi is also the only named individual
   the brand claims.

   Every photograph on this page is `founderImages` in `@/lib/site` - actual
   stills of Khushi, not studio product photography standing in for a
   portrait. That is also why this page needs no async data fetch, unlike
   `/the-kozy-story`: the set is fixed, not drawn from the live catalogue.

   The letter is a measure, and a measure alone leaves a widescreen half
   empty, so the reading column is paired throughout: the quote card and the
   two frames beside it are the second column, not decoration.
--------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Founder's Note",
  description: `${foundersNote.standfirst} A note from ${site.founder}, founder of ${site.name} - ${site.founderCredential}.`,
  openGraph: { type: "article" },
};

export default function FoundersNotePage() {
  return (
    <>
      <Breadcrumb
        trail={[
          { title: "Home", href: "/" },
          { title: kozyStory.eyebrow, href: "/the-kozy-story" },
        ]}
        current={foundersNote.eyebrow}
      />

      <Masthead />
      <Letter />
      <Welcome />
    </>
  );
}

/* ---------------------------------------------------------------- masthead */

function Masthead() {
  const portrait = founderImages[0];

  return (
    <section aria-labelledby="note" className="shell overflow-x-clip pb-10">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)] lg:gap-14">
        <div data-reveal-group>
          <Eyebrow align="left">{foundersNote.eyebrow}</Eyebrow>
          <Headline as="h1" id="note" className="mt-4">
            {foundersNote.title}
          </Headline>
          <p className="serif mt-6 max-w-measure text-display-md text-pretty">
            {foundersNote.standfirst}
          </p>

          <p className="spec-mono mt-8 border-t border-rule pt-5">
            {site.founder} · {site.founderCredential} ·{" "}
            <a
              href={site.founderInstagramUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60"
            >
              {site.founderInstagram}
            </a>
          </p>
        </div>

        <figure data-reveal className="relative">
          <Plate
            src={portrait.url}
            alt={portrait.alt}
            aspect="4/5"
            tone={0}
            priority
            sizes="(min-width: 1024px) 30vw, 100vw"
            className="lg:max-h-[30rem]"
          />
          <figcaption className="micro-mono mt-3 text-muted">
            {site.founder}, founder
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ letter */

/**
 * The letter itself, set against a ruled margin rather than inside a panel -
 * a page, not another card. Text and quote pair in a two-column row; the
 * reel is its OWN band underneath, at the full width of the section rather
 * than boxed into one column beside a sticky sidebar - the reel is a set
 * piece in its own right, not filler for whatever space the text column
 * happens to leave over.
 */
function Letter() {
  return (
    <section aria-label="The letter" className="pb-14 md:pb-20">
      <div className="shell grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.75fr)] lg:gap-16">
        <div className="letter" data-reveal-group>
          {foundersNote.body.map((paragraph, i) => (
            <p
              key={paragraph}
              className={
                i === 0
                  ? "letter-lede text-pretty"
                  : "body-mono mt-5 text-pretty"
              }
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Italic emphasis lives on Jakarta, which ships a real italic -
            Franxurter has none, and a synthesised one at this size is plain
            to see. Sage-deep rather than sage: 4.77 on the wash, where flat
            sage would be 1.85. */}
        <figure data-reveal className="letter-quote lg:h-max">
          <blockquote>
            <p className="serif text-display-md italic text-sage-deep text-balance">
              {foundersNote.pull}
            </p>
          </blockquote>
          <figcaption className="micro-mono mt-5 text-muted">
            {site.founder}
          </figcaption>
        </figure>
      </div>

      <div data-reveal className="mt-12 md:mt-16">
        <FounderReel />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- welcome */

/**
 * The sign-off. "Kozy Klub" is ringed because it is the one phrase in the
 * letter that is an invitation rather than a statement - and the ellipse is
 * the house gesture for exactly that.
 */
function Welcome() {
  const shot = founderImages[3] ?? founderImages[0];

  return (
    <section aria-labelledby="welcome" className="shell pb-16 md:pb-24">
      <div className="panel relative grid grid-cols-1 items-center gap-10 overflow-hidden px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14 lg:px-14">
        <div>
          <Headline id="welcome" size="xl" split={false}>
            {ringWord(foundersNote.welcome, "Kozy Klub")}
          </Headline>

          <p className="serif mt-10 text-display-md">
            {foundersNote.signature}
          </p>
          <p className="spec-mono mt-1">{foundersNote.signatureRole}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ActionButton
              label={foundersNote.cta.label}
              href={foundersNote.cta.href}
              icon="arrow"
              variant="solid"
            />
            <ActionButton
              label={foundersNote.back.label}
              href={foundersNote.back.href}
              icon="arrow"
            />
          </div>
        </div>

        <div className="relative">
          <Plate
            src={shot.url}
            alt={shot.alt}
            aspect="4/5"
            tone={3}
            sizes="(min-width: 1024px) 32vw, 100vw"
            className="lg:max-h-[24rem]"
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
      <CircledWord>{phrase}</CircledWord>
      {line.slice(at + phrase.length)}
    </>
  );
}
