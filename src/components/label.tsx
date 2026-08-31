import clsx from "clsx";
import Price from "./price";

/**
 * Caption bar laid over an image tile: a mono row with the title left and the
 * price right, matching the product-cell footer used across the grids.
 */
export default function Label({
  title,
  amount,
  currencyCode,
  position = "bottom",
}: {
  title: string;
  amount: string;
  currencyCode: string;
  position?: "bottom" | "center";
}) {
  return (
    <div
      className={clsx("absolute inset-x-0 bottom-0 flex", {
        "lg:bottom-[35%]": position === "center",
      })}
    >
      <div className="flex w-full items-center justify-between gap-4 bg-paper/90 px-4 py-3 backdrop-blur-sm">
        <h3 className="ui-mono line-clamp-2 normal-case">{title}</h3>
        <Price
          className="ui-mono shrink-0 normal-case"
          amount={amount}
          currencyCode={currencyCode}
        />
      </div>
    </div>
  );
}
