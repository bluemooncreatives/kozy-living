"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import clsx from "clsx";

export type SortOption = {
  title: string;
  href: string;
  active: boolean;
};

/**
 * Sort, as a dropdown of links.
 *
 * The old browse bar laid all five sorts out in a row beside eleven collection
 * links, which is where the shop chrome stopped being readable. One control
 * that names the sort in effect says the same thing in a tenth of the width.
 *
 * Client only for the dismiss behaviour - the items are ordinary links, so the
 * navigation itself is the same as every other filter on the page.
 */
export default function SortMenu({ options }: { options: SortOption[] }) {
  const current = options.find((option) => option.active) ?? options[0];

  return (
    <Menu as="div" className="relative">
      <MenuButton className="ui-mono flex max-w-[13rem] items-center gap-2 rounded-chip border border-ink/15 bg-card px-4 py-2 transition-colors hover:border-ink sm:max-w-none">
        <span className="eyebrow shrink-0 text-muted">Sort</span>
        <span className="truncate font-semibold">{current?.title}</span>
        <ChevronDownIcon aria-hidden className="h-4 w-4 shrink-0" />
      </MenuButton>

      <MenuItems
        anchor={{ to: "bottom end", gap: 6 }}
        className="z-50 w-56 rounded-plate border border-ink/15 bg-paper p-2 shadow-lift focus:outline-none"
      >
        {options.map((option) => (
          <MenuItem key={option.title}>
            <Link
              href={option.href}
              scroll={false}
              prefetch={false}
              aria-current={option.active ? "true" : undefined}
              className={clsx(
                "ui-mono block rounded-chip px-3 py-2 data-[focus]:bg-wash",
                option.active ? "font-semibold text-ink" : "text-muted"
              )}
            >
              {option.title}
            </Link>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
