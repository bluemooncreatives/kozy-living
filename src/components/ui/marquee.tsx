import clsx from "clsx";

/**
 * Scrolling ticker. The phrase list is rendered twice so the -50% translation
 * in `.marquee-track` loops without a visible seam; the duplicate is hidden
 * from assistive tech.
 *
 * Three sizes carry three jobs in the system (DESIGN.md §5):
 *   `ui`      - the announcement strip and the shipping band, mono.
 *   `display` - the "Brew of the Month" bands, serif at heading scale.
 *   `hero`    - the giant statement over the hero image and in the footer.
 */
export default function Marquee({
  phrases,
  size = "ui",
  separator = "·",
  reverse = false,
  duration,
  className,
}: {
  phrases: readonly string[];
  size?: "ui" | "display" | "hero";
  /** Glyph set between phrases. Pass "" for none. */
  separator?: string;
  reverse?: boolean;
  /** Seconds for one full pass. Longer text wants a longer duration. */
  duration?: number;
  className?: string;
}) {
  const text = {
    ui: "font-mono text-ui uppercase tracking-ui",
    display: "font-display text-display-md",
    // `leading-none` (line-height: 1) sets the line box tighter than
    // Instrument Serif's actual descent, so glyphs with descenders - the "g"
    // in "Coorg", the "y" in "Every" - render below the box and get clipped
    // by this wrapper's own `overflow-hidden` (needed to hide the duplicated
    // track). A touch of headroom fixes it without loosening the set visibly.
    hero: "font-display text-display-hero leading-[1.15]",
  }[size];

  const gap = {
    ui: "px-8",
    display: "px-6",
    hero: "px-8",
  }[size];

  // Extra clipping headroom at the outer edge, belt-and-braces alongside the
  // loosened line-height above.
  const bleed = {
    ui: "",
    display: "pb-1",
    hero: "pb-3",
  }[size];

  const run = (ariaHidden: boolean) => (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={ariaHidden || undefined}
    >
      {phrases.map((phrase, i) => (
        <span key={`${phrase}-${i}`} className="flex items-center">
          <span className={clsx("whitespace-nowrap", gap, text)}>{phrase}</span>
          {separator ? (
            <span aria-hidden className={clsx("shrink-0", text)}>
              {separator}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={clsx("overflow-hidden", bleed, className)}
      style={
        duration
          ? ({ "--marquee-duration": `${duration}s` } as React.CSSProperties)
          : undefined
      }
    >
      <div className={reverse ? "marquee-track-reverse" : "marquee-track"}>
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}
