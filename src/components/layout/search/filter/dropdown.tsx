"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ListItem } from ".";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { FilterItem } from "./item";
import clsx from "clsx";

export default function FilterItemDropDown({
  list,
  label,
}: {
  list: ListItem[];
  label?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState("");
  const [openSelect, setOpenSelect] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenSelect(false);
      }
    };

    window.addEventListener("click", handleClickOutside);

    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    list.forEach((listItem: ListItem) => {
      if (
        ("path" in listItem && pathname === listItem.path) ||
        ("slug" in listItem && searchParams.get("sort") === listItem.slug)
      ) {
        setActive(listItem.title);
      }
    });
  }, [pathname, list, searchParams]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={openSelect}
        onClick={() => setOpenSelect(!openSelect)}
        className="ui-mono flex w-full items-center justify-between gap-3 rounded-full border border-oxblood px-4 py-2.5"
      >
        <span className="truncate">
          {label ? `${label}: ` : ""}
          {active || "All"}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={clsx(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            openSelect && "rotate-180"
          )}
        />
      </button>
      {openSelect ? (
        <ul
          onClick={() => setOpenSelect(false)}
          className="absolute z-40 mt-1 flex w-full flex-col gap-3 rounded-plate border border-oxblood bg-paper p-4"
        >
          {list.map((item: ListItem, i) => (
            <FilterItem item={item} key={i} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
