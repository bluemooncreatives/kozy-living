import type { CatalogProduct, Menu, Product } from "@/lib/shopify/types";

/** Deep menu branches represent product categories; top-level shelves can
 * contain many different kinds of Kompanion. Membership always comes from
 * Shopify, never a title guess. */
export function sameCategoryFor(
  product: Pick<Product, "id" | "collections">,
  catalog: CatalogProduct[],
  menu: Menu[],
) {
  const depths = new Map<string, number>();
  function visit(items: Menu[], depth: number) {
    for (const item of items) {
      const handle = item.path.match(/^\/search\/([^/?#]+)/)?.[1];
      if (handle) depths.set(handle, Math.max(depths.get(handle) ?? -1, depth));
      if (item.items) visit(item.items, depth + 1);
    }
  }
  visit(menu, 0);

  const candidates = product.collections
    .filter(
      ({ handle }) =>
        !/^(all|frontpage|homepage|best-sellers|bestsellers|new-arrivals)$/.test(
          handle,
        ) && !handle.startsWith("hidden"),
    )
    .map((collection) => ({
      ...collection,
      depth: depths.get(collection.handle) ?? -1,
      products: catalog.filter(
        (other) =>
          other.id !== product.id &&
          other.collections.some(({ handle }) => handle === collection.handle),
      ),
    }))
    .filter(({ products }) => products.length > 0)
    .sort(
      (a, b) =>
        b.depth - a.depth ||
        a.products.length - b.products.length ||
        a.handle.localeCompare(b.handle),
    );

  return candidates[0] ?? null;
}
