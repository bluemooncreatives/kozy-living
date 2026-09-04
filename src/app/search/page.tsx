import Grid from "@/components/grid";
import ProductGridItems from "@/components/layout/product-grid-items";
import { defaultSort, sorting } from "@/lib/constants";
import { getProducts } from "@/lib/shopify";
import Link from "next/link";

export const metadata = {
  title: "Shop Collection",
  description: "Search curated home decor, artisanal furniture, and organic textiles from Kozy Living.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const sort = Array.isArray(resolvedSearchParams.sort)
    ? resolvedSearchParams.sort[0]
    : resolvedSearchParams.sort;
  const searchValue = Array.isArray(resolvedSearchParams.q)
    ? resolvedSearchParams.q[0]
    : resolvedSearchParams.q;
  const { sortKey, reverse } =
    sorting.find((item) => item.slug === sort) || defaultSort;
  const products = await getProducts({ sortKey, reverse, query: searchValue });
  const resultsText = products.length === 1 ? "result" : "results";

  return (
    <section>
      {searchValue ? (
        <p className="eyebrow mb-8 text-muted">
          {products.length === 0
            ? "No objects match"
            : `${products.length} ${resultsText} for`}{" "}
          <span className="text-ink">&ldquo;{searchValue}&rdquo;</span>
        </p>
      ) : null}

      {products.length > 0 ? (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ProductGridItems products={products} />
        </Grid>
      ) : (
        <div className="panel px-8 py-20 text-center">
          <p className="serif text-display-md">Nothing on this shelf yet</p>
          <p className="body-mono mx-auto mt-4 max-w-measure">
            {searchValue
              ? "Try a broader search term — a space, material, or category like 'Linen', 'Oak', or 'Lighting'."
              : "Our collection is being updated. Explore all handcrafted pieces."}
          </p>
          <Link href="/search" className="btn-solid mt-8">
            View all objects
          </Link>
        </div>
      )}
    </section>
  );
}
