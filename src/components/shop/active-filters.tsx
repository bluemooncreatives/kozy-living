import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Swatch } from "@/lib/shop/colours";

export type ActiveFilter = {
  /** The group the value came from, so two "Blue"s read differently. */
  group: string;
  label: string;
  /** The shop URL with this one filter removed. */
  href: string;
  /** Colour values only. Paints the chip so the filter is legible at a glance. */
  swatch?: Swatch;
};

/**
 * What is currently narrowing the grid, and one click to undo each of it.
 *
 * Sits above the products rather than inside the sidebar so it is visible on a
 * phone, where the sidebar is behind a button - the single worst failure of a
 * faceted grid is a shopper who cannot see why it is nearly empty.
 */
export default function ActiveFilters({
  filters,
  clearHref,
}: {
  filters: ActiveFilter[];
  clearHref: string;
}) {
  if (!filters.length) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1 text-muted">Filtering by</span>

      {filters.map((filter) => (
        <Link
          key={`${filter.group}-${filter.label}`}
          href={filter.href}
          scroll={false}
          prefetch={false}
          className="ui-mono group inline-flex items-center gap-2 rounded-chip border border-ink/15 bg-card py-1.5 pl-3.5 pr-2.5 transition-colors hover:border-ink hover:bg-ink hover:text-paper"
        >
          <span className="sr-only">Remove filter </span>
          {filter.swatch ? (
            <span
              aria-hidden
              style={{ backgroundColor: filter.swatch.hex }}
              className="-ml-1 h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-inset ring-ink/25"
            />
          ) : null}
          <span className="text-muted transition-colors group-hover:text-paper/70">
            {`${filter.group}:`}
          </span>
          <span className="font-semibold">{filter.label}</span>
          <XMarkIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
        </Link>
      ))}

      <Link
        href={clearHref}
        scroll={false}
        className="ui-mono ml-1 text-muted underline decoration-1 underline-offset-4 transition-colors hover:text-ink"
      >
        Clear all
      </Link>
    </div>
  );
}
