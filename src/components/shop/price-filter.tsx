"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { PriceBounds } from "@/lib/shop/facets";
import type { PriceSelection } from "@/lib/shop/filters";

/**
 * The price band.
 *
 * A real `<form method="get">` carrying the rest of the shop state as hidden
 * fields, so it filters correctly with JavaScript off - the one filter that
 * cannot be expressed as a link, because the value is typed rather than chosen.
 * With JavaScript on, the submit is intercepted and pushed through the router
 * instead, which keeps it as quick as every other filter and drops the empty
 * parameters a native GET would leave in the URL.
 *
 * `page` is deliberately not carried: a new band is a new result set.
 *
 * The typed values are local state seeded from the URL, and the panel keys this
 * component on the applied band - so a back button, a cleared filter or a move
 * to another collection remounts it with the right numbers in the boxes,
 * without an effect racing the keystrokes.
 */
export default function PriceFilter({
  bounds,
  selection,
  path,
  carry,
}: {
  bounds: PriceBounds;
  selection: PriceSelection | null;
  path: string;
  carry: Record<string, string>;
}) {
  const router = useRouter();
  const id = useId();
  const [min, setMin] = useState(selection?.min?.toString() ?? "");
  const [max, setMax] = useState(selection?.max?.toString() ?? "");

  const currency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: bounds.currencyCode || "INR",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(value);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams(carry);
    if (min.trim()) params.set("price_min", min.trim());
    if (max.trim()) params.set("price_max", max.trim());

    const query = params.toString();
    router.push(query ? `${path}?${query}` : path, { scroll: false });
  };

  return (
    <form method="get" action={path} onSubmit={submit} className="flex flex-col gap-3">
      {Object.entries(carry).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-min`} className="sr-only">
            Minimum price
          </label>
          <input
            id={`${id}-min`}
            name="price_min"
            type="number"
            inputMode="numeric"
            min={bounds.min}
            max={bounds.max}
            step="1"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder={String(bounds.min)}
            className="field-bare px-3 py-2 text-ui"
          />
        </div>
        <span aria-hidden className="spec-mono shrink-0">
          to
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-max`} className="sr-only">
            Maximum price
          </label>
          <input
            id={`${id}-max`}
            name="price_max"
            type="number"
            inputMode="numeric"
            min={bounds.min}
            max={bounds.max}
            step="1"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder={String(bounds.max)}
            className="field-bare px-3 py-2 text-ui"
          />
        </div>
      </div>

      <p className="spec-mono">
        {currency(bounds.min)} - {currency(bounds.max)} across this selection
      </p>

      <button type="submit" className="btn-outline w-full">
        Apply price
      </button>
    </form>
  );
}
