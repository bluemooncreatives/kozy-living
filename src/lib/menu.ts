import type { Menu } from "./shopify/types";

/**
 * The shopping categories inside the primary Shopify menu: the children of the
 * first top-level item that points into the catalogue.
 *
 * Not a flat "every child of every item" - more than one top-level item can
 * have children (this store's "The Kozy Story" carries a Founder Note and a
 * B2B enquiry page), and those are not categories to browse by. Falling back
 * to the first item with children keeps the rails populated on a store whose
 * shop link is not a /collections URL.
 */
export function shopCategories(menu: Menu[]): Menu[] {
  const catalogue = menu.find(
    (item) =>
      item.items?.length &&
      (item.path === "/search" || item.path.startsWith("/search/"))
  );

  return (catalogue ?? menu.find((item) => item.items?.length))?.items ?? [];
}
