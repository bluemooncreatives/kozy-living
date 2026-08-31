"use client";

import { Product, ProductVariant } from "@/lib/shopify/types";
import clsx from "clsx";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useProduct } from "../product/product-context";
import { addItem, type CartActionState } from "./actions";
import { useCart } from "./cart-context";

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

export function AddToCart({ product }: { product: Product }) {
  const { variants, availableForSale } = product;
  const { addCartItem, runCartMutation, reportStatus } = useCart();
  const { state } = useProduct();
  // Local, so a failure raised inside the cart drawer doesn't also light up an
  // error under the button on the product page.
  const [result, setResult] = useState<CartActionState>(null);

  const variant = variants.find((variant: ProductVariant) =>
    variant.selectedOptions.every(
      (option) => option.value === state[option.name.toLowerCase()]
    )
  );
  const defaultVariant = variants.length === 1 ? variants[0] : undefined;
  const selectedVariant = variant ?? defaultVariant;
  const hasOptionsToPick = variants.length > 1;

  const errorMessage = result && !result.ok ? result.message : "";

  return (
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

        addCartItem(selectedVariant, product);

        try {
          const outcome = await runCartMutation(() =>
            addItem(null, { merchandiseId: selectedVariant.id, quantity: 1 })
          );
          setResult(outcome);
          // Mirrored into the drawer, which pops open on a successful add.
          reportStatus(outcome);
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
          className="spec-mono mt-3 rounded-full border border-oxblood px-4 py-2 text-center"
        >
          {errorMessage}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only" role="status">
        {result?.message ?? ""}
      </p>
    </form>
  );
}
