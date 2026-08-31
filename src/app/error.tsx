"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-24">
      <p className="eyebrow">Something went wrong</p>
      <h2 className="serif mt-6 text-display-xl">
        The storefront stumbled
      </h2>
      <p className="body-mono mt-8 max-w-measure">
        This is usually temporary. Try the action again - if it keeps happening,
        write to us and we will look into it.
      </p>
      <button onClick={() => reset()} className="btn-outline mt-10 self-start">
        Try again
      </button>
    </div>
  );
}
