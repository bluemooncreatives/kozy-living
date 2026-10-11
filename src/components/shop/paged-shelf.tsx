"use client";

import { useLenis } from "lenis/react";
import { useState, type MouseEvent, type ReactNode } from "react";

/**
 * A paged grid's page turn: shop by colour's and shop by mood's.
 *
 * The page is still the URL's (`&page=2`), and every control is still a
 * plain link in `Pagination` - this only handles what happens between the
 * click and the next page arriving:
 *
 *   the scroll   back to the top of the shelf, through Lenis, against the
 *                section's own scroll-margin. The links carry the section's
 *                `#hash`, and Lenis's `anchors` option would start its own
 *                scroll from a `window` listener with a -100px offset on top
 *                of the scroll-margin, landing a strip short. The click is
 *                stopped at React's root so that listener never hears it.
 *   the wait     the old page dims under a "Turning to page 2…" chip, rather
 *                than sitting there as though the click had not landed.
 *
 * The pending turn is dropped the moment `page` changes - the next page
 * committed, or the back button moved it. It used to be read as "pending
 * while the URL still shows the page it was clicked FROM", and Back returns
 * to exactly that page: the chip came back and stuck.
 */

/** A click the browser should keep: new tab, new window, download. */
const modified = (event: MouseEvent) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey;

export default function PagedShelf({
  page,
  anchor,
  turning,
  children,
}: {
  /** The page showing now. */
  page: number;
  /** The id of the section to bring back to the top on a turn. */
  anchor: string;
  /** "Turning to page" - the target page's number follows it. */
  turning: string;
  children: ReactNode;
}) {
  const lenis = useLenis();
  const [leaving, setLeaving] = useState<{ from: number; to: number } | null>(
    null,
  );
  // React's "adjust state when a prop changes", done during render rather
  // than in an effect, so no frame ever paints the stale chip.
  const [shown, setShown] = useState(page);
  if (shown !== page) {
    setShown(page);
    setLeaving(null);
  }
  const loading = leaving !== null && leaving.from === page;

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      "[data-pagination] a[href]",
    );
    if (!link || modified(event)) return;
    event.stopPropagation();

    const to = Number(new URL(link.href).searchParams.get("page") ?? "1") || 1;
    if (to === page) return;
    setLeaving({ from: page, to });

    const target = document.getElementById(anchor);
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, {
        duration: 1,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      className="paged-shelf"
      data-loading={loading ? "" : undefined}
      onClick={onClick}
    >
      {loading ? (
        <div className="shelf-turning" role="status">
          <span className="shelf-turning-pill">
            <span className="shelf-turning-spin" aria-hidden />
            {turning} {leaving!.to}…
          </span>
        </div>
      ) : null}
      <div className="paged-shelf-body" aria-busy={loading || undefined}>
        {children}
      </div>
    </div>
  );
}
