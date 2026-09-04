import Link from "next/link";
import type { Menu } from "@/lib/shopify/types";

/**
 * Category pills. A plain wrapped row of outlined chips - the reference keeps
 * its navigation flat and quiet so the photography and the wordmarks carry
 * the page.
 *
 * Items come from the Shopify menu, passed in by the server component that
 * renders the rail. Nothing here is hard-coded, so a category added in Admin
 * shows up in the nav, the drawer, the search overlay and this rail at once.
 */
export default function CollectionPillRail({
  items,
  allLabel = "All Kompanions",
}: {
  items: Menu[];
  /** Leading pill linking to the unfiltered catalogue. Pass "" to omit it. */
  allLabel?: string;
}) {
  if (!items.length) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2 md:gap-2.5">
      {allLabel ? (
        <li>
          <Link href="/search" className="pill">
            {allLabel}
          </Link>
        </li>
      ) : null}
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`}>
          <Link href={item.path} prefetch={false} className="pill">
            {item.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
