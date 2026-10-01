"use client";

import { isValidInitials } from "@/lib/shop/add-ons";
import { rememberVariant } from "@/lib/shop/variant-preference";
import { Product, ProductAddOn, ProductVariant } from "@/lib/shopify/types";
import { addOns as addOnCopy, buyNow as buyNowCopy } from "@/lib/site";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Price from "../price";
import {
  AddOnPicker,
  type AddOnChoice,
  type AddOnChoices,
} from "../product/add-on-picker";
import { useSelectedVariant } from "../product/use-selected-variant";
import { addItem, buyNow, type CartActionState } from "./actions";
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

/** Which of the panel's two buttons sent the form. */
type Intent = "add" | "buy";

function SubmitButtons({
  availableForSale,
  selectedVariant,
  hasOptionsToPick,
  redirecting,
}: {
  availableForSale: boolean;
  selectedVariant: ProductVariant | undefined;
  hasOptionsToPick: boolean;
  /** Buy now has succeeded and the browser is on its way to checkout. */
  redirecting: boolean;
}) {
  // One form, so one pending state: while either button is working, both are
  // held. An Add to cart racing a Buy now is two carts changing at once for
  // one click's worth of intent. `data` is the submitted FormData, which
  // React builds with the button that was pressed, so it says which one.
  const { pending, data } = useFormStatus();
  const pendingIntent = pending ? (data?.get("intent") as Intent | null) : null;
  const busy = pending || redirecting;
  const base = "btn-outline w-full";

  if (!availableForSale) {
    return (
      <button disabled className={base}>
        Sold out
      </button>
    );
  }

  // No Buy now beside a disabled button: two dead buttons saying one thing.
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

  const adding = pendingIntent === "add";
  const buying = pendingIntent === "buy" || redirecting;

  return (
    <div className="space-y-3">
      <button
        type="submit"
        name="intent"
        value="add"
        aria-label="Add to cart"
        aria-busy={adding}
        // Guards the double-submit that otherwise adds two units on a double
        // click. Quantity steppers in the cart are the place for bulk changes.
        disabled={busy}
        className={clsx(base, busy && "cursor-wait opacity-70")}
      >
        {adding ? "Adding…" : "Add to cart"} <span aria-hidden>&rarr;</span>
      </button>
      {/* Solid, under the outline: the stronger, shorter path, and the order
          Shopify's own themes use, so it reads as the familiar pair. */}
      <button
        type="submit"
        name="intent"
        value="buy"
        aria-label={buyNowCopy.label}
        aria-busy={buying}
        disabled={busy}
        className={clsx("btn-solid w-full", busy && "cursor-wait opacity-70")}
      >
        {redirecting
          ? buyNowCopy.redirecting
          : buying
            ? buyNowCopy.pending
            : buyNowCopy.label}
      </button>
    </div>
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
  const { availableForSale } = product;
  const { addCartItem, runCartMutation, reportStatus, openCart, flagAdded } =
    useCart();
  // Shared with the price above the picker, so the figure shown is the
  // figure charged.
  const { selectedVariant, hasOptionsToPick } = useSelectedVariant(product);
  // Local, so a failure raised inside the cart drawer doesn't also light up an
  // error under the button on the product page.
  const [result, setResult] = useState<CartActionState>(null);
  const [choices, setChoices] = useState<AddOnChoices>({});
  // Errors appear after the first attempt, not while someone is still typing.
  const [attempted, setAttempted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // A deliberate pick is what a card's one-tap Buy now reaches for next time
  // - for this product, and as a hint ("M") for the others.
  useEffect(() => {
    if (hasOptionsToPick && selectedVariant) {
      rememberVariant(product.handle, selectedVariant);
    }
  }, [hasOptionsToPick, selectedVariant, product.handle]);

  // Back from Shopify's checkout can restore this page from the back/forward
  // cache exactly as it was left - mid-redirect, both buttons disabled. A
  // restored page fires `pageshow` with `persisted`; nothing else does.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
        action={async (formData: FormData) => {
          setResult(null);
          const intent: Intent =
            formData.get("intent") === "buy" ? "buy" : "add";

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

          if (intent === "buy") {
            // Never through the cart: no optimistic line, no drawer, no
            // status banner. This Kompanion goes to a checkout of its own and
            // the cart is left exactly as it was.
            try {
              const outcome = await buyNow({
                merchandiseId: selectedVariant.id,
                quantity: 1,
                addOns: picked.map(({ addOn, text }) => ({ id: addOn.id, text })),
              });
              if (outcome.ok) {
                // Held disabled until the page is gone - the action resolving
                // would otherwise re-enable both buttons for the second or so
                // the checkout takes to load, inviting a second cart. The
                // choices are kept: Back from checkout should find the
                // initials still typed.
                setRedirecting(true);
                window.location.assign(outcome.checkoutUrl);
              } else {
                setResult(outcome);
              }
            } catch (error) {
              console.error(error);
              setResult({ ok: false, message: buyNowCopy.errors.failed });
            }
            return;
          }

          addCartItem(selectedVariant, product, 1, picked);
          openCart();
          flagAdded(selectedVariant.id);

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
        <SubmitButtons
          availableForSale={availableForSale}
          selectedVariant={selectedVariant}
          hasOptionsToPick={hasOptionsToPick}
          redirecting={redirecting}
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
