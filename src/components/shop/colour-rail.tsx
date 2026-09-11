import clsx from "clsx";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/24/outline";
import type { Swatch } from "@/lib/shop/colours";
import ColourSpiral from "./colour-spiral";

/**
 * The palette, as a single line of coils.
 *
 * One component for both surfaces that show it - the homepage teaser and step
 * one of the shop-by-colour page - because they are the same object doing the
 * same job, and a second copy would drift the moment one of them was restyled.
 * All that differs is where a coil points, which is the caller's business.
 *
 * Every mark is a plain link. There is no client state here and nothing to
 * hydrate: choosing a colour is a navigation, exactly as every other filter in
 * this shop is, so the rail works with JavaScript off and the back button
 * behaves. It was briefly a client component with local multi-select; one
 * colour at a time made all of that unnecessary.
 */

export type RailColour = {
  key: string;
  label: string;
  swatch: Swatch;
  /** Kompanions in this colour. Zero renders as a shown-but-dead mark. */
  count: number;
  /** Where this mark goes. For the current colour, the URL that clears it. */
  href: string;
  active?: boolean;
};

/** Shared by the live marks and the dead ones, so the row never jumps. */
const CELL = "w-[8.5rem] shrink-0 sm:w-auto sm:flex-1 sm:basis-0";
const PLATE =
  "relative mx-auto flex aspect-square w-full max-w-[13rem] items-center justify-center rounded-plate p-2.5 sm:p-4";
const LABEL =
  "mt-3 block text-[0.625rem] uppercase tracking-micro sm:mt-4 sm:text-[0.6875rem]";

export default function ColourRail({
  colours,
  showCounts = true,
}: {
  colours: RailColour[];
  /** Off on the homepage, where a count is detail the teaser does not need. */
  showCounts?: boolean;
}) {
  if (!colours.length) return null;

  return (
    // One line, always: the palette reads as a run of colour rather than as a
    // block to scan row by row. The marks divide the row evenly from `sm` up
    // and become a horizontal rail below it, where six coils side by side
    // would each be the size of a thumbnail.
    //
    // The bleed is `--gutter` and not a guessed `-mx-4`: the gutter is 0.75rem
    // on a phone, so a 1rem bleed put the rail 8px wider than the viewport and
    // the whole page scrolled sideways by those 8px.
    //
    // `data-lenis-prevent` hands the gesture back to the browser - without it
    // the page's smooth scroll swallows the horizontal swipe.
    <ul
      data-lenis-prevent
      data-lenis-prevent-horizontal
      className="no-scrollbar -mx-[var(--gutter)] flex items-start gap-5 overflow-x-auto px-[var(--gutter)] pb-1 sm:mx-0 sm:gap-6 sm:px-0 lg:gap-8"
    >
      {colours.map((colour) => {
        // In the palette but not yet in the catalogue. Shown, because the
        // brand's palette is its palette whether or not every shade is in
        // stock; not a link, because it leads nowhere.
        if (colour.count === 0) {
          return (
            <li key={colour.key} className={CELL}>
              <div className="block text-center opacity-35">
                <span className={PLATE}>
                  <ColourSpiral swatch={colour.swatch} />
                </span>
                <span className={clsx(LABEL, "text-muted")}>{colour.label}</span>
                <span className="spec-mono mt-1 block text-muted">
                  Coming soon
                </span>
              </div>
            </li>
          );
        }

        return (
          <li key={colour.key} className={CELL}>
            <Link
              href={colour.href}
              scroll={!colour.active}
              prefetch={false}
              // `aria-current` and not a visually-hidden "selected" label:
              // `sr-only` is `position: absolute`, and with no positioned
              // ancestor it resolves against the page rather than against this
              // scrolling row - so the one on the sixth coil sat 800px off the
              // right of a phone screen and made the whole document scroll.
              aria-current={colour.active ? "true" : undefined}
              className="group block text-center outline-none"
            >
              <span
                className={clsx(
                  PLATE,
                  "transition-all duration-300 ease-editorial",
                  colour.active
                    ? "bg-card ring-1 ring-ink/25"
                    : "ring-1 ring-transparent group-hover:bg-card/70 group-focus-visible:ring-ink/40"
                )}
              >
                <ColourSpiral
                  swatch={colour.swatch}
                  className={clsx(
                    "transition-transform duration-500 ease-editorial",
                    colour.active ? "scale-[0.94]" : "group-hover:scale-[1.03]"
                  )}
                />

                {/* The tick, not just a ring: at a glance a ringed coil and a
                    hovered one look alike, and which colour is showing is the
                    one thing this row has to make obvious. */}
                <span
                  className={clsx(
                    "absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper transition-all duration-200 sm:right-2 sm:top-2 sm:h-7 sm:w-7",
                    colour.active ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  )}
                >
                  <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </span>

              <span
                className={clsx(
                  LABEL,
                  "transition-colors",
                  colour.active
                    ? "font-semibold text-ink"
                    : "text-muted group-hover:text-ink"
                )}
              >
                {colour.label}
              </span>

              {showCounts ? (
                <span className="spec-mono mt-1 block text-muted tabular-nums">
                  {colour.count === 1
                    ? "1 Kompanion"
                    : `${colour.count} Kompanions`}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
