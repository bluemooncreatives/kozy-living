import clsx from "clsx";

/**
 * Cart affordance. A circular outlined control matching the account and search
 * buttons beside it, with the line count as a yellow counter rather than a
 * parenthetical - the reference keeps every header utility the same shape.
 */
export default function OpenCart({
  className,
  quantity,
}: {
  className?: string;
  quantity?: number;
}) {
  return (
    <span
      className={clsx(
        "relative flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-card transition-colors hover:bg-ink hover:text-paper",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {quantity ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow px-1 text-[0.5625rem] font-bold text-ink">
          {quantity}
        </span>
      ) : null}
    </span>
  );
}
