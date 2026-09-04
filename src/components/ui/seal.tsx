"use client";

import clsx from "clsx";
import { useId } from "react";

/**
 * The rotating sage seal - the signature mark of this system. It appears
 * over the hero wordmark, over the closing CTA, and as the footer's
 * back-to-top control, and nowhere else, which is what keeps it reading as a
 * stamp rather than as decoration.
 *
 * The ring of type is real text on an SVG `textPath`, so it stays a true
 * circle at any size. Only the ring rotates - the glyph in the middle is a
 * sibling, so it never spins with it.
 *
 * A client component purely for `useId`: several seals can share a page and
 * each needs its own path id.
 */

/**
 * Ring geometry, in the SVG's own 100x100 user units. The radius sets how far
 * in from the edge the type sits; the circumference is what the type is then
 * stretched to fill so the loop always closes.
 */
const RING_RADIUS = 37;
const RING_CIRCUMFERENCE = +(2 * Math.PI * RING_RADIUS).toFixed(3);

export default function Seal({
  text = "kozy living · handcrafted · sustainable · ",
  glyph = "✳",
  size = "md",
  tone = "sage",
  href,
  label,
  className,
  reverse = false,
  onClick,
}: {
  /** Ring copy. Runs once around the circle, so end it with a separator. */
  text?: string;
  /** What sits in the middle. */
  glyph?: React.ReactNode;
  /**
   * "fit" applies no box of its own, so the caller can size it in `em` and
   * have it track a font size - which is how it stands in for the O of the
   * wordmark.
   */
  size?: "sm" | "md" | "lg" | "fit";
  /**
   * "sage" is the standing mark: sage disc, indigo type.
   * "ink" reverses it to an indigo disc with sage type, so the seal reads as
   * part of an indigo wordmark rather than as a badge stuck on top of one.
   */
  tone?: "sage" | "ink";
  /** Renders as a link when given; otherwise a plain mark. */
  href?: string;
  label?: string;
  className?: string;
  reverse?: boolean;
  onClick?: () => void;
}) {
  const pathId = useId();

  const box = {
    sm: "h-16 w-16",
    md: "h-24 w-24 md:h-28 md:w-28",
    lg: "h-28 w-28 md:h-36 md:w-36",
    fit: "",
  }[size];

  const glyphSize = {
    sm: "text-sm",
    md: "text-lg md:text-xl",
    lg: "text-xl md:text-2xl",
    // Scales with the inherited font size rather than a breakpoint step.
    fit: "text-[0.18em]",
  }[size];

  const disc = tone === "ink" ? "bg-ink" : "bg-sage";
  const ring = tone === "ink" ? "fill-sage" : "fill-ink";
  const glyphTone = tone === "ink" ? "text-sage" : "text-ink";

  const body = (
    <>
      <span
        aria-hidden
        className={clsx("seal-ring", reverse && "[animation-direction:reverse]")}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            {/* Starts at twelve o'clock and runs clockwise, so the seam
                between the last character and the first sits at the top of
                the disc where it reads as deliberate. */}
            <path
              id={pathId}
              d={`M 50 50 m 0 -${RING_RADIUS} a ${RING_RADIUS} ${RING_RADIUS} 0 1 1 0 ${
                RING_RADIUS * 2
              } a ${RING_RADIUS} ${RING_RADIUS} 0 1 1 0 -${RING_RADIUS * 2}`}
              fill="none"
            />
          </defs>
          <text
            className={clsx(ring, "font-sans font-bold uppercase")}
            style={{ fontSize: "9px" }}
          >
            {/* `textLength` is the whole circumference and `lengthAdjust` is
                "spacing", so the ring always closes on itself: the tracking
                stretches or tightens to fit whatever text it is handed, and
                there is no gap left where the words simply ran out. "spacing"
                rather than "spacingAndGlyphs" - the letterforms must not be
                distorted, only the space between them.

                The explicit letter-spacing that used to be here fought this,
                since the two are solving the same problem in opposite
                directions. */}
            <textPath
              href={`#${pathId}`}
              startOffset="0"
              textLength={RING_CIRCUMFERENCE}
              lengthAdjust="spacing"
            >
              {text}
            </textPath>
          </text>
        </svg>
      </span>
      <span
        aria-hidden
        className={clsx("relative leading-none", glyphSize, glyphTone)}
      >
        {glyph}
      </span>
    </>
  );

  const classes = clsx("seal shrink-0", disc, box, className);

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        aria-label={label ?? text.replace(/·/g, " ").trim()}
        className={clsx(classes, "transition-transform hover:scale-105")}
      >
        {body}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label ?? text.replace(/·/g, " ").trim()}
        className={clsx(classes, "transition-transform hover:scale-105")}
      >
        {body}
      </button>
    );
  }

  return (
    <span aria-hidden className={classes}>
      {body}
    </span>
  );
}
