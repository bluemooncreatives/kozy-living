"use client";

import { isValidInitials } from "@/lib/shop/add-ons";
import { Product, ProductAddOn, ProductVariant } from "@/lib/shopify/types";
import { addOns as addOnCopy } from "@/lib/site";
import clsx from "clsx";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import Price from "../price";
import {
  AddOnPicker,
  type AddOnChoice,
  type AddOnChoices,
} from "../product/add-on-picker";
import { useProduct } from "../product/product-context";
import { addItem, type CartActionState } from "./actions";
import { fromMinor, toMinor } from "./cart-math";
import { useCart } from "./cart-context";

/**
 * What is wrong with each picked add-on, by id. The same rules the server
 * enforces - checked here so the shopper hears about them before a round trip.
 */
function addOnErrors(chosen: ProductAddOn[], choices: AddOnChoices) {
  const errors: Record<string, string> = {};

  for (const addOn of chosen) {
    if (!addOn.textLabel) continue;
    const text = choices[addOn.id]?.text ?? "";

    if (addOn.textRequired && !text) {
      errors[addOn.id] = addOnCopy.errors.missingText;
    } else if (
      addOn.kind === "initials" &&
      text &&
      !isValidInitials(text, addOn.maxLength)
    ) {
      errors[addOn.id] = addOnCopy.errors.invalidInitials;
    }
  }

  return errors;
}

function SubmitButton({
  availableForSale,
  selectedVariant,
  hasOptionsToPick,
}: {
  availableForSale: boolean;
  selectedVariant: ProductVariant | undefined;
  hasOptionsToPick: boolean;
}) {
  const { pending } = useFormStatus();
  const base = "btn-outline w-full";

  if (!availableForSale) {
    return (
      <button disabled className={base}>
        Sold out
      </button>
    );
  }

  if (!selectedVariant) {
    return (
      <button
        aria-label={
          hasOptionsToPick
            ? "Please select an option"
            : "This product is unavailable"
        }
        disabled
        className={base}
      >
        {hasOptionsToPick ? "Select an option" : "Unavailable"}
      </button>
    );
  }

  // A product can be sellable overall while the chosen variant is not - the
  // previous version only checked the product and happily added a sold-out
  // variant, which Shopify then rejected.
  if (!selectedVariant.availableForSale) {
    return (
      <button disabled className={base}>
        Sold out
      </button>
    );
  }

  return (
    <button
      aria-label="Add to cart"
      aria-busy={pending}
      // Guards the double-submit that otherwise adds two units on a double
      // click. Quantity steppers in the cart are the place for bulk changes.
      disabled={pending}
      className={clsx(base, pending && "cursor-wait opacity-70")}
    >
      {pending ? "Adding…" : "Add to cart"} <span aria-hidden>&rarr;</span>
    </button>
  );
}

export function AddToCart({
  product,
  addOns = [],
}: {
  product: Product;
  /** Personalisation offered on this product. Empty hides the picker. */
  addOns?: ProductAddOn[];
}) {
  const { variants, availableForSale } = product;
  const { addCartItem, runCartMutation, reportStatus } = useCart();
  const { state } = useProduct();
  // Local, so a failure raised inside the cart drawer doesn't also light up an
  // error under the button on the product page.
  const [result, setResult] = useState<CartActionState>(null);
  const [choices, setChoices] = useState<AddOnChoices>({});
  // Errors appear after the first attempt, not while someone is still typing.
  const [attempted, setAttempted] = useState(false);

  // An option with a single value is not a choice, so it counts as chosen.
  // Otherwise a lone value had to be clicked like a pill before the button
  // woke up - the old "Initials: write them in notes" option did exactly that.
  const fixedOptions = new Set(
    product.options
      .filter((option) => option.values.length === 1)
      .map((option) => option.name.toLowerCase())
  );

  const variant = variants.find((variant: ProductVariant) =>
    variant.selectedOptions.every(
      (option) =>
        option.value === state[option.name.toLowerCase()] ||
        fixedOptions.has(option.name.toLowerCase())
    )
  );
  const defaultVariant = variants.length === 1 ? variants[0] : undefined;
  const selectedVariant = variant ?? defaultVariant;
  const hasOptionsToPick = variants.length > 1;

  const errorMessage = result && !result.ok ? result.message : "";

  const chosen = addOns.filter(
    (addOn) => addOn.available && choices[addOn.id]?.checked
  );
  const errors = addOnErrors(chosen, choices);
  const showPicker = addOns.length > 0 && availableForSale;

  // Price of what the button will add: the Kompanion and every extra picked.
  const totalMinor = selectedVariant
    ? chosen.reduce(
        (sum, addOn) => sum + toMinor(addOn.price.amount),
        toMinor(selectedVariant.price.amount)
      )
    : 0;

  const setChoice = (id: string, choice: AddOnChoice) =>
    setChoices((current) => ({ ...current, [id]: choice }));

  return (
    <>
      {showPicker ? (
        <AddOnPicker
          addOns={addOns}
          choices={choices}
          errors={attempted ? errors : {}}
          onChange={setChoice}
        />
      ) : null}

      {showPicker && chosen.length && selectedVariant ? (
        <p className="mb-4 flex items-baseline justify-between gap-3">
          <span className="spec-mono">{addOnCopy.totalLabel}</span>
          <Price
            className="ui-mono font-semibold"
            amount={fromMinor(totalMinor)}
            currencyCode={selectedVariant.price.currencyCode}
          />
        </p>
      ) : null}

      <form
        action={async () => {
          setResult(null);

          // Previously a non-null assertion. With no variants at all, or a
          // selection that matches none, this threw inside the optimistic
          // reducer and took the page down.
          if (!selectedVariant?.availableForSale) {
            setResult({
              ok: false,
              message: "Please choose an available option first.",
            });
            return;
          }

          const invalid = Object.keys(errors);
          if (invalid.length) {
            setAttempted(true);
            // To the first field that needs attention, which may be above the
            // fold on a phone once the cards have opened.
            document
              .querySelector<HTMLInputElement>(
                `[data-addon-field="${CSS.escape(invalid[0]!)}"]`
              )
              ?.focus();
            return;
          }

          const picked = chosen.map((addOn) => ({
            addOn,
            text: choices[addOn.id]?.text || undefined,
          }));

          addCartItem(selectedVariant, product, 1, picked);

          try {
            const outcome = await runCartMutation(() =>
              addItem(null, {
                merchandiseId: selectedVariant.id,
                quantity: 1,
                addOns: picked.map(({ addOn, text }) => ({ id: addOn.id, text })),
              })
            );
            setResult(outcome);
            // Mirrored into the drawer, which pops open on a successful add.
            reportStatus(outcome);

            // Cleared once it is in the cart, so a second add of the same
            // Kompanion is not silently personalised with the first one's
            // letters.
            if (outcome?.ok) {
              setChoices({});
              setAttempted(false);
            }
          } catch (error) {
            console.error(error);
            const failure = {
              ok: false,
              message: "We couldn't add that to your cart.",
            };
            setResult(failure);
            reportStatus(failure);
          }
        }}
      >
        <SubmitButton
          availableForSale={availableForSale}
          selectedVariant={selectedVariant}
          hasOptionsToPick={hasOptionsToPick}
        />
        {errorMessage ? (
          <p
            role="alert"
            className="spec-mono mt-3 rounded-full border border-ink/20 px-4 py-2 text-center"
          >
            {errorMessage}
          </p>
        ) : null}
        <p aria-live="polite" className="sr-only" role="status">
          {result?.message ?? ""}
        </p>
      </form>
    </>
  );
}
