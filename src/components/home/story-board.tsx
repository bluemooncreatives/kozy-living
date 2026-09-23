"use client";

import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import ActionButton from "@/components/ui/action-button";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import CircledWord from "@/components/ui/circled-word";
import ProductImageRotator from "@/components/ui/product-image-rotator";
import { displayFace, Eyebrow } from "@/components/ui/section";
import { useHorizontalScrollPassthrough } from "@/hooks/use-horizontal-scroll-passthrough";
import { aboutStory } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** One pillar, with its photography and its destination already resolved. */
export type StoryCard = {
  index: string;
  kicker: string;
  lede: { lead: string; accent: string };
  body: string;
  cta: string;
  href: string;
  alt: string;
  images: { url: string; altText?: string | null }[];
};

/**
 * The homepage story band.
 *
 * Four regions that the grid in `globals.css` reorders between breakpoints -
 * a numbered meter, the editorial column, the card rail and the rail's
 * arrows - all reading one piece of state: where the rail is scrolled to.
 *
 * THE RAIL IS A NATIVE SCROLLER, not a transform track. Touch, trackpad,
 * shift-wheel, the scrollbar and tabbing between the cards therefore all work
 * with no code at all, and the meter and the arrows are readouts of
 * `scrollLeft` rather than a second source of truth that can drift from it.
 *
 * THE CLOSING PANEL IS LOAD-BEARING, not decoration. A snap rail can only
 * park a cell at its start while there is a viewport of scrolling left, so
 * with four cards and two of them visible the fourth could never reach the
 * snapport - 04 would sit dead in the meter for the life of the section. The
 * fifth cell is what the last card scrolls against, and it earns the space by
 * carrying the handoff to the full story. Widths are then chosen so every
 * numbered card is reachable: see `stopsFor`.
 */
