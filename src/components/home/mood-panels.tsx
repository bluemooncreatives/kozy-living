"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Plate from "@/components/ui/plate";

/**
 * The homepage's way into /shop-by-mood: one tall photographic panel per
 * mood, side by side, and the one under the pointer opens wide.
 *
 *   lg+    a row of panels that share the width EQUALLY at rest. The one
 *          under the pointer (or holding focus) takes `--grow` shares and
 *          the rest one each, and `flex-grow` animates between them; when
 *          the pointer leaves the row they settle back to equal shares.
 *          Nothing is open at rest, so no one mood reads as the pick.
 *   below  a snap rail of full panels. A phone has no hover, and a panel
 *          narrow enough to share a phone's width with four others has no
 *          room for a word.
 *
 * NO TEXT RE-WRAPS AS A PANEL OPENS. The title is set to the width of a
 * CLOSED panel and the description to the width of an OPEN one, both from
 * the row's own width (`--unit` in globals.css), so neither changes its line
 * breaks while the photograph widens under it. Letting the copy follow the
 * panel would re-wrap the title on some frame mid-way, and its top edge would
 * jump. The description unfolds beneath the title instead, so the title
 * rises smoothly to make room.
 *
 * Every panel is a plain link to its mood on /shop-by-mood, chosen. On a
 * touch screen wide enough for the row, the first tap opens a closed panel
 * and the second follows it - the hover a finger cannot do.
 */

export type MoodPanel = {
  key: string;
  label: string;
  description: string;
  count: number;
  href: string;
  image: { url: string; altText?: string } | null;
};

const kompanions = (count: number) =>
  count === 1 ? "1 Kompanion" : `${count} Kompanions`;

/** The row's breakpoint. Below it the panels are a rail and all open. */
const ROW_QUERY = "(min-width: 1024px)";

export default function MoodPanels({
  moods,
  label,
  explore,
}: {
  moods: MoodPanel[];
  /** Names the list for assistive tech. */
  label: string;
  /** The pill at each panel's foot. */
  explore: string;
}) {
  /** The open panel, or null at rest - every panel an equal share. */
  const [active, setActive] = useState<number | null>(null);
  // What the press that led to this click found. Read at `pointerdown`,
  // because a tap FOCUSES the link before its click arrives, and focus opens
  // the panel - by click time every tapped panel looked open already, and the
  // first tap followed the link.
  const press = useRef<{ type: string; wasOpen: boolean } | null>(null);

  if (!moods.length) return null;

  const open = (index: number) => setActive(index);
  const rest = () => setActive(null);

  const enter = (event: PointerEvent, index: number) => {
    if (event.pointerType === "mouse") open(index);
  };

  const follow = (event: MouseEvent, index: number) => {
    const pressed = press.current;
    press.current = null;
    // No press at all is the keyboard: Enter on a focused panel follows it.
    if (
      pressed &&
      pressed.type !== "mouse" &&
      !pressed.wasOpen &&
      window.matchMedia(ROW_QUERY).matches
    ) {
      event.preventDefault();
      open(index);
    }
  };

  return (
    <ul
      aria-label={label}
      data-reveal-group=""
      className="mood-panels"
      data-open={active !== null ? "" : undefined}
      style={{ "--n": moods.length } as CSSProperties}
      // The row, not each panel: crossing the gap between two panels must
      // not drop the row back to rest for a frame and re-open it.
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") rest();
      }}
      onBlur={(event) => {
        // Focus leaving the whole row, not moving between its panels.
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          rest();
        }
      }}
    >
      {moods.map((mood, index) => (
        <li
          key={mood.key}
          className="mood-panel"
          data-active={index === active ? "" : undefined}
          onPointerEnter={(event) => enter(event, index)}
          onPointerDown={(event) => {
            press.current = {
              type: event.pointerType,
              wasOpen: index === active,
            };
          }}
        >
          <Link
            href={mood.href}
            prefetch={false}
            className="mood-panel-link group"
            onFocus={() => open(index)}
            onClick={(event) => follow(event, index)}
          >
            <Plate
              src={mood.image?.url}
              alt={mood.image?.altText ?? ""}
              placeholderText={mood.label}
              aspect={null}
              reveal={false}
              className="h-full"
              sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 82vw"
            />

            <span aria-hidden className="mood-panel-scrim" />

            {/* How much of it there is. */}
            <span className="mood-panel-chips" aria-hidden>
              <span className="mood-panel-chip">
                {kompanions(mood.count)}
                <span className="mood-panel-dot" />
              </span>
            </span>

            <span className="mood-panel-arrow" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>

            <span className="mood-panel-copy">
              <span className="mood-panel-title">{mood.label}</span>
              {/* Unfolds with `grid-template-rows`, so on a closed panel the
                  title sits on the pill rather than over a blank line. */}
              {mood.description ? (
                <span className="mood-panel-more">
                  <span className="mood-panel-more-clip">
                    <span className="mood-panel-desc">{mood.description}</span>
                  </span>
                </span>
              ) : null}
              <span className="mood-panel-pill">
                <span className="mood-panel-pill-label">{explore}</span>
                <ChevronRightIcon
                  aria-hidden
                  className="h-4 w-4 shrink-0"
                  strokeWidth={2}
                />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
