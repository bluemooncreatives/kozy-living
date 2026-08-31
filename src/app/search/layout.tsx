import Collections from "@/components/layout/search/collections";
import FilterList from "@/components/layout/search/filter";
import { sorting } from "@/lib/constants";
import { Eyebrow, Headline } from "@/components/ui/section";
import CollectionPillRail from "@/components/ui/collection-pill-rail";
import { site } from "@/lib/site";
import { Suspense } from "react";

/**
 * Shop chrome for every browse surface. The homepage's collection pills are
 * repeated here as the primary filter - the same affordance in the same shape,
 * so browsing feels continuous - with the Shopify-driven collection list and
 * sort kept in a hairline rail beneath.
 */
export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="shell rule-b py-10 text-center md:py-14">
        <Eyebrow>The Collection</Eyebrow>
        <Headline className="mt-4">Thoughtful Objects for Mindful Spaces</Headline>
        <p className="body-mono mx-auto mt-5 max-w-measure text-balance">
          {site.description}
        </p>
      </div>

      <div className="rule-b py-8">
        <CollectionPillRail />
      </div>

      {/* Sticky under the header stack - `--header-h` is the single source. */}
      <div className="sticky top-[var(--header-h)] z-40 rule-b bg-paper/95 backdrop-blur-md">
        <div className="shell flex flex-col gap-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <Suspense
            fallback={
              <div className="h-4 w-64 animate-pulse rounded-full bg-wash" />
            }
          >
            <Collections />
          </Suspense>
          <Suspense fallback={null}>
            <FilterList list={sorting} title="Sort" />
          </Suspense>
        </div>
      </div>

      <div className="py-6">{children}</div>
    </>
  );
}
