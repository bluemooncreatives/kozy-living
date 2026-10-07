/**
 * The builder waits on one Shopify read (four metaobject types and the
 * pieces' variants). This holds the page's shape meanwhile, so the steps do
 * not arrive into a blank screen.
 */
export default function Loading() {
  return (
    <div className="shell pb-16 pt-8 md:pb-24" aria-busy="true">
      <div className="h-4 w-32 animate-pulse rounded-full bg-wash" />
      <div className="mt-5 h-12 w-full max-w-xl animate-pulse rounded-2xl bg-wash" />
      <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-5 lg:col-span-7">
          {[0, 1, 2, 3].map((step) => (
            <div key={step} className="panel h-56 animate-pulse" />
          ))}
        </div>
        <div className="panel h-[32rem] animate-pulse lg:col-span-5" />
      </div>
    </div>
  );
}
