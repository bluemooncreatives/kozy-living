import { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopView from "@/components/shop/shop-view";
import { getCollections } from "@/lib/shopify";
import type { Collection } from "@/lib/shopify/types";
import { site } from "@/lib/site";

/**
 * `getCollections` is cached and is read by the view as well, so looking the
 * collection up here costs nothing beyond the first call in a request.
 */
async function findCollection(handle: string): Promise<Collection | undefined> {
  const collections = await getCollections();

  return collections.find(
    (collection) => collection.handle && collection.handle === handle
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection: handle } = await params;
  const collection = await findCollection(handle);

  if (!collection) return { title: "Collection" };

  return {
    title: collection.seo?.title || collection.title,
    description:
      collection.seo?.description ||
      collection.description ||
      `${collection.title} from ${site.name}.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { collection: handle } = await params;
  const collection = await findCollection(handle);

  // A handle Shopify does not publish is a 404, not an empty grid. Rendering
  // "this collection is empty" for a typo tells a shopper the store is bare
  // when the address is simply wrong, and tells search engines the same.
  if (!collection) notFound();

  return (
    <ShopView
      basePath={collection.path}
      collectionHandle={collection.handle}
      eyebrow="Collection"
      title={collection.title}
      description={collection.description || undefined}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
