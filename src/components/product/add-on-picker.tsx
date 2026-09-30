"use client";

import { cleanInitials } from "@/lib/shop/add-ons";
import type { ProductAddOn } from "@/lib/shopify/types";
import { addOns as copy } from "@/lib/site";
import clsx from "clsx";
import { useId } from "react";
import Price from "../price";

export type AddOnChoice = { checked: boolean; text: string };
export type AddOnChoices = Record<string, AddOnChoice>;

/**
 * The personalisation cards on the buy panel: one per add-on the merchant
 * offers (initials, gift box), each a checkbox with its price, opening a text
 * field when the add-on takes one.
 *
 * Controlled from `AddToCart`, which owns the choices because it is what sends
 * them. It sits beside the add-to-cart form rather than inside it, so Enter in
 * the initials field does not submit a half-finished personalisation.
 *
 * Everything shown here - titles, prices, help text, the return note - is the
 * merchant's, from the `product_add_on` metaobjects. Only the heading and the
 * field chrome are ours (`addOns` in site.ts).
 */
export function AddOnPicker({
  addOns,
  choices,
  errors,
  onChange,
}: {
  addOns: ProductAddOn[];
  choices: AddOnChoices;
  /** Messages by add-on id, shown only once a submit has been attempted. */
  errors: Record<string, string>;
  onChange: (id: string, choice: AddOnChoice) => void;
}) {
  const baseId = useId();

  return (
    <fieldset className="mb-6">
      <legend className="eyebrow text-muted">{copy.heading}</legend>

      <div className="mt-3 space-y-2">
        {addOns.map((addOn) => {
          const choice = choices[addOn.id] ?? { checked: false, text: "" };
          const checked = choice.checked && addOn.available;
          const fieldId = `${baseId}-${addOn.id}`;
          const errorId = `${fieldId}-error`;
          const error = errors[addOn.id];

          return (
            <div
              key={addOn.id}
              className={clsx(
                "rounded-2xl border px-4 py-3.5 transition-colors duration-150",
                checked ? "border-ink bg-paper" : "border-ink/15 bg-card",
                !addOn.available && "opacity-60"
              )}
            >
              <label
                className={clsx(
                  "flex items-start gap-3",
                  addOn.available ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!addOn.available}
                  onChange={(event) =>
                    onChange(addOn.id, {
                      ...choice,
                      checked: event.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
                />
                <span className="min-w-0 flex-1">
                  <span className="ui-mono block font-semibold normal-case">
                    {addOn.title}
                  </span>
                  {addOn.helpText ? (
                    <span className="spec-mono mt-1 block text-muted">
                      {addOn.helpText}
                    </span>
                  ) : null}
                  {!addOn.available ? (
                    <span className="micro-mono mt-1 block">
                      {copy.unavailable}
                    </span>
                  ) : null}
                </span>
                <span className="ui-mono shrink-0 whitespace-nowrap">
                  +{" "}
                  <Price
                    amount={addOn.price.amount}
                    currencyCode={addOn.price.currencyCode}
                  />
                </span>
              </label>

              {checked && (addOn.textLabel || addOn.policyNote) ? (
                <div className="mt-3 pl-7">
                  {addOn.textLabel ? (
                    <>
                      <label htmlFor={fieldId} className="spec-mono block">
                        {addOn.textLabel}
                      </label>
                      <div className="mt-1.5 flex items-center gap-3">
                        <input
                          id={fieldId}
                          type="text"
                          value={choice.text}
                          onChange={(event) =>
                            onChange(addOn.id, {
                              ...choice,
                              // Initials are filtered as they are typed, so
                              // the field only ever holds what will be
                              // stitched - the server applies the same rule.
                              text:
                                addOn.kind === "initials"
                                  ? cleanInitials(
                                      event.target.value,
                                      addOn.maxLength
                                    )
                                  : event.target.value.slice(0, addOn.maxLength),
                            })
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.preventDefault();
                          }}
                          maxLength={addOn.maxLength}
                          placeholder={
                            addOn.kind === "initials"
                              ? copy.initialsPlaceholder
                              : undefined
                          }
                          autoComplete="off"
                          autoCapitalize={
                            addOn.kind === "initials" ? "characters" : "sentences"
                          }
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint="done"
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? errorId : undefined}
                          data-addon-field={addOn.id}
                          className={clsx(
                            "field-bare min-w-0 flex-1 py-2.5",
                            // The letters read as a monogram; the hint stays
                            // a hint - uppercase tracking turned "e.g. KF"
                            // into "E.G. KF".
                            addOn.kind === "initials" &&
                              "uppercase tracking-[0.2em] placeholder:normal-case placeholder:tracking-normal",
                            error && "border-ink"
                          )}
                        />
                        <span
                          aria-hidden
                          className="spec-mono shrink-0 tabular-nums text-muted"
                        >
                          {choice.text.length}/{addOn.maxLength}
                        </span>
                      </div>
                    </>
                  ) : null}

                  {error ? (
                    <p id={errorId} role="alert" className="spec-mono mt-2">
                      {error}
                    </p>
                  ) : null}

                  {addOn.policyNote ? (
                    <p className="micro-mono mt-2">{addOn.policyNote}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
