import Link from "next/link";
import clsx from "clsx";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { PriceBounds } from "@/lib/shop/facets";
import type { Swatch } from "@/lib/shop/colours";
import type { PriceSelection } from "@/lib/shop/filters";
import PriceFilter from "./price-filter";

/**
 * The filter sidebar.
 *
 * Every control is a link to another shop URL, so the whole panel is server
 * rendered, works with JavaScript off, and survives the back button. The only
 * client code on the browse surface is the price form's push and the mobile
 * drawer; the sections collapse with `<details>` rather than with state.
 *
 * Groups arrive already derived from the catalogue - see `lib/shop/facets.ts`.
 * Nothing here knows what a size or a collection is.
 */

export type PanelValue = {
  key: string;
  label: string;
  count: number;
  href: string;
  active: boolean;
  /** Colour values only. Rendered as a chip between the box and the label. */
  swatch?: Swatch;
};

export type PanelGroup = {
  param: string;
  label: string;
  values: PanelValue[];
  activeCount: number;
};

export type BrowseItem = {
  title: string;
  href: string;
  count: number;
  active: boolean;
};

/** Values beyond this fold into a "show all" disclosure. */
const VISIBLE_VALUES = 8;

function Section({
  label,
  activeCount,
  children,
  defaultOpen = true,
}: {
  label: string;
  activeCount?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rule-b py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="eyebrow">{label}</span>
        <span className="flex items-center gap-2">
          {activeCount ? (
            <span className="badge bg-ink text-paper">{activeCount}</span>
          ) : null}
          <ChevronDownIcon
            aria-hidden
            className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="spec-mono shrink-0 tabular-nums">{children}</span>
  );
}

/**
 * The paint chip beside a colour's name.
 *
 * Always ringed, never bare: Oat Milk and White are within a shade of the
 * panel's own surface, and without the ring the chip for either is a hole in
 * the row rather than a colour.
 */
function Chip({ swatch }: { swatch: Swatch }) {
  return (
    <span
      aria-hidden
      style={{ backgroundColor: swatch.hex }}
      className="mt-[0.1rem] h-4 w-4 shrink-0 rounded-[0.3rem] ring-1 ring-inset ring-ink/20"
    />
  );
}

/**
 * One multi-select row.
 *
 * A value that nothing left would match is rendered as text rather than a
 * link. It stays visible - a filter that disappears when you narrow past it
 * leaves you unable to see why the grid emptied - but it cannot be walked into.
 */
function ValueRow({ value }: { value: PanelValue }) {
  const box = (
    <span
      aria-hidden
      className={clsx(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-[0.3rem] border transition-colors",
        value.active
          ? "border-ink bg-ink text-paper"
          : "border-ink/25 bg-card group-hover/row:border-ink"
      )}
    >
      {value.active ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );

  const body = (
    <>
      {box}
      {value.swatch ? <Chip swatch={value.swatch} /> : null}
      <span className="min-w-0 flex-1 break-words">{value.label}</span>
      <Count>{value.count}</Count>
    </>
  );

  if (!value.active && value.count === 0) {
    return (
      <li>
        <span className="ui-mono flex items-start gap-2.5 py-1.5 text-muted opacity-45">
          {body}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={value.href}
        scroll={false}
        prefetch={false}
        aria-current={value.active ? "true" : undefined}
        className={clsx(
          "ui-mono group/row flex items-start gap-2.5 py-1.5 transition-colors",
          value.active ? "text-ink" : "text-muted hover:text-ink"
        )}
      >
        {body}
      </Link>
    </li>
  );
}

function ValueList({ values }: { values: PanelValue[] }) {
  const visible = values.slice(0, VISIBLE_VALUES);
  const hidden = values.slice(VISIBLE_VALUES);

  return (
    <>
      <ul>
        {visible.map((value) => (
          <ValueRow key={value.key} value={value} />
        ))}
      </ul>

      {hidden.length ? (
        // A nested <details> keeps "show all" free of client state. It opens
        // itself when one of the folded values is already applied, so a shared
        // link never hides the filter it arrived with.
        <details
          open={hidden.some((value) => value.active)}
          className="group/more"
        >
          <summary className="ui-mono mt-1.5 inline-flex cursor-pointer list-none items-center gap-1.5 text-muted underline decoration-1 underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="group-open/more:hidden">
              Show {hidden.length} more
            </span>
            <span className="hidden group-open/more:inline">Show less</span>
          </summary>
          <ul className="pt-1">
            {hidden.map((value) => (
              <ValueRow key={value.key} value={value} />
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

export default function FilterPanel({
  groups,
  price,
  priceSelection,
  priceAction,
  clearHref,
  hasFilters,
}: {
  browse?: BrowseItem[];
  groups: PanelGroup[];
  price: PriceBounds | null;
  priceSelection: PriceSelection | null;
  /** Where the price form posts, and the parameters it must carry through. */
  priceAction: { path: string; carry: Record<string, string> };
  clearHref: string;
  hasFilters: boolean;
}) {
  return (
    <div className="rule-t">

      {price ? (
        <Section label="Price">
          <PriceFilter
            key={`${priceSelection?.min ?? ""}-${priceSelection?.max ?? ""}`}
            bounds={price}
            selection={priceSelection}
            path={priceAction.path}
            carry={priceAction.carry}
          />
        </Section>
      ) : null}

      {groups.map((group) => (
        <Section
          key={group.param}
          label={group.label}
          activeCount={group.activeCount}
        >
          <ValueList values={group.values} />
        </Section>
      ))}

      {hasFilters ? (
        <div className="pt-5">
          <Link href={clearHref} scroll={false} className="btn-outline w-full">
            Clear all filters
          </Link>
        </div>
      ) : null}
    </div>
  );
}
