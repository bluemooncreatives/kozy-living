import { NextRequest, NextResponse } from "next/server";
import { getProducts, getCollections, getPages } from "@/lib/shopify";

export const runtime = "nodejs";

export type SearchResult = {
  products: {
    title: string;
    handle: string;
    price: string;
    currencyCode: string;
    image: string | null;
    altText: string;
  }[];
  collections: {
    title: string;
    handle: string;
  }[];
  pages: {
    title: string;
    handle: string;
  }[];
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json<SearchResult>(
      { products: [], collections: [], pages: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Fan out three data sources in parallel
  const [rawProducts, allCollections, allPages] = await Promise.all([
    getProducts({ query: q }).catch(() => []),
    getCollections().catch(() => []),
    getPages().catch(() => []),
  ]);

  const needle = q.toLocaleLowerCase();

  // Products - already filtered by Shopify's search API
  const products = rawProducts.slice(0, 6).map((p) => ({
    title: p.title,
    handle: p.handle,
    price: p.priceRange.minVariantPrice.amount,
    currencyCode: p.priceRange.minVariantPrice.currencyCode,
    image: p.featuredImage?.url ?? null,
    altText: p.featuredImage?.altText ?? p.title,
  }));

  // Collections - local filter on title + handle
  const collections = allCollections
    .filter(
      (c) =>
        c.handle && // skip the "All" sentinel with empty handle
        (c.title.toLocaleLowerCase().includes(needle) ||
          c.handle.replace(/-/g, " ").toLocaleLowerCase().includes(needle))
    )
    .slice(0, 4)
    .map((c) => ({ title: c.title, handle: c.handle }));

  // Pages - local filter on title + handle
  const pages = allPages
    .filter(
      (p) =>
        p.title.toLocaleLowerCase().includes(needle) ||
        p.handle.replace(/-/g, " ").toLocaleLowerCase().includes(needle)
    )
    .slice(0, 3)
    .map((p) => ({ title: p.title, handle: p.handle }));

  return NextResponse.json<SearchResult>(
    { products, collections, pages },
    { headers: { "Cache-Control": "no-store" } }
  );
}
