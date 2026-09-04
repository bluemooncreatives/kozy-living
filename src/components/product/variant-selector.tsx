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
 * Variant picker (DESIGN.md §5). No chips, no boxes - a plain vertical list of
 * radio glyphs and mono labels under a mono group heading. Unavailable
 * combinations are struck through as well as dimmed, so the state never relies
 * on colour alone.
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
            <legend className="ui-mono normal-case">{option.name}:</legend>
            <div className="mt-2 flex flex-col items-start gap-1">
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
                    className={clsx(
                      "flex items-center gap-2 py-0.5 text-left font-sans text-ui tracking-ui transition-opacity",
                      {
                        "cursor-default": isActive,
                        "hover:opacity-60": !isActive && isAvailableForSale,
                        "cursor-not-allowed line-through opacity-45":
                          !isAvailableForSale,
                      }
                    )}
                  >
                    <span aria-hidden className="text-[0.7em] leading-none">
                      {isActive ? "●" : "○"}
                    </span>
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
