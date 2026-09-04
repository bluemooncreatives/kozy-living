"use client";

import type { Menu } from "@/lib/shopify/types";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * The Shopify navigation hierarchy is the source of truth. A top-level item
 * stays a link to its own landing page, while its children form a flyout
 * available on hover and on keyboard focus.
 *
 * The whole row is sized to fit seven items beside the mark and the
 * utilities, so the type is a step down from the rest of the UI and the gaps
 * are tight. It only renders from `lg`; below that MobileMenu owns navigation.
 */
export default function DesktopMenu({ menu }: { menu: Menu[] }) {
  const [openTitle, setOpenTitle] = useState<string | null>(null);
  const pathname = usePathname();

  if (!menu.length) return null;

  /** A section is current when the route is its page or anything beneath it. */
  const isCurrent = (item: Menu) => {
    if (item.path === "/") return pathname === "/";
    const paths = [item.path, ...(item.items?.map((child) => child.path) ?? [])];
    return paths.some(
      (path) =>
        path !== "/" && (pathname === path || pathname.startsWith(`${path}/`))
    );
  };

  return (
    <ul className="ml-8 hidden items-center gap-5 lg:flex xl:gap-7">
      {menu.map((item) => {
        const hasChildren = Boolean(item.items?.length);
        const isOpen = openTitle === item.title;
        const current = isCurrent(item);

        return (
          <li
            key={item.title}
            className="relative"
            onMouseEnter={() => hasChildren && setOpenTitle(item.title)}
            onMouseLeave={() => setOpenTitle(null)}
            onFocusCapture={() => hasChildren && setOpenTitle(item.title)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setOpenTitle(null);
              }
            }}
          >
            <Link
              href={item.path}
              prefetch
              aria-haspopup={hasChildren ? "menu" : undefined}
              aria-expanded={hasChildren ? isOpen : undefined}
              aria-current={current ? "page" : undefined}
              className={clsx(
                "inline-flex items-center gap-1 whitespace-nowrap py-2 text-[0.8125rem] font-medium transition-colors",
                current ? "text-ink" : "text-ink/70 hover:text-ink"
              )}
            >
              {item.title}
              {hasChildren ? (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className={clsx(
                    "h-3 w-3 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              ) : null}
            </Link>

            {/* Underline marks the current section without moving anything. */}
            {current ? (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-px block h-px bg-ink"
              />
            ) : null}

            {hasChildren ? (
              <div
                aria-label={`${item.title} submenu`}
                className={clsx(
                  "absolute left-0 top-full z-50 pt-3 transition-all duration-150",
                  isOpen
                    ? "visible translate-y-0 opacity-100"
                    : "invisible -translate-y-1 opacity-0"
                )}
              >
                <ul
                  className={clsx(
                    "grid gap-x-6 gap-y-0.5 rounded-plate border border-rule bg-card p-3 shadow-lift",
                    // Long lists split into two columns so the flyout stays a
                    // panel rather than a column running off the viewport.
                    item.items!.length > 5
                      ? "min-w-[26rem] grid-cols-2"
                      : "min-w-[14rem] grid-cols-1"
                  )}
                >
                  {item.items!.map((child) => (
                    <li key={child.title}>
                      <Link
                        href={child.path}
                        prefetch
                        className="block whitespace-nowrap rounded-xl px-3 py-2 text-ui text-ink/80 transition-colors hover:bg-wash hover:text-ink"
                      >
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
