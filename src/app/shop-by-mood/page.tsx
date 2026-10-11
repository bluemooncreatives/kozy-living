import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import Grid from "@/components/grid";
import ProductCard from "@/components/product-card";
import MoodIndex, { type IndexMood } from "@/components/shop/mood-index";
import PagedShelf from "@/components/shop/paged-shelf";
import Pagination from "@/components/shop/pagination";
import {
  MoodClear,
  MoodNext,
  MoodResults,
  MoodShop,
  MoodSwitcher,
} from "@/components/shop/mood-shop";
import { splitText } from "@/components/motion/split-text";
import CircledWord from "@/components/ui/circled-word";
import { displayFace } from "@/components/ui/section";
import {
  paginate,
  readPage,
  SHELF_PER_PAGE,
  SHELF_PER_PAGE_MOBILE,
  toParamMap,
  type ShopSearchParams,
} from "@/lib/shop/filters";
import { isMobileRequest } from "@/lib/shop/viewport";
import {
  MOOD_PARAM,
  MOOD_RESULTS_ANCHOR,
  moodEntries,
  moodHref,
} from "@/lib/shop/moods";
import { getCatalog, getMoods } from "@/lib/shopify";
import { shelfPaging, shopByMood as copy } from "@/lib/site";

/* ---------------------------------------------------------------------------
   Shop by mood

   The sibling of /shop-by-colour, built on the same contract - read the note
   at the top of that page first. In short:

     Step 1   the list - the `shop_mood` metaobjects, one row each
     Step 2   the Kompanions tagged with the chosen mood, as cards

   ONE MOOD AT A TIME, every choice a plain link, the address is the state:

     /shop-by-mood                          the list, nothing below it
     /shop-by-mood?mood=caffeine-ritual     one mood's Kompanions

   Step two starts empty for the same reason colour's does: this page answers
   "what is there for this moment", and until a moment is chosen there is no
   question. Sort, facets and pagination live at /search, deliberately not here.

   The page says its own two steps out loud - "1 Pick a mood" over the list,
   "2" over the shelf - and once a mood is chosen the shelf carries a sticky
   chip rail for switching, pages 12 at a time (6 on a phone - see
   `SHELF_PER_PAGE`), and on its last page hands on to the next mood.

     /shop-by-mood?mood=caffeine-ritual&page=2    page 1 is never written The
   client half (`MoodShop`) only bridges the click and the server's answer;
   see `components/shop/mood-shop.tsx`.

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

  const perPage = (await isMobileRequest(params))
    ? SHELF_PER_PAGE_MOBILE
    : SHELF_PER_PAGE;
  const shelf = paginate(matched, readPage(params), perPage);

  // One shelf page, one address - the shop's rule. `page=1`, `page=0`, a page
  // past the end (a link shared from a phone, opened on a laptop, where the
  // pages are twice the size), or a page with no mood chosen all redirect to
  // the URL that page actually lives at.
  const canonicalPage = selected && shelf.page > 1 ? String(shelf.page) : undefined;
  if ((params.get("page") ?? undefined) !== canonicalPage) {
    redirect(moodHref(selected?.key ?? null, shelf.page));
  }

  // The next LIVE mood, wrapping, so the end of every shelf leads somewhere.
  const live = index.filter((entry) => entry.count > 0);
  const at = selected ? live.findIndex((entry) => entry.key === selected.key) : -1;
  const next = at >= 0 && live.length > 1 ? live[(at + 1) % live.length]! : null;
  const position = selected ? entries.indexOf(selected) + 1 : 0;

  const intro = (
    <>
      <p data-reveal="" className="mood-badge">
        <span className="mood-badge-label">{copy.eyebrow}</span>
        <span className="mood-badge-meta tabular-nums">
          {entries.length} {copy.moodsWord}
        </span>
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

      <p data-reveal="" className="body-mono mt-4 max-w-[32rem] text-pretty md:mt-5">
        {copy.lede}
      </p>
    </>
  );

  return (
    <MoodShop
      moods={index.map(({ key, label, count, href }) => ({ key, label, count, href }))}
      selectedKey={selected?.key ?? null}
      resultsAnchor={MOOD_RESULTS_ANCHOR}
    >
      <section
        id="moods"
        className="shell scroll-mt-[var(--header-h)] pb-10 pt-8 md:pb-14 md:pt-10"
      >
        {index.length ? (
          <MoodIndex
            moods={index}
            clearHref={moodHref(null)}
            intro={intro}
            copy={{
              label: copy.indexLabel,
              step: copy.index.step,
              hintRail: copy.index.hintRail,
              hintPointer: copy.index.hintPointer,
              hintTouch: copy.index.hintTouch,
              shop: copy.index.shop,
              goTo: copy.index.goTo,
              comingSoon: copy.comingSoon,
              selected: copy.index.selected,
              preview: copy.index.preview,
              moodWord: copy.index.moodWord,
              showing: copy.index.showing,
              clear: copy.index.clear,
              unsure: copy.index.unsure,
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
          lands on the switcher rather than under the navigation. */}
      <section
        id={MOOD_RESULTS_ANCHOR}
        className="scroll-mt-[var(--header-h)] pb-14 md:pb-20"
      >
        <MoodResults gathering={copy.results.gathering}>
          {selected ? (
            <>
              <MoodSwitcher label={copy.results.switcher} back={copy.results.back} />

              <div className="shell">
                {/* Keyed on the mood so it re-mounts, and plays its CSS
                    entrance, on every turn. */}
                <header key={selected.key} className="mood-turn mood-results-head">
                  <p className="mood-results-step">
                    <span className="mood-step-num" aria-hidden>
                      2
                    </span>
                    <span className="tabular-nums">
                      {copy.results.eyebrow} {pad(position)}{" "}
                      <span className="text-muted">
                        {copy.results.of} {pad(entries.length)}
                      </span>
                    </span>
                  </p>

                  <MoodClear href={moodHref(null)} label={copy.results.clear} />

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

                <PagedShelf
                  page={shelf.page}
                  anchor={MOOD_RESULTS_ANCHOR}
                  turning={shelfPaging.turning}
                >
                  {/* Keyed on the page too, so a turn replays the cards'
                      entrance rather than swapping them in place. */}
                  <Grid
                    key={`grid-${selected.key}-${shelf.page}`}
                    className="mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:mt-8"
                  >
                    {shelf.items.map((product, i) => (
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

                  <Pagination
                    page={shelf.page}
                    totalPages={shelf.totalPages}
                    hrefFor={(n) => moodHref(selected.key, n)}
                    scroll={false}
                    summary={`${shelfPaging.showing} ${shelf.from}–${shelf.to} ${shelfPaging.of} ${shelf.total} ${
                      shelf.total === 1 ? shelfPaging.kompanion : shelfPaging.kompanions
                    }`}
                  />
                </PagedShelf>

                {/* The hand-on to the next mood belongs at the END of the
                    shelf, not under page 1 of 3. */}
                {next && shelf.page === shelf.totalPages ? (
                  <div key={`next-${selected.key}`} className="mood-card-in mt-10 md:mt-14">
                    <MoodNext
                      eyebrow={copy.results.next}
                      mood={{
                        key: next.key,
                        label: next.label,
                        description: next.description,
                        count: next.count,
                        href: next.href,
                        image: next.images[0] ?? null,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="shell">
              <div className="mood-rest">
                {/* Where the cards will gather - four ghost cells breathing,
                    so the empty step reads as a place waiting rather than a
                    gap. */}
                <ul aria-hidden className="mood-rest-ghosts">
                  {[0, 1, 2, 3].map((cell) => (
                    <li key={cell} style={{ "--i": cell } as CSSProperties} />
                  ))}
                </ul>

                <div className="mood-rest-copy">
                  <div className="mood-rest-card">
                    <p className="mood-steplabel justify-center">
                      <span className="mood-step-num" aria-hidden>
                        2
                      </span>
                      {copy.resting.step}
                    </p>
                    <p className="serif mt-4 text-display-md text-balance">
                      {copy.resting.title}
                    </p>
                    <p className="body-mono mx-auto mt-3 max-w-measure">
                      {copy.resting.body}
                    </p>
                    <a href="#moods" className="mood-rest-up">
                      <ArrowUpIcon className="h-4 w-4" strokeWidth={2} />
                      {copy.resting.back}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </MoodResults>
      </section>
    </MoodShop>
  );
}
