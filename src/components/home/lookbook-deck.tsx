"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import Plate from "@/components/ui/plate";

export type LookbookCard = {
  title: string;
  tag: string;
  description: string;
  href: string;
  images: { url: string; altText: string }[];
};

const PER_PAGE = 4;

/**
 * Depth of each SLOT, not of each card: highest, a drop, the deepest, then
 * back up halfway. Tying the zigzag to position is what lets a page turn swap
 * every card without the cluster changing shape under the reader's eye.
 */
const DROP = ["lg:mt-0", "lg:mt-[8.5rem]", "lg:mt-[13rem]", "lg:mt-[4.5rem]"];

/**
 * The lookbook cluster under the bold statement, paged in fours.
 *
 * One pair of arrows drives the whole cluster rather than each plate carrying
 * its own: the four boxes are one composition, and turning them together is
 * what keeps the zigzag intact. The arrows wrap, so neither is ever a dead
 * control on a three-page list.
 *
 * MOTION. The first page's plates keep their `data-reveal`, so the cluster
 * enters with the rest of the page. Every page after that mounts with
 * `reveal={false}` and a CSS entrance instead - a freshly mounted
 * `data-reveal` would be hidden by the stylesheet and then have to wait for
 * the motion layer's observer to claim it, which after a click is a visible
 * blank beat (and, if the trigger has already passed, a permanent one).
 */
export default function LookbookDeck({
  cards,
  intro,
}: {
  cards: LookbookCard[];
  intro: string;
}) {
  const pages = Math.max(1, Math.ceil(cards.length / PER_PAGE));
  const [page, setPage] = useState(0);
  // null until the first turn: the opening page must not run the CSS entrance
  // on top of the motion layer's reveal.
  const [turn, setTurn] = useState<{ dir: 1 | -1; n: number } | null>(null);

  const go = (dir: 1 | -1) => {
    setPage((current) => (current + dir + pages) % pages);
    setTurn((current) => ({ dir, n: (current?.n ?? 0) + 1 }));
  };

  const visible = cards.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const first = page * PER_PAGE + 1;
  const last = page * PER_PAGE + visible.length;

  return (
    <div className="relative mt-8 md:mt-10 lg:mt-16">
      {/* On wide screens this drops into the notch the staggered plates
          leave open; below that it is simply the paragraph after the head. */}
      <p className="body-mono mb-6 max-w-measure lg:absolute lg:left-[38%] lg:top-0 lg:z-10 lg:mb-0 lg:max-w-[28rem]">
        {intro}
      </p>

      {pages > 1 ? (
        /* Above the cluster rather than on it: these turn all four plates, and
           parked on one plate they would read as that plate's own gallery.
           At `lg` they sit over the fourth slot, whose drop leaves the room. */
        <div className="mb-4 flex items-center justify-end gap-3 lg:absolute lg:right-0 lg:top-0 lg:z-10 lg:mb-0">
          <p
            aria-live="polite"
            className="ui-mono mr-1 tabular-nums text-muted"
          >
            <span className="sr-only">
              Showing collections {first} to {last} of {cards.length}.{" "}
            </span>
            <span aria-hidden>
              <span className="text-ink">{String(page + 1).padStart(2, "0")}</span>
              {" / "}
              {String(pages).padStart(2, "0")}
            </span>
          </p>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous collections"
            aria-controls="lookbook-cluster"
            className="arrow-btn border-ink/15 bg-card text-ink hover:border-ink hover:bg-ink hover:text-paper"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next collections"
            aria-controls="lookbook-cluster"
            className="arrow-btn"
          >
            <Chevron direction="right" />
          </button>
        </div>
      ) : null}

      {/* Four equal tracks. The plates keep one aspect so the zigzag comes
          purely from the drop, exactly as in the reference. */}
      <ul
        id="lookbook-cluster"
        className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4 lg:items-start"
      >
        {visible.map((card, slot) => {
          const index = page * PER_PAGE + slot;

          return (
            <li
              // The turn counter is in the key so paging back to a page
              // remounts it and the entrance plays again.
              key={`${card.href}-${card.title}-${turn?.n ?? 0}`}
              className={clsx(DROP[slot], turn && "lookbook-turn")}
              style={
                turn
                  ? ({
                      "--turn-from": `${turn.dir * 1.5}rem`,
                      animationDelay: `${slot * 70}ms`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <Link href={card.href} className="group block" prefetch={false}>
                <Plate
                  gallery={card.images.length ? card.images : null}
                  galleryAuto={card.images.length > 1}
                  galleryDelay={slot * 1300}
                  galleryInterval={3600 + (slot % 2) * 600}
                  showIndicators
                  alt={`${card.title} - ${card.tag}`}
                  aspect="5/7"
                  arrow
                  arrowTone={slot === 1 ? "sage" : "card"}
                  description={card.description}
                  title={card.title}
                  tone={(index % 4) as 0 | 1 | 2 | 3}
                  placeholderText={card.tag}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  reveal={!turn}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
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
