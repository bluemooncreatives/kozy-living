import { getCollections } from "@/lib/shopify";
import FilterList from "./filter";
import { Suspense } from "react";

async function CollectionList() {
  const collections = await getCollections();
  return <FilterList list={collections} title="Browse" />;
}

export default function Collections() {
  return (
    <Suspense
      fallback={
        <div className="flex gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-20 animate-pulse rounded-full bg-wash" />
          ))}
        </div>
      }
    >
      <CollectionList />
    </Suspense>
  );
}
