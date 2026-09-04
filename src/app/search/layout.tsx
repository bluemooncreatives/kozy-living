import Collections from "@/components/layout/search/collections";
import FilterList from "@/components/layout/search/filter";
import { sorting } from "@/lib/constants";
import { Eyebrow, Headline } from "@/components/ui/section";
import CollectionPillRail from "@/components/ui/collection-pill-rail";
import { site } from "@/lib/site";
import { getPrimaryMenu } from "@/lib/shopify";
import { shopCategories } from "@/lib/menu";
import { Suspense } from "react";

/**
 * Shop chrome for every browse surface. The homepage's collection pills are
 * repeated here as the primary filter - the same affordance in the same shape,
 * so browsing feels continuous - with the Shopify-driven collection list and
 * sort kept in a hairline rail beneath.
 */
export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = shopCategories(await getPrimaryMenu());

  return (
    <>
      <div className="shell max-w-4xl py-10 md:py-14">
        <Eyebrow align="left">All Kompanions</Eyebrow>
        <Headline className="mt-4">
          Your in-between Kompanions
        </Headline>
        <p className="body-mono mt-5 max-w-measure text-pretty">
          {site.description}
        </p>
      </div>

      {categories.length ? (
        <div className="shell pb-8">
          <CollectionPillRail items={categories} />
        </div>
      ) : null}

      {/* Sticky under the header stack - `--header-h` is the single source. */}
      <div className="rule-y sticky top-[var(--header-h)] z-40 bg-paper/95 backdrop-blur-md">
        <div className="shell flex flex-col gap-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <Suspense
            fallback={
              <div className="h-4 w-64 animate-pulse rounded-chip bg-wash" />
            }
          >
            <Collections />
          </Suspense>
          <Suspense fallback={null}>
            <FilterList list={sorting} title="Sort" />
          </Suspense>
        </div>
      </div>

      <div className="shell py-8 md:py-10">{children}</div>
    </>
  );
}
