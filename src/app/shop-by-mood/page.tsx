import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Grid from "@/components/grid";
import ProductCard from "@/components/product-card";
import MoodIndex, { type IndexMood } from "@/components/shop/mood-index";
import { splitText } from "@/components/motion/split-text";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import CircledWord from "@/components/ui/circled-word";
import { displayFace } from "@/components/ui/section";
import { toParamMap, type ShopSearchParams } from "@/lib/shop/filters";
import {
  MOOD_PARAM,
  MOOD_RESULTS_ANCHOR,
  moodEntries,
  moodHref,
} from "@/lib/shop/moods";
import { getCatalog, getMoods } from "@/lib/shopify";
import { shopByMood as copy } from "@/lib/site";

/* ---------------------------------------------------------------------------
   Shop by mood

   The sibling of /shop-by-colour, built on the same contract - read the note
   at the top of that page first. In short:

     Step 1   the schedule - the `shop_mood` metaobjects as an accordion
     Step 2   the Kompanions tagged with the chosen mood, as cards

   ONE MOOD AT A TIME, every choice a plain link, the address is the state:

     /shop-by-mood                          the schedule, nothing below it
     /shop-by-mood?mood=caffeine-ritual     one mood's Kompanions

   Step two starts empty for the same reason colour's does: this page answers
   "what is there for this moment", and until a moment is chosen there is no
   question. Sort, facets and pagination live at /search, deliberately not here.

   Where colour draws a coil, a mood has only words - a name and a line the
   merchant wrote - so the schedule is TYPOGRAPHIC, with the mood's own
   photography wiping in beside it. See `mood-index.tsx`.

   Everything in step two mounts after a click, so it enters on CSS
   (`.mood-turn`, `.mood-card-in`), keyed on the mood so a turn replays it. A
   `data-reveal` there would mount after its scroll trigger had fired.
--------------------------------------------------------------------------- */

/** Four columns at the widest - the same cell size as the shop grid. */
const GRID_SIZES =
  "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw";

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
};

const pad = (value: number) => String(value).padStart(2, "0");

/** Wraps the ringed phrase where it sits in the headline. */
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