export default function StoryBoard({ cards }: { cards: StoryCard[] }) {
  const scope = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useHorizontalScrollPassthrough(railRef);

  const last = Math.max(0, cards.length - 1);
  const count = cards.length;

  /**
   * Where each numbered card comes to rest, as a `scrollLeft` value.
   *
   * Measured rather than calculated: the cells are sized in percentages that
   * change at three breakpoints, and the snapport is inset by the gutter on a
   * phone and flush at desktop. Reading the boxes is the only version of this
   * that cannot fall out of step with the stylesheet.
   */
  const stopsFor = useCallback(
    (rail: HTMLUListElement) => {
      const pad = parseFloat(getComputedStyle(rail).paddingInlineStart) || 0;
      const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
      // Viewport x of scroll offset 0, so a cell's own offset is just the
      // distance from it. Works mid-scroll and mid-animation alike.
      const origin = rail.getBoundingClientRect().left + pad - rail.scrollLeft;

      return Array.from({ length: count }, (_, index) => {
        const cell = rail.children[index];
        if (!(cell instanceof HTMLElement)) return 0;
        const offset = cell.getBoundingClientRect().left - origin;
        return Math.min(max, Math.max(0, offset));
      });
    },
    [count],
  );

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const stops = stopsFor(rail);
    if (!stops.length) return;

    // `<=` so a tie resolves to the LATER card. If the widths are ever changed
    // to something where the final stop clamps onto the one before it, the
    // meter still reaches its last numeral at the end of the rail rather than
    // stalling one short of it.
    let nearest = 0;
    let shortest = Infinity;
    stops.forEach((stop, index) => {
      const distance = Math.abs(stop - rail.scrollLeft);
      if (distance <= shortest) {
        shortest = distance;
        nearest = index;
      }
    });

    const span = stops[last] ?? 0;
    setActive(nearest);
    setProgress(span > 1 ? Math.min(1, Math.max(0, rail.scrollLeft / span)) : 0);
  }, [last, stopsFor]);

  // Percentage cells mean a resize moves the scroll range under a stationary
  // rail: the readout has to be recomputed, not only updated on scroll.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [measure]);

  const goTo = useCallback(
    (index: number) => {
      const rail = railRef.current;
      if (!rail) return;

      const stops = stopsFor(rail);
      const target = stops[Math.min(last, Math.max(0, index))];
      if (target === undefined) return;

      rail.scrollTo({
        left: target,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    [last, stopsFor],
  );

  /* ------------------------------------------------------------- entrance */

  /**
   * Written here rather than with the site-wide `data-reveal` attribute on
   * purpose. This section streams inside a `<Suspense>` boundary, and the
   * DOM-scanning motion layer can reach a streamed node in the window between
   * its HTML arriving and React hydrating it - a real hydration mismatch, and
   * the reason the homepage's Spotlight opts out of reveals entirely. Running
   * the tween from inside the component means it cannot start before
   * hydration.
   *
   * It fails safe in the other direction too: the markup ships visible, so a
   * GSAP failure costs the animation rather than the section.
   */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Already on screen - or already scrolled past - by the time this runs.
      // Hiding it now would be a flash of disappearing content, not an
      // entrance.
      if (root.getBoundingClientRect().top < window.innerHeight * 0.85) return;

      const rise = gsap.utils.toArray<HTMLElement>("[data-story-rise]", root);
      const cells = gsap.utils.toArray<HTMLElement>("[data-story-cell]", root);
      if (!rise.length && !cells.length) return;

      gsap.set([...rise, ...cells], { opacity: 0, y: 24 });

      ScrollTrigger.create({
        trigger: root,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(rise, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.08,
          });
          gsap.to(cells, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay: 0.12,
            ease: "power3.out",
            stagger: 0.1,
          });
        },
      });
    },
    { scope, dependencies: [count] },
  );

  /* ---------------------------------------------------------------- render */

  /**
   * One shape for every cell, including the closing panel, so the rail reads
   * as one band rather than as boxes of different sizes.
   *
   * BELOW lg THE HEIGHT COMES FROM THE RATIO, not from a step scale. The width
   * is a percentage of the viewport and the height was fixed, so the card
   * slowly flattened as the screen grew and went LANDSCAPE across the small
   * tablet range - 1.15:1 at 600px - which is the one proportion this
   * composition cannot survive: it stacks a lede on top of a body and a pill,
   * and needs the photograph between them. A ratio holds 2:3 at every width
   * instead, and `min-h` keeps the smallest phones from squeezing the copy.
   *
   * At lg the rail sits in a fixed two-column grid beside the editorial
   * column, so the height is pinned there and the ratio goes back to being
   * whatever the track width makes it (0.52 at 1024 through 0.74 at 1536 -
   * all portrait).
   *
   * The widths are NOT free. With five cells and two visible, a cell must be
   * at least 50% of the rail for the fourth card to reach the snapport - see
   * the note on the closing panel above.
   */
  const CELL =
    "flex items-center aspect-[2/3] min-h-[24rem] w-[80%] shrink-0 snap-start sm:w-[58%] md:w-[52%] lg:aspect-auto lg:h-[31rem] lg:min-h-0 xl:h-[35rem]";

  return (
    <div ref={scope} className="story-grid">
      {/* ------------------------------------------------------------ meter */}
      <div data-story-rise className="story-meter flex flex-col gap-5">
        <div className="flex items-center gap-2.5 sm:gap-4">
          {cards[0] ? (
            <Numeral
              card={cards[0]}
              index={0}
              active={active}
              onSelect={goTo}
            />
          ) : null}

          {/* The track runs between 01 and the rest, as the reference draws
              it, and fills with the true scroll fraction - so it travels with
              the finger instead of stepping when a card lands. */}
          <span
            aria-hidden
            className="relative h-px min-w-[1.25rem] flex-1 bg-rule"
          >
            <span
              className="absolute inset-y-0 left-0 bg-ink"
              style={{ width: `${progress * 100}%` }}
            />
          </span>

          <span className="flex items-center gap-0.5 sm:gap-1.5">
            {cards.slice(1).map((card, offset) => (
              <Numeral
                key={card.index}
                card={card}
                index={offset + 1}
                active={active}
                onSelect={goTo}
              />
            ))}
          </span>
        </div>

        <p className="body-mono hidden max-w-[24rem] lg:block">
          {aboutStory.meterNote}
        </p>
      </div>

      {/* ------------------------------------------------------------- copy */}
      <div className="story-copy">
        <div data-story-rise>
          <Eyebrow align="left">{aboutStory.eyebrow}</Eyebrow>
        </div>

        <h2
          data-story-rise
          id="home-story"
          /* Franxurter is wide and the left column is roughly a third of the
             shell, so the largest step is earned rather than assumed: it only
             comes in at xl, where the column is finally wide enough to hold
             "quietest hour" on one line. Below that the heading would rewrap
             into four lines and the column would outgrow the rail beside it. */
          className={clsx(displayFace, "mt-4 text-display-lg xl:text-display-xl")}
        >
          {aboutStory.title.map((line) => (
            <span key={line} className="block">
              {ringPhrase(line, aboutStory.circled)}
            </span>
          ))}
        </h2>

        <p data-story-rise className="body-mono mt-6 max-w-measure text-pretty">
          {aboutStory.body}
        </p>

        <div data-story-rise className="mt-7 flex flex-wrap items-center gap-3">
          <ActionButton
            label={aboutStory.primary.label}
            href={aboutStory.primary.href}
            icon="arrow"
            variant="solid"
          />
          <ActionButton
            label={aboutStory.secondary.label}
            href={aboutStory.secondary.href}
            icon="arrow"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- rail */}
      <ul
        ref={railRef}
        id="story-rail"
        role="list"
        onScroll={measure}
        data-lenis-prevent-horizontal
        aria-label="What Kozy Living is built on"
        className="rail story-rail story-rail-area gap-3 pb-1"
      >
        {cards.map((card, index) => (
          <li key={card.index} data-story-cell className={CELL}>
            <Link
              href={card.href}
              prefetch={false}
              /* `is-active` is the card the meter is currently on. It drives
                 the whole staggered look: the leading card drops its copy to
                 the foot of the frame and clears the haze off its
                 photograph, while the cards queued behind it hold their copy
                 high. Pressing an arrow moves the class, and the two cards
                 trade positions - which is the movement the reference is
                 built around. */
              className={clsx(
                "story-card group relative isolate block w-full overflow-hidden rounded-plate bg-ink p-5 outline-none ring-ink/40 focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-paper md:p-6",
                index === active && "is-active",
              )}
            >
              {/* Negative z inside an isolated card: these paint over the
                  card's own indigo fill and under every line of copy, which
                  is what lets the numeral sit between the scrim and the text
                  rather than on top of it. */}
              <div
                aria-hidden
                className="absolute inset-0 -z-10 overflow-hidden rounded-plate"
              >
                <ProductImageRotator
                  images={card.images}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 58vw, 80vw"
                  delay={index * 700}
                  interval={5200}
                  showIndicators={false}
                />
              </div>
              {/* Haze over the photograph of a card that is not the leading
                  one. It sits UNDER the scrim, so it softens the picture
                  without touching the ground the copy is read against. */}
              <span
                aria-hidden
                className="story-card-veil pointer-events-none absolute inset-0 -z-10"
              />
              <span
                aria-hidden
                className="story-card-shade pointer-events-none absolute inset-0 -z-10"
              />
              {/* The second scrim, for the raised state. Copy held high sits
                  where the standing gradient is still open, so this one
                  carries its own dark band at that height and fades out again
                  the moment the card takes the lead. */}
              <span
                aria-hidden
                className="story-card-shade-raised pointer-events-none absolute inset-0 -z-10"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-3 right-3 -z-10 font-display text-[5.5rem] leading-none text-paper/25 md:text-[7rem]"
              >
                {card.index}
              </span>

              <div className="relative max-w-[15rem]">
                <h3 className="serif text-display-md !text-paper">
                  {card.lede.lead}{" "}
                  {/* Franxurter has no italic and one weight, so the emphasis
                      lives on Jakarta's true italic. Sage measures 6.50 on the
                      indigo scrim, which is where flat sage may carry type. */}
                  <em className="font-normal italic text-sage">
                    {card.lede.accent}
                  </em>
                </h3>
                <p className="mt-2.5 font-sans text-micro uppercase tracking-micro text-paper/75">
                  {card.kicker}
                </p>
              </div>

              {/* Absolutely placed, not the tail of a flex column: this
                  block travels between two heights and `bottom` is the one
                  property that can be animated between them without the top
                  block moving with it. */}
              <div className="story-card-body absolute inset-x-5 md:inset-x-6">
                <p className="max-w-[20rem] font-sans text-xs leading-relaxed text-paper/85 sm:text-sm">
                  {card.body}
                </p>
                {/* A span, not an ActionButton: the whole card is already the
                    link, and a nested anchor or button is invalid markup and
                    a second tab stop for the same destination. */}
                <span className="action-btn-glass mt-4">
                  <span className="action-btn-label">{card.cta}</span>
                  <span className="action-btn-icon story-card-icon">
                    <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                </span>
              </div>
            </Link>
          </li>
        ))}

        {/* The cell the fourth card scrolls against - and the handoff for
            anyone who swiped all the way through and wants the rest. */}
        <li data-story-cell className={CELL}>
          <Link
            href={aboutStory.primary.href}
            /* `is-active` unconditionally: this panel is never a queued card,
               so it keeps full height and no haze whatever the meter says. */
            className="story-card is-active panel-sage group relative flex h-full w-full flex-col justify-between overflow-hidden p-6 outline-none ring-ink/40 focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-paper md:p-7"
          >
            <span aria-hidden className="text-2xl leading-none">
              ✳
            </span>
            <div>
              <p className="font-sans text-micro uppercase tracking-micro text-ink/70">
                {aboutStory.closing.label}
              </p>
              <h3 className="serif mt-3 text-display-md">
                {aboutStory.closing.title}
              </h3>
              <span className="action-btn-solid mt-6">
                <span className="action-btn-label">
                  {aboutStory.primary.label}
                </span>
                <span className="action-btn-icon story-card-icon">
                  <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
              </span>
            </div>
          </Link>
        </li>
      </ul>

      {/* -------------------------------------------------------------- nav */}
      <div data-story-rise className="story-nav flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active <= 0}
          aria-label="Previous"
          aria-controls="story-rail"
          className="arrow-btn border-ink/15 bg-card text-ink hover:border-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-ink/15 disabled:hover:bg-card disabled:hover:text-ink"
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active >= last}
          aria-label="Next"
          aria-controls="story-rail"
          className="arrow-btn disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-ink disabled:hover:bg-ink disabled:hover:text-paper"
        >
          <Chevron direction="right" />
        </button>
      </div>
    </div>
  );
}

/**
 * One numeral in the meter. It is a real control - tapping 03 takes you to the
 * third card - which is what earns the meter its space on a phone, where the
 * arrows are otherwise the only way through the rail without swiping.
 */
function Numeral({
  card,
  index,
  active,
  onSelect,
}: {
  card: StoryCard;
  index: number;
  active: number;
  onSelect: (index: number) => void;
}) {
  const isActive = index === active;

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-current={isActive ? "true" : undefined}
      aria-label={`${card.kicker}: ${card.lede.lead} ${card.lede.accent}`}
      className={clsx(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-ui font-semibold tabular-nums transition-colors duration-300 sm:h-10 sm:w-10",
        isActive
          ? "bg-ink text-paper"
          : "text-muted hover:bg-wash hover:text-ink",
      )}
    >
      {card.index}
    </button>
  );
}

/** Loops the hand-drawn ellipse around `phrase` where it appears in `line`. */
function ringPhrase(line: string, phrase: string) {
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

/** Drawn rather than typed, so the weight matches the UI face. */
function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
      ) : (
        <path d="M5 12h14m0 0-6-6m6 6-6 6" />
      )}
    </svg>
  );
}
