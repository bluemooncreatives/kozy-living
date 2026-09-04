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
            <path
              id={pathId}
              d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0"
              fill="none"
            />
          </defs>
          <text
            className={clsx(ring, "font-sans font-bold uppercase")}
            style={{ fontSize: "8.5px", letterSpacing: "0.1em" }}
          >
            <textPath href={`#${pathId}`} startOffset="0">
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
