import Grid from "@/components/grid";
import ProductGridItems from "@/components/layout/product-grid-items";
import { defaultSort, sorting } from "@/lib/constants";
import { getCollections, getCollectionProducts } from "@/lib/shopify";
import { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection: handle } = await params;
  // The storefront client exposes the collection list rather than a
  // single-collection lookup, so match on the handle within its path.
  const collections = await getCollections();
  const collection = collections.find((item) => item.path === `/search/${handle}`);

  if (!collection) return { title: "Collection" };

  return {
    title: collection.seo?.title || collection.title,
    description:
      collection.seo?.description ||
      collection.description ||
      `${collection.title} from Vaishnavi Estate.`,
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
  const { collection } = await params;
  const { sort } = (await searchParams) || {};
  const { sortKey, reverse } =
    sorting.find((item) => item.slug === sort) || defaultSort;
  const products = await getCollectionProducts({
    collection,
    sortKey,
    reverse,
  });

  return (
    <section>
      {products.length === 0 ? (
        <div className="rounded-plate border border-rule px-8 py-20 text-center">
          <p className="serif text-display-md">This collection is empty</p>
          <p className="body-mono mx-auto mt-4 max-w-measure">
            Nothing from this lot is in stock right now. The rest of the harvest
            is still on the shelf.
          </p>
          <Link href="/search" className="btn-outline mt-8">
            View all coffee
          </Link>
        </div>
      ) : (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ProductGridItems products={products} />
        </Grid>
      )}
    </section>
  );
}
