import clsx from "clsx";

/**
 * Cart affordance. Word plus count rather than an icon badge - it matches the
 * "CART (3)" treatment in the reference navigation and reads without decoding.
 */
export default function OpenCart({
  className,
  quantity,
}: {
  className?: string;
  quantity?: number;
}) {
  return (
    <span className={clsx("ui-mono transition-opacity hover:opacity-60", className)}>
      Cart ({quantity ?? 0})
    </span>
  );
}
