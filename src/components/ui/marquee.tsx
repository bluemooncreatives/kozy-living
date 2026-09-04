import clsx from "clsx";

/**
 * Scrolling ticker. The phrase list is rendered twice so the -50% translation
 * in `.marquee-track` loops without a visible seam; the duplicate is hidden
 * from assistive tech.
 *
 * Three sizes carry three jobs:
 *   `ui`      - the announcement strip and the shipping band.
 *   `display` - the discount ticker, set at heading scale and weight.
 *   `hero`    - full-bleed wordmark scale.
 */
export default function Marquee({
  phrases,
  size = "ui",
  separator = "·",
  separatorTone = "ink",
  reverse = false,
  duration,
  className,
}: {
  phrases: readonly string[];
  size?: "ui" | "display" | "hero";
  /** Glyph set between phrases. Pass "" for none. */
  separator?: string;
  /** Yellow separators are the system's way of punctuating a black ticker. */
  separatorTone?: "ink" | "yellow";
  reverse?: boolean;
  /** Seconds for one full pass. Longer text wants a longer duration. */
  duration?: number;
  className?: string;
}) {
  const text = {
    ui: "font-display text-ui font-medium",
    display: "font-display text-display-md font-bold tracking-tight",
    hero: "wordmark leading-[1.05]",
  }[size];

  const gap = {
    ui: "px-6",
    display: "px-5",
    hero: "px-8",
  }[size];

  // A touch of headroom so descenders are never clipped by the wrapper's own
  // `overflow-hidden` (which is what hides the duplicated track).
  const bleed = {
    ui: "",
    display: "pb-1",
    hero: "pb-3",
  }[size];

  const separatorClass = {
    ink: "text-ink",
    yellow: "text-yellow",
  }[separatorTone];

  // Scaled off the phrase size so a separator never out-shouts the words it
  // punctuates. `--sep-scale` lets one caller nudge it without a new prop.
  const separatorSize = {
    ui: "text-[calc(0.8em*var(--sep-scale,1))]",
    display: "text-[calc(0.85em*var(--sep-scale,1))]",
    hero: "text-[calc(0.7em*var(--sep-scale,1))]",
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
            <span
              aria-hidden
              className={clsx(
                "shrink-0 leading-none",
                separatorClass,
                separatorSize
              )}
            >
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
