"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ListItem, type PathFilterItem } from ".";
import Link from "next/link";
import { createUrl } from "@/lib/utils";
import type { SortFilterItem } from "@/lib/constants";
import clsx from "clsx";

const itemClass = (active: boolean) =>
  clsx(
    "ui-mono whitespace-nowrap transition-opacity",
    active
      ? "underline decoration-1 underline-offset-4"
      : "opacity-70 hover:opacity-100"
  );

function PathFilterItem({ item }: { item: PathFilterItem }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === item.path;
  const newParams = new URLSearchParams(searchParams.toString());

  newParams.delete("q");
  newParams.delete("collection");

  return (
    <li key={item.title}>
      <Link
        href={createUrl(item.path, newParams)}
        aria-current={active ? "page" : undefined}
        className={itemClass(active)}
      >
        {item.title}
      </Link>
    </li>
  );
}

function SortFilterItem({ item }: { item: SortFilterItem }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("sort") === item.slug;
  const q = searchParams.get("q");

  const href = createUrl(
    pathname,
    new URLSearchParams({
      ...(q && { q }),
      ...(item.slug && item.slug.length && { sort: item.slug }),
    })
  );

  return (
    <li key={item.title}>
      <Link
        prefetch={!active ? false : undefined}
        href={href}
        aria-current={active ? "true" : undefined}
        className={itemClass(active)}
      >
        {item.title}
      </Link>
    </li>
  );
}

export function FilterItem({ item }: { item: ListItem }) {
  return "path" in item ? (
    <PathFilterItem item={item} />
  ) : (
    <SortFilterItem item={item} />
  );
}
