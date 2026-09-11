"use client";

import { ProductOption, ProductVariant } from "@/lib/shopify/types";
import { useProduct, useUpdateURL } from "./product-context";
import clsx from "clsx";

type Combination = {
  id: string;
  availableForSale: boolean;
  [key: string]: string | boolean;
};

/**
 * Variant picker.
 *
 * One pill per value, in the same shape as the shop's browse rail and filter
 * chips - selected is a solid indigo pill, the rest are outlined on the card
 * tint. Making a choice look like a control is the point: as a bare list of
 * radio glyphs these read as specification copy, and shoppers scrolled past
 * them without registering that there was anything to press.
 *
 * A combination the merchant does not stock stays visible and is struck
 * through as well as dimmed, so the state never rests on colour alone and a
 * shopper can see WHICH pairing is unavailable rather than watching options
 * silently disappear.
 */
export default function VariantSelector({
  options,
  variants,
}: {
  options: ProductOption[];
  variants: ProductVariant[];
}) {
  const { state, updateOption } = useProduct();
  const updateURL = useUpdateURL();
  const hasNoOptionsOrJustOneOption =
    !options.length ||
    (options.length === 1 && options[0]?.values.length === 1);

  if (hasNoOptionsOrJustOneOption) {
    return null;
  }

  const combinations: Combination[] = variants.map((variant) => ({
    id: variant.id,
    availableForSale: variant.availableForSale,
    ...variant.selectedOptions.reduce(
      (accumulator, option) => ({
        ...accumulator,
        [option.name.toLowerCase()]: option.value,
      }),
      {}
    ),
  }));

  return (
    <>
      {options.map((option) => (
        <form key={option.id} className="mb-6">
          <fieldset>
            <legend className="eyebrow text-muted">{option.name}</legend>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {option.values.map((value) => {
                const optionNameLowerCase = option.name.toLowerCase();

                // Base option params on the current selection so any other
                // option state is preserved.
                const optionParams = { ...state, [optionNameLowerCase]: value };

                const filtered = Object.entries(optionParams).filter(
                  ([key, value]) =>
                    options.find(
                      (option) =>
                        option.name.toLowerCase() === key &&
                        option.values.includes(value)
                    )
                );

                const isAvailableForSale = combinations.find((combination) =>
                  filtered.every(
                    ([key, value]) =>
                      combination[key] === value && combination.availableForSale
                  )
                );

                const isActive = state[optionNameLowerCase] === value;

                return (
                  <button
                    key={value}
                    formAction={() => {
                      const newState = updateOption(optionNameLowerCase, value);
                      updateURL(newState);
                    }}
                    aria-disabled={!isAvailableForSale}
                    disabled={!isAvailableForSale}
                    title={`${option.name} ${value}${
                      !isAvailableForSale ? " (out of stock)" : ""
                    }`}
                    aria-pressed={isActive}
                    className={clsx(
                      "ui-mono inline-flex items-center rounded-chip border px-3.5 py-2 text-center transition-colors duration-150",
                      isActive
                        ? "border-ink bg-ink font-semibold text-paper"
                        : isAvailableForSale
                          ? "border-ink/15 bg-card text-ink hover:border-ink"
                          : "cursor-not-allowed border-ink/10 text-muted line-through opacity-50"
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </form>
      ))}
    </>
  );
}
