"use client";

import type { Menu } from "@/lib/shopify/types";
import Link from "next/link";
import { useState } from "react";

/**
 * The Shopify navigation hierarchy is the source of truth. A top-level item
 * remains a link to its own landing page, while its child items form a flyout
 * that is available on hover and keyboard focus.
 */
export default function DesktopMenu({ menu }: { menu: Menu[] }) {
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  return (
    <ul className="hidden items-center gap-6 md:flex">
      {menu.map((item) => {
        const hasChildren = Boolean(item.items?.length);
        const isOpen = openTitle === item.title;

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
              className="ui-mono inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
            >
              {item.title}
              {hasChildren ? <span aria-hidden className="text-[0.7em]">↓</span> : null}
            </Link>

            {hasChildren ? (
              <div
                aria-label={`${item.title} submenu`}
                className={`absolute left-0 top-full z-50 pt-4 transition-all duration-150 ${
                  isOpen
                    ? "visible translate-y-0 opacity-100"
                    : "invisible -translate-y-1 opacity-0"
                }`}
              >
                <ul className="grid min-w-72 grid-cols-2 gap-x-8 gap-y-1 border border-rule bg-paper p-4 shadow-[0_16px_32px_rgba(52,23,6,0.12)]">
                  {item.items!.map((child) => (
                    <li key={child.title}>
                      <Link
                        href={child.path}
                        prefetch
                        className="ui-mono block px-2 py-2 transition-colors hover:bg-wash"
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