export default async function ShopByMoodPage({
  searchParams,
}: {
  searchParams?: Promise<ShopSearchParams>;
}) {
  const params = toParamMap((await searchParams) ?? {});

  const [catalog, moods] = await Promise.all([getCatalog(), getMoods()]);
  const { entries, membership } = moodEntries(moods, catalog);

  /**
   * The chosen mood, or none. Only ever ONE, even if the URL names several - a
   * hand-edited link resolves to its first live mood rather than 404ing, and a
   * mood with nothing in it cannot be chosen at all.
   */
  const requested = (params.get(MOOD_PARAM) ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  const selected =
    entries.find((entry) => entry.count > 0 && requested.includes(entry.key)) ??
    null;

  const index: IndexMood[] = entries.map((entry) => ({
    key: entry.key,
    label: entry.label,
    description: entry.description,
    count: entry.count,
    href: moodHref(entry.key),
    images: entry.images.map((image) => ({
      url: image.url,
      altText: image.altText,
    })),
  }));

  const matched = selected
    ? catalog.filter((product) => membership.get(product.id)?.has(selected.key))
    : [];

  // Previous / next walk the LIVE moods only, wrapping at either end, so the
  // results header can be paged through like a book without dead stops.
  const live = entries.filter((entry) => entry.count > 0);
  const at = selected ? live.findIndex((entry) => entry.key === selected.key) : -1;
  const previous = at >= 0 && live.length > 1 ? live[(at - 1 + live.length) % live.length] : null;
  const next = at >= 0 && live.length > 1 ? live[(at + 1) % live.length] : null;
  const position = selected ? entries.indexOf(selected) + 1 : 0;

  const intro = (
    <>
      <p data-reveal="" className="mood-badge">
        <span className="mood-badge-num tabular-nums" aria-hidden>
          {pad(entries.length)}
        </span>
        <span className="mood-badge-label">{copy.eyebrow}</span>
      </p>

      {/* Set by hand rather than through `Headline`: the kicker line and the
          column it has to fit want their own size, and a size utility passed
          alongside `text-display-xl` would race it in the stylesheet. */}
      <h1 data-split="" className={`${displayFace} mood-title text-balance`}>
        {/* Keyed: the splitter hands these two back as an array. */}
        {splitText(
          <>
            <span key="kicker" className="block text-sage-deep">
              {copy.kicker}
            </span>
            <span key="line">{ringWord(copy.headline, copy.ring)}</span>
          </>,
        )}
      </h1>

      <p data-reveal="" className="body-mono mt-5 max-w-[34rem] text-pretty md:mt-6">
        {copy.lede}
      </p>
    </>
  );

  return (
    <>
      <section
        id="moods"
        className="shell scroll-mt-[var(--header-h)] pb-10 pt-8 md:pb-14 md:pt-12"
      >
        {index.length ? (
          <MoodIndex
            moods={index}
            selectedKey={selected?.key ?? null}
            clearHref={moodHref(null)}
            resultsAnchor={MOOD_RESULTS_ANCHOR}
            intro={intro}
            copy={{
              label: copy.indexLabel,
              comingSoon: copy.comingSoon,
              view: copy.index.view,
              showing: copy.index.showing,
              clear: copy.index.clear,
              preview: copy.index.preview,
              browseAll: copy.browseAll,
            }}
          />
        ) : (
          <>
            {intro}
            <p className="ui-mono mt-10 text-muted">
              {copy.noMoods}{" "}
              <Link
                href="/search"
                className="underline decoration-1 underline-offset-4 hover:text-ink"
              >
                {copy.browseAll}
              </Link>
              .
            </p>
          </>
        )}
      </section>

      {/* Step two. `scroll-mt` clears the sticky header, so a mood's fragment
          lands on its masthead rather than under the navigation. */}
      <section
        id={MOOD_RESULTS_ANCHOR}
        className="shell scroll-mt-[calc(var(--header-h)+0.75rem)] pb-14 pt-6 md:pb-20 md:pt-8"
      >
        {selected ? (
          <>
            {/* Keyed on the mood so it re-mounts, and plays its CSS entrance,
                on every turn. */}
            <header key={selected.key} className="mood-turn mood-results-head">
              <div className="mood-results-badge">
                <span className="mood-badge-num tabular-nums" aria-hidden>
                  {pad(position)}
                </span>
                <span className="mood-badge-label tabular-nums">
                  {copy.results.eyebrow} {pad(position)}
                  <span className="text-muted"> / {pad(entries.length)}</span>
                </span>
              </div>

              <nav aria-label="Moods" className="mood-results-nav">
                {previous ? (
                  <Link
                    href={moodHref(previous.key)}
                    prefetch={false}
                    className="mood-step"
                    aria-label={`${copy.results.previous}: ${previous.label}`}
                  >
                    <ArrowUpRight className="-rotate-[135deg]" />
                  </Link>
                ) : null}
                {next ? (
                  <Link
                    href={moodHref(next.key)}
                    prefetch={false}
                    className="mood-step"
                    aria-label={`${copy.results.next}: ${next.label}`}
                  >
                    <ArrowUpRight className="rotate-45" />
                  </Link>
                ) : null}
                <Link href={moodHref(null)} prefetch={false} className="mood-clear">
                  <XMarkIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {copy.results.clear}
                </Link>
              </nav>

              <h2 className="mood-results-title display-face text-ink">
                {splitText(selected.label)}
                <sup className="count-sup text-sage-deep" aria-hidden>
                  {matched.length}
                </sup>
              </h2>

              {selected.description ? (
                <p className="mood-results-desc body-mono text-pretty">
                  {selected.description}
                </p>
              ) : null}

              <span aria-hidden className="mood-results-rule" />
            </header>

            <Grid
              key={`grid-${selected.key}`}
              className="mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:mt-8"
            >
              {matched.map((product, i) => (
                <Grid.Item
                  key={product.handle}
                  className="mood-card-in"
                  style={{ "--i": i } as CSSProperties}
                >
                  <ProductCard
                    product={product}
                    priority={i < 4}
                    sizes={GRID_SIZES}
                    reveal={false}
                  />
                </Grid.Item>
              ))}
            </Grid>
          </>
        ) : (
          <div className="mood-rest">
            {/* Where the cards will gather - four ghost cells breathing, so
                the empty step reads as a place waiting rather than a gap. */}
            <ul aria-hidden className="mood-rest-ghosts">
              {[0, 1, 2, 3].map((cell) => (
                <li key={cell} style={{ "--i": cell } as CSSProperties} />
              ))}
            </ul>

            <div className="mood-rest-copy">
              <div className="mood-rest-card">
                <a href="#moods" className="mood-rest-up" aria-label={copy.resting.back}>
                  <ArrowUpIcon className="h-4 w-4" strokeWidth={2} />
                </a>
                <p className="serif mt-5 text-display-md text-balance">
                  {copy.resting.title}
                </p>
                <p className="body-mono mx-auto mt-3 max-w-measure">
                  {copy.resting.body}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
