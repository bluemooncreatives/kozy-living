import Link from "next/link";
import type { Metadata } from "next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Grid from "@/components/grid";
import ProductGridItems from "@/components/layout/product-grid-items";
import MoodIndex, { type IndexMood } from "@/components/shop/mood-index";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import CircledWord from "@/components/ui/circled-word";
import { Eyebrow, Headline } from "@/components/ui/section";
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

     Step 1   the index - the `shop_mood` metaobjects, one numbered row each
     Step 2   the Kompanions tagged with the chosen mood, as cards

   ONE MOOD AT A TIME, every choice a plain link, the address is the state:

     /shop-by-mood                          the index, nothing below it
     /shop-by-mood?mood=caffeine-ritual     one mood's Kompanions

   Step two starts empty for the same reason colour's does: this page answers
   "what is there for this moment", and until a moment is chosen there is no
   question. Sort, facets and pagination live at /search, deliberately not here.

   Where colour draws a coil, a mood has only words - a name and a line the
   merchant wrote - so the index is TYPOGRAPHIC: numbered Franxurter rows, with
   the mood's own photography turning beside them. See `mood-index.tsx`.
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
    active: entry.key === selected?.key,
    href: moodHref(entry.key === selected?.key ? null : entry.key),
    image: entry.images[0]
      ? { url: entry.images[0].url, altText: entry.images[0].altText }
      : null,
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

  return (
    <>
      <section
        id="moods"
        className="shell scroll-mt-[var(--header-h)] pb-6 pt-8 md:pt-12"
      >
        <div className="grid gap-y-6 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          <div className="lg:col-span-8">
            <Eyebrow align="left">{copy.eyebrow}</Eyebrow>
            <Headline as="h1" className="mt-4">
              {ringWord(copy.headline, copy.ring)}
            </Headline>
          </div>
          <p
            data-reveal=""
            className="body-mono max-w-measure text-pretty lg:col-span-4 lg:pb-2"
          >
            {copy.lede}
          </p>
        </div>

        <div className="mt-10 md:mt-16">
          {index.length ? (
            <MoodIndex
              moods={index}
              label={copy.indexLabel}
              comingSoon={copy.comingSoon}
            />
          ) : (
            <p className="ui-mono text-muted">
              {copy.noMoods}{" "}
              <Link
                href="/search"
                className="underline decoration-1 underline-offset-4 hover:text-ink"
              >
                {copy.browseAll}
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* Step two. `scroll-mt` clears the sticky header, so a mood's fragment
          lands on its masthead rather than under the navigation. */}
      <section
        id={MOOD_RESULTS_ANCHOR}
        className="shell scroll-mt-[calc(var(--header-h)+0.75rem)] pb-14 pt-10 md:pb-20 md:pt-14"
      >
        {selected ? (
          <>
            {/* Keyed on the mood so it re-mounts, and plays its CSS entrance,
                on every turn. A `data-reveal` here would mount after its
                scroll trigger had already fired and sit at opacity 0. */}
            <header
              key={selected.key}
              className="mood-turn panel-ink relative overflow-hidden px-5 py-9 sm:px-8 md:px-12 md:py-14"
            >
              <span aria-hidden className="mood-ghost-num display-face">
                {pad(position)}
              </span>

              <div className="relative grid gap-8 md:grid-cols-12 md:items-end">
                <div className="md:col-span-8">
                  <p className="eyebrow tabular-nums">
                    {copy.results.eyebrow} {pad(position)}
                    <span className="text-sage"> / {pad(entries.length)}</span>
                  </p>
                  <h2 className="display-face mt-4 text-display-xl text-balance text-oat">
                    {selected.label}
                    <sup className="count-sup text-sage" aria-hidden>
                      {matched.length}
                    </sup>
                  </h2>
                  {selected.description ? (
                    <p className="mt-4 max-w-measure text-pretty text-body text-paper/75 md:text-lg">
                      {selected.description}
                    </p>
                  ) : null}
                </div>

                <nav
                  aria-label="Moods"
                  className="flex flex-wrap items-center gap-3 md:col-span-4 md:justify-end"
                >
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
                  <Link
                    href={moodHref(null)}
                    prefetch={false}
                    className="mood-clear"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                    {copy.results.clear}
                  </Link>
                </nav>
              </div>
            </header>

            <Grid className="mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <ProductGridItems products={matched} sizes={GRID_SIZES} />
            </Grid>
          </>
        ) : (
          <div className="rule-t pt-10 text-center">
            <p className="serif text-display-md text-balance">
              {copy.resting.title}
            </p>
            <p className="body-mono mx-auto mt-4 max-w-measure">
              {copy.resting.body}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
