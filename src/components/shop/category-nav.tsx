"use client";

import Link from "next/link";
import clsx from "clsx";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";
import { useHorizontalScrollPassthrough } from "@/hooks/use-horizontal-scroll-passthrough";

export type CategoryNavItem = {
  title: string;
  href: string;
  active: boolean;
  /** Marks a chip that carries a sub-category row when it is the one browsed. */
  group?: boolean;
};

export type CategoryNavSub = {
  /** The category the row belongs to, for the rail's accessible name. */
  label: string;
  items: CategoryNavItem[];
};

/**
 * One size for both rows, between the two they used to be.
 *
 * Sizing the rows apart was a second way of saying what the active treatment
 * already says. Two pill sizes that are close but not equal read as an
 * oversight rather than as a hierarchy, so the rows now match and the filled
 * chip alone marks which row is the parent.
 */
const CHIP_SIZE = "px-[0.7rem] py-[0.3rem] text-[0.72rem]";

/**
 * The phone's category browser.
 *
 * A flat rail of every collection is the wrong shape on a phone - twenty pills
 * in a scroller gives no sense of how the shop is organised and buries the
 * thing being looked for off the right edge. So the top row carries only the
 * merchandised groups, and the group being browsed opens a second row of its
 * sub-collections beneath.
 *
 * Which row is open is not state: it is wherever the shopper is. Tapping a
 * group navigates to it, and its children appear because that is now the
 * collection in the URL. The back button, a shared link and a reload therefore
 * all restore the same view for free - see `shop-view.tsx`, where the rows are
 * derived. Desktop keeps the flat rail, which has the width to carry it.
 */
function Rail({
  items,
  label,
  tone,
}: {
  items: CategoryNavItem[];
  label: string;
  tone: "primary" | "secondary";
}) {
  const railRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);
  useHorizontalScrollPassthrough(railRef);

  // The active chip is regularly off the right edge on a narrow screen - on
  // first paint, and again whenever a tap changes which chip is active.
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [items]);

  const primary = tone === "primary";

  return (
    <ul
      ref={railRef}
      aria-label={label}
      data-lenis-prevent-horizontal
      className={clsx(
        "no-scrollbar flex items-center gap-2 overflow-x-auto scroll-smooth px-0.5",
        primary ? "py-1" : "pb-1"
      )}
    >
      {items.map((item) => (
        <li
          key={item.href}
          ref={item.active ? activeItemRef : undefined}
          className="shrink-0"
        >
          <Link
            href={item.href}
            scroll={false}
            prefetch={false}
            aria-current={item.active ? "page" : undefined}
            className={clsx(
              "ui-mono inline-flex items-center gap-1.5 rounded-chip border transition-colors duration-150",
              CHIP_SIZE,
              item.active
                ? primary
                  ? "border-ink bg-ink font-semibold text-paper"
                  : "border-ink bg-card font-semibold text-ink"
                : "border-ink/15 bg-card text-muted hover:border-ink hover:text-ink"
            )}
          >
            <span className="truncate">{item.title}</span>
            {item.group ? (
              <ChevronDownIcon
                aria-hidden
                className={clsx(
                  "h-3 w-3 shrink-0 transition-transform duration-200",
                  item.active ? "rotate-180 text-paper/70" : "text-muted/60"
                )}
              />
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function CategoryNav({
  items,
  sub,
}: {
  items: CategoryNavItem[];
  sub: CategoryNavSub | null;
}) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Product categories"
      className="relative w-full min-w-0 overflow-hidden md:hidden"
    >
      <Rail items={items} label="Categories" tone="primary" />
      {sub ? (
        <Rail items={sub.items} label={`${sub.label} collections`} tone="secondary" />
      ) : null}
    </nav>
  );
}
