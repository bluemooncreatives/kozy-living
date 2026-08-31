import { SortFilterItem } from "@/lib/constants";
import { FilterItem } from "./item";
import FilterItemDropDown from "./dropdown";

export type PathFilterItem = { title: string; path: string };
export type ListItem = SortFilterItem | PathFilterItem;

/**
 * Horizontal filter rail. Collections read as an inline row of links on wide
 * screens and collapse to a dropdown below `lg`, where a row of eight
 * collection names would wrap into an unreadable block.
 */
export default function FilterList({
  list,
  title,
  layout = "inline",
}: {
  list: ListItem[];
  title?: string;
  layout?: "inline" | "compact";
}) {
  return (
    <nav className="flex items-center gap-4">
      {title ? (
        <span className="eyebrow hidden shrink-0 lg:inline">{title}</span>
      ) : null}

      <ul
        className={
          layout === "inline"
            ? "hidden flex-wrap items-center gap-x-6 gap-y-2 lg:flex"
            : "hidden items-center gap-x-6 lg:flex"
        }
      >
        {list.map((item: ListItem, i) => (
          <FilterItem key={i} item={item} />
        ))}
      </ul>

      <div className="w-full lg:hidden">
        <FilterItemDropDown list={list} label={title} />
      </div>
    </nav>
  );
}
