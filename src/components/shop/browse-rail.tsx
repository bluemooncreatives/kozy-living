"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useRef } from "react";

export type BrowseRailItem = {
  title: string;
  href: string;
  count: number;
  active: boolean;
};

/**
 * Category browse rail.
 *
 * Sits in the sticky shop bar beside the product count and Sort menu.
 * Displays all active catalogue categories as compact pills with their item
 * counts, automatically centering the selected category on navigation.
 */
export default function BrowseRail({ items }: { items: BrowseRailItem[] }) {
  const railRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [items]);

  const handleWheel = (e: React.WheelEvent<HTMLUListElement>) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && railRef.current) {
      railRef.current.scrollLeft += e.deltaY;
    }
  };

  if (!items.length) return null;

  return (
    <nav
      aria-label="Browse categories"
      className="relative min-w-0 flex-1 overflow-hidden"
    >
      <ul
        ref={railRef}
        data-lenis-prevent
        data-lenis-prevent-horizontal
        onWheel={handleWheel}
        className="no-scrollbar flex items-center gap-2 overflow-x-auto scroll-smooth py-1 px-0.5"
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
                "ui-mono inline-flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-xs transition-colors duration-150",
                item.active
                  ? "border-ink bg-ink font-semibold text-paper"
                  : "border-ink/15 bg-card text-muted hover:border-ink hover:text-ink"
              )}
            >
              <span className="truncate">{item.title}</span>
              <span
                className={clsx(
                  "spec-mono tabular-nums text-[0.7rem]",
                  item.active ? "text-paper/75" : "text-muted/65"
                )}
              >
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
