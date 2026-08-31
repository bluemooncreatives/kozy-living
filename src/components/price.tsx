import clsx from "clsx";

/**
 * Formatted money. Renders a `<span>`, not a `<p>` - prices sit inline beside
 * titles, inside table cells and inside other inline runs throughout this
 * design, and a block-level `<p>` there is invalid nesting.
 *
 * The currency code is suppressed by default; pass `showCurrencyCode` where the
 * ambiguity actually matters (cart totals).
 */
const Price = ({
  amount,
  className,
  currencyCode = "INR",
  currencyCodeClassName,
  showCurrencyCode = false,
}: {
  amount: string;
  className?: string;
  currencyCode: string;
  currencyCodeClassName?: string;
  showCurrencyCode?: boolean;
}) => {
  const value = Number(amount);

  return (
    <span suppressHydrationWarning className={className}>
      {Number.isFinite(value)
        ? new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currencyCode,
            currencyDisplay: "narrowSymbol",
            maximumFractionDigits: 2,
          }).format(value)
        : "-"}
      {showCurrencyCode ? (
        <span className={clsx("ml-1 inline", currencyCodeClassName)}>
          {currencyCode}
        </span>
      ) : null}
    </span>
  );
};

export default Price;
