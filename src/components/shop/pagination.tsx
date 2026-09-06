import Link from "next/link";
import clsx from "clsx";
import { ArrowLongLeftIcon, ArrowLongRightIcon } from "@heroicons/react/24/outline";

/**
 * Page navigation for the grid.
 *
 * Links, not a "load more" button: the page number is part of the shop URL, so
 * a result page can be shared, indexed and returned to with the back button
 * with the same grid on it.
 *
 * The window keeps the first page, the last page and the current page's
 * neighbours, so the control stays one line wide whether there are three pages
 * or three hundred.
 */

/** Pages either side of the current one that stay visible. */
const NEIGHBOURS = 1;

function windowed(page: number, totalPages: number): (number | "gap")[] {
  const shown = new Set<number>([1, totalPages]);

  for (let offset = -NEIGHBOURS; offset <= NEIGHBOURS; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= totalPages) shown.add(candidate);
  }

  const pages = [...shown].sort((a, b) => a - b);
  const items: (number | "gap")[] = [];

  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    // A single missing page is written out rather than hidden behind an
    // ellipsis that would take the same width.
    if (previous !== undefined && value - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && value - previous > 2) items.push("gap");
    items.push(value);
  });

  return items;
}

export default function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const items = windowed(page, totalPages);
  const step =
    "ui-mono inline-flex h-10 items-center gap-2 rounded-chip border px-4 transition-colors";

  return (
    <nav aria-label="Pagination" className="rule-t mt-10 pt-6">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li className="mr-auto">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              rel="prev"
              className={clsx(step, "border-ink/15 hover:border-ink hover:bg-ink hover:text-paper")}
            >
              <ArrowLongLeftIcon aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          ) : (
            <span className={clsx(step, "border-transparent text-muted opacity-40")}>
              <ArrowLongLeftIcon aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </span>
          )}
        </li>

        {items.map((item, index) =>
          item === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden
              className="ui-mono flex h-10 w-6 items-center justify-center text-muted"
            >
              &hellip;
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                prefetch={false}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={clsx(
                  "ui-mono flex h-10 w-10 items-center justify-center rounded-full tabular-nums transition-colors",
                  item === page
                    ? "bg-ink font-semibold text-paper"
                    : "text-muted hover:bg-wash hover:text-ink"
                )}
              >
                {item}
              </Link>
            </li>
          )
        )}

        <li className="ml-auto">
          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              rel="next"
              className={clsx(step, "border-ink/15 hover:border-ink hover:bg-ink hover:text-paper")}
            >
              <span className="hidden sm:inline">Next</span>
              <ArrowLongRightIcon aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <span className={clsx(step, "border-transparent text-muted opacity-40")}>
              <span className="hidden sm:inline">Next</span>
              <ArrowLongRightIcon aria-hidden className="h-4 w-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
