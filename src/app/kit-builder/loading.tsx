/**
 * The builder waits on one Shopify read (four metaobject types and the
 * pieces' variants). This holds the page's shape meanwhile - the first step
 * open, the rest folded, the review beside them - so the guide does not
 * arrive into a blank screen or shift the layout when it lands.
 */
export default function Loading() {
  return (
    <div className="shell pb-16 pt-8 md:pb-24" aria-busy="true">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="lg:col-span-7">
          <div className="h-4 w-32 animate-pulse rounded-full bg-wash" />
          <div className="mt-5 h-12 w-full max-w-xl animate-pulse rounded-2xl bg-wash" />
          <div className="mt-3 h-12 w-2/3 max-w-md animate-pulse rounded-2xl bg-wash" />
        </div>
        <div className="space-y-3 lg:col-span-5">
          <div className="h-4 w-full animate-pulse rounded-full bg-wash" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-wash" />
          <div className="flex gap-2 pt-2">
            {[0, 1, 2, 3].map((chip) => (
              <div key={chip} className="h-9 w-24 animate-pulse rounded-full bg-wash" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="panel h-[30rem] animate-pulse" />
          {[0, 1, 2].map((step) => (
            <div key={step} className="panel h-24 animate-pulse" />
          ))}
        </div>
        <div className="panel h-[34rem] animate-pulse lg:col-span-5" />
      </div>
    </div>
  );
}
