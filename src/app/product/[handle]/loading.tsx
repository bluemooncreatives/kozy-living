/**
 * What a product page looks like while it is on its way.
 *
 * Every route here is dynamic, so without this a click on a product link sat
 * on the old page until the server had the whole new one. This is the page's
 * own skeleton instead - the same grid, the same `6/7` gallery plate and the
 * same panel - so the layout is already in place when the product lands and
 * nothing jumps. It is also the boundary Next prefetches for a dynamic route,
 * which is what makes the swap to it instant.
 *
 * Deliberately wordless: a skeleton that says "Loading" is one more thing to
 * read in the half second before the real words arrive.
 */
export default function ProductLoading() {
  return (
    <div
      role="status"
      aria-busy
      className="shell grid grid-cols-1 gap-3 pb-10 pt-4 lg:grid-cols-[1.1fr_1fr]"
    >
      <span className="sr-only">Loading product</span>
      <div className="plate aspect-[6/7] w-full animate-pulse" />

      <div className="panel p-6 md:p-10">
        <div className="h-3 w-24 animate-pulse rounded-chip bg-wash" />
        <div className="mt-6 h-12 w-4/5 animate-pulse rounded-chip bg-wash md:h-16" />
        <div className="mt-4 h-5 w-28 animate-pulse rounded-chip bg-wash" />
        <div className="mt-10 space-y-3">
          <div className="h-3 w-full animate-pulse rounded-chip bg-wash" />
          <div className="h-3 w-11/12 animate-pulse rounded-chip bg-wash" />
          <div className="h-3 w-3/4 animate-pulse rounded-chip bg-wash" />
        </div>
        <div className="mt-10 h-12 w-full animate-pulse rounded-chip bg-wash" />
      </div>
    </div>
  );
}
