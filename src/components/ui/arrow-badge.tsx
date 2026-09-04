import clsx from "clsx";

/** The ↗ glyph, drawn rather than typed so its weight matches the UI face. */
export function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={clsx("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

/**
 * Circular ↗ button parked in a card's top-right corner.
 *
 * In the reference every photographic card carries one, and the card cuts a
 * concave notch to receive it rather than letting it sit on top of the
 * photograph - see `.notch-tr` in globals.css. Pair the two: put `notch-tr`
 * on the media wrapper and this alongside it inside the same relative box.
 */
export default function CornerArrow({
  tone = "card",
  className,
}: {
  tone?: "card" | "sage";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        tone === "sage" ? "arrow-btn-sage" : "arrow-btn",
        // 2px inset -> centre 24px in, concentric with the r36 cut.
        "absolute right-0.5 top-0.5 z-10",
        className
      )}
    >
      <ArrowUpRight className="h-4 w-4" />
    </span>
  );
}
