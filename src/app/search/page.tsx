import ShopView from "@/components/shop/shop-view";
import { site } from "@/lib/site";

export const metadata = {
  title: "Shop Collection",
  description:
    "Search craft-led, conscious textiles from Kozy Living - waffle weave, slub cotton, linen blends and Dabu hand-block prints.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  return (
    <ShopView
      basePath="/search"
      eyebrow="All Kompanions"
      title="Your in-between Kompanions"
      description={site.description}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
