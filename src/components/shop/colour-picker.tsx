"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import type { Swatch } from "@/lib/shop/colours";
import ColourSpiral from "./colour-spiral";

/**
 * Step one of shopping by colour: choose the colours, then go to the grid.
 *
 * WHY A CLIENT COMPONENT, on a browse surface where everything else is a link.
 * The rest of the shop filters one dimension at a time and each click is a real
 * navigation, which is what makes it work with JavaScript off. This step is
 * different: a shopper picks two or three colours before they want to see
 * anything, and a page load between each one turns a palette into a
 * questionnaire.
 *
 * So it is both. Every mark is a real `<a>` to the URL that toggles its colour,
 * which is exactly what the sidebar checkbox does and is what happens with
 * JavaScript off. With JavaScript on, the click is intercepted and kept local,
 * and only "Show Kompanions" navigates. Nothing is lost either way, and the URL
 * the button builds is the same URL the no-JS path would have arrived at.
 */

export type PickerColour = {
  key: string;
  label: string;
  swatch: Swatch;
  /** Products in this colour, catalogue-wide. */
  count: number;
  /** Where the no-JavaScript toggle goes. */
  toggleHref: string;
  /**
   * Indices into the catalogue of the products carrying this colour, used to
   * size a multi-colour selection without another round trip. Absent on a
   * catalogue too large to be worth shipping - the button then loses its
   * number, not its function.
   */
  members?: number[];
};

export default function ColourPicker({
  colours,
  selected,
  basePath,
  carry,
  allHref,
}: {
  colours: PickerColour[];
  /** Colour keys already in the URL - a shared link lands mid-selection. */
  selected: string[];
  basePath: string;
  /** Everything else in the URL, carried through to step two. */
  carry: Record<string, string>;
  /** The way past this step for a shopper who does not want to pick. */
  allHref: string;
}) {
  const [picked, setPicked] = useState<string[]>(selected);

  const chosen = colours.filter((colour) => picked.includes(colour.key));

  /**
   * How many products the selection reaches. A union, not a sum: one Kompanion
   * offered in rose and in sage is one result, and adding the counts would
   * promise two.
   */
  const total = useMemo(() => {
    if (!chosen.length) return null;
    if (chosen.some((colour) => !colour.members)) return null;

    const ids = new Set<number>();
    for (const colour of chosen) {
      for (const id of colour.members ?? []) ids.add(id);
    }

    return ids.size;
  }, [chosen]);

  const productsHref = useMemo(() => {
    const search = new URLSearchParams(carry);

    if (picked.length) search.set("colour", picked.join(","));
    else search.delete("colour");
    search.set("view", "products");

    return `${basePath}?${search.toString()}`;
  }, [basePath, carry, picked]);

  const toggle = (key: string) =>
    setPicked((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key]
    );

  return (
    <div>
      {/* One line, always.

          The palette reads as a single run of colour rather than as a block to
          scan row by row, so the marks divide the row evenly from `sm` up and
          the whole thing becomes a horizontal rail below it, where six coils
          side by side would each be the size of a thumbnail. `data-lenis-prevent`
          hands the gesture back to the browser - without it the page's smooth
          scroll swallows the horizontal swipe. */}
      <ul
        data-lenis-prevent
        data-lenis-prevent-horizontal
        className="no-scrollbar -mx-4 flex items-start gap-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-6 sm:px-0 lg:gap-8"
      >
        {colours.map((colour) => {
          const active = picked.includes(colour.key);

          return (
            <li
              key={colour.key}
              className="w-[8.5rem] shrink-0 sm:w-auto sm:flex-1 sm:basis-0"
            >
              <Link
                href={colour.toggleHref}
                scroll={false}
                prefetch={false}
                onClick={(event) => {
                  // Only reached once React is running. A click that lands
                  // before hydration follows the href instead and arrives at
                  // the same place.
                  event.preventDefault();
                  toggle(colour.key);
                }}
                className="group block text-center outline-none"
              >
                <span
                  className={clsx(
                    "relative mx-auto flex aspect-square w-full max-w-[13rem] items-center justify-center rounded-plate p-2.5 transition-all duration-300 ease-editorial sm:p-4",
                    active
                      ? "bg-card ring-1 ring-ink/25"
                      : "ring-1 ring-transparent group-hover:bg-card/70 group-focus-visible:ring-ink/40"
                  )}
                >
                  <ColourSpiral
                    swatch={colour.swatch}
                    className={clsx(
                      "transition-transform duration-500 ease-editorial",
                      active ? "scale-[0.94]" : "group-hover:scale-[1.03]"
                    )}
                  />

                  {/* The tick, not just a ring: at a glance a ringed spiral and
                      a hovered one look alike, and this step is the whole
                      point of the page. */}
                  <span
                    className={clsx(
                      "absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper transition-all duration-200 sm:right-2 sm:top-2 sm:h-7 sm:w-7",
                      active ? "scale-100 opacity-100" : "scale-50 opacity-0"
                    )}
                  >
                    <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </span>

                <span
                  className={clsx(
                    "mt-3 block text-[0.625rem] uppercase tracking-micro transition-colors sm:mt-4 sm:text-[0.6875rem]",
                    active ? "font-semibold text-ink" : "text-muted group-hover:text-ink"
                  )}
                >
                  {colour.label}
                </span>
                <span className="spec-mono mt-1 block text-muted tabular-nums">
                  {colour.count === 1 ? "1 Kompanion" : `${colour.count} Kompanions`}
                </span>

                {/* The state in words. `aria-pressed` would be the obvious
                    thing and is not allowed here - this is a link, not a
                    button, precisely so it still works with JavaScript off. */}
                {active ? <span className="sr-only">Selected</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* The step's own footer. Sticky rather than parked at the bottom of the
          page: on a phone the palette is taller than the screen, and a button
          you have to scroll back down to find is a button nobody presses. */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-12 border-t border-rule bg-paper/95 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 md:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {chosen.length ? (
              <>
                <span aria-hidden className="flex shrink-0 -space-x-2">
                  {chosen.slice(0, 6).map((colour) => (
                    <span
                      key={colour.key}
                      style={{ backgroundColor: colour.swatch.hex }}
                      className="h-6 w-6 rounded-full ring-1 ring-inset ring-ink/20"
                    />
                  ))}
                </span>
                <p className="ui-mono min-w-0 truncate">
                  {chosen.map((colour) => colour.label).join(", ")}
                </p>
              </>
            ) : (
              <p className="ui-mono text-muted">
                Pick a colour - or as many as you like.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {picked.length ? (
              <button
                type="button"
                onClick={() => setPicked([])}
                className="ui-mono text-muted underline decoration-1 underline-offset-4 hover:text-ink"
              >
                Clear
              </button>
            ) : (
              <Link
                href={allHref}
                className="ui-mono text-muted underline decoration-1 underline-offset-4 hover:text-ink"
              >
                Show everything
              </Link>
            )}

            <Link
              href={productsHref}
              scroll={false}
              aria-disabled={picked.length === 0}
              tabIndex={picked.length === 0 ? -1 : undefined}
              className={clsx(
                "btn-solid",
                picked.length === 0 && "pointer-events-none opacity-40"
              )}
            >
              {total === null
                ? "Show Kompanions"
                : total === 1
                  ? "Show 1 Kompanion"
                  : `Show ${total} Kompanions`}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
