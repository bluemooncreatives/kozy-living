"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Plate from "@/components/ui/plate";
import type { IndexMood } from "./mood-index";
import { useMoodShop } from "./mood-shop";

/**
 * Step one on a phone or tablet: the moods as a swipeable rail of photographs.
 *
 * Below `lg` the desktop list was the wrong shape twice over. Six text rows
 * at ~150px each, plus the chosen row's panel, put ~1,100px of scrolling
 * between the headline and the first Kompanion; and the stage - the only
 * place the moods' own photography appears - is desktop-only, so a phone
 * never saw a single picture of a mood. A rail of photo cards is ~500px tall
 * and shows exactly what a mood looks like.
 *
 * Same contract as the list: every card is a plain link to its mood
 * (`?mood=<handle>#kompanions`), choosing goes through `useMoodShop`, and a
 * mood with nothing in it is shown, dimmed, and leads nowhere. The chosen
 * card is ringed and brings itself into view, so a shopper arriving from the
 * homepage on `?mood=` finds it on screen rather than four swipes away.
 *
 * Native scrolling with snap, not a transform track: touch, trackpad and
 * keyboard all work for free, and Lenis is told to stay out of the way.
 */

type Copy = {
  comingSoon: string;
  selected: string;
  moodWord: string;
  shop: string;
  showing: string;
  clear: string;
  /** "Go to" - the dots' accessible names read "Go to Caffeine Ritual". */
  goTo: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const kompanions = (count: number) =>
  count === 1 ? "1 Kompanion" : `${count} Kompanions`;

/** Where a card snaps: its left edge on the page grid (the rail's
 *  `scroll-padding`). The rail is `position: relative`, so `offsetLeft` is
 *  measured from the rail's own edge. */
const snapLeft = (rail: HTMLElement, card: HTMLElement) =>
  card.offsetLeft - (parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0);

/**
 * Brings a card to its snap point. NOT to the middle: the rail snaps cards by
 * their START edge, and on a tablet - two and a bit cards across - a centred
 * position fell between two snap points and the browser snapped straight
 * back to the first card, so the chosen mood never came into view.
 */
function align(
  rail: HTMLElement | null,
  card: HTMLElement | null,
  behavior: ScrollBehavior,
) {
  if (!rail || !card) return;
  rail.scrollTo({ left: snapLeft(rail, card), behavior });
}

export default function MoodRail({
  moods,
  clearHref,
  label,
  copy,
}: {
  moods: IndexMood[];
  clearHref: string;
  /** Names the list for assistive tech. */
  label: string;
  copy: Copy;
}) {
  const { chosenKey, choose, clear } = useMoodShop();
  const rail = useRef<HTMLOListElement>(null);
  const placed = useRef(false);
  const [at, setAt] = useState(0);

  // Which card is at the snap point - for the dots and the counter. Measured
  // on scroll, once per frame, from the cards' own boxes rather than from an
  // assumed width, so a resize or a font swap cannot put it out by one. The
  // last cards can never reach the snap point (the rail runs out first), so
  // a rail scrolled to its end counts as being on its last card.
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const cards = Array.from(el.children) as HTMLElement[];
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
        setAt(cards.length - 1);
        return;
      }
      let nearest = 0;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const gap = Math.abs(snapLeft(el, card) - el.scrollLeft);
        if (gap < distance) {
          distance = gap;
          nearest = index;
        }
      });
      setAt(nearest);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // The chosen card comes into view: at once on arrival (no ride across the
  // rail on page load), smoothly when the choice changes after that.
  useEffect(() => {
    const el = rail.current;
    if (!el || !chosenKey) return;
    const card = el.querySelector<HTMLElement>(
      `[data-key="${CSS.escape(chosenKey)}"]`,
    );
    align(el, card, placed.current ? "smooth" : "instant");
    placed.current = true;
  }, [chosenKey]);

  if (!moods.length) return null;

  return (
    <div className="mood-rail-wrap">
      <ol
        ref={rail}
        aria-label={label}
        className="mood-rail"
        data-reveal-group=""
        data-lenis-prevent-horizontal=""
      >
        {moods.map((mood, index) => {
          const live = mood.count > 0;
          const isChosen = mood.key === chosenKey;
          const lead = mood.images[0] ?? null;
          // Below `lg` this rail is the first fold and its photographs are
          // the page's LCP. The FIRST card is always it: the jump to the
          // chosen card is an effect, after first paint, so the browser has
          // already measured the rail at scrollLeft 0. The chosen card is
          // what stands there a frame later, so it is not left lazy either.
          const opensOn = index === 0 || isChosen;

          const face = (
            <>
              <Plate
                src={lead?.url}
                alt={lead?.altText ?? ""}
                placeholderText={mood.label}
                aspect={null}
                reveal={false}
                priority={opensOn}
                className="h-full"
                sizes="(min-width: 640px) 21rem, 80vw"
              />
              <span aria-hidden className="mood-card-scrim" />

              <span className="mood-card-chip" data-tone={isChosen ? "selected" : undefined}>
                {isChosen ? (
                  <CheckIcon className="h-3 w-3" strokeWidth={3} aria-hidden />
                ) : null}
                {isChosen
                  ? copy.selected
                  : live
                    ? `${copy.moodWord} ${pad(index + 1)}`
                    : copy.comingSoon}
              </span>

              <span className="mood-card-copy">
                {live ? (
                  <span className="mood-card-count tabular-nums">
                    {kompanions(mood.count)}
                  </span>
                ) : null}
                <span className="mood-card-title">{mood.label}</span>
                {mood.description ? (
                  <span className="mood-card-desc">{mood.description}</span>
                ) : null}
                {live ? (
                  // A styled span, not a button: the whole card is the link,
                  // and an <a> inside an <a> is invalid and a second tab stop.
                  <span
                    className={clsx(
                      "mood-card-cta",
                      isChosen ? "action-btn-solid" : "action-btn",
                    )}
                  >
                    <span className="action-btn-label">
                      {isChosen ? copy.showing : copy.shop}
                    </span>
                    <span className="action-btn-icon">
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        className={clsx("h-3.5 w-3.5", isChosen ? "rotate-90" : "")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                ) : null}
              </span>
            </>
          );

          return (
            <li
              key={mood.key}
              data-key={mood.key}
              className="mood-card"
              data-chosen={isChosen ? "" : undefined}
              data-dead={live ? undefined : ""}
            >
              {live ? (
                <Link
                  href={mood.href}
                  scroll={false}
                  prefetch={false}
                  aria-current={isChosen ? "true" : undefined}
                  className="mood-card-link"
                  onClick={(event) => choose(event, mood.key, "soon")}
                >
                  {face}
                </Link>
              ) : (
                <div className="mood-card-link">{face}</div>
              )}

              {/* Beside the card link, not inside it - see the CTA above. */}
              {isChosen ? (
                <Link
                  href={clearHref}
                  scroll={false}
                  prefetch={false}
                  className="mood-card-clear"
                  onClick={clear}
                >
                  <XMarkIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {copy.clear}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mood-rail-foot">
        <div className="mood-rail-dots">
          {moods.map((mood, index) => (
            <button
              key={mood.key}
              type="button"
              aria-label={`${copy.goTo} ${mood.label}`}
              aria-current={index === at ? "true" : undefined}
              className={clsx(
                "mood-rail-dot",
                index === at && "is-at",
                mood.key === chosenKey && "is-chosen",
              )}
              onClick={() =>
                align(
                  rail.current,
                  rail.current?.children[index] as HTMLElement,
                  "smooth",
                )
              }
            />
          ))}
        </div>
        <p className="mood-rail-count tabular-nums" aria-hidden>
          {pad(at + 1)}
          <span> / {pad(moods.length)}</span>
        </p>
      </div>
    </div>
  );
}
