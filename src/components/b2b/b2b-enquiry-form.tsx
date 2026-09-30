"use client";

import clsx from "clsx";
import { useLenis } from "lenis/react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import ActionButton from "@/components/ui/action-button";
import { b2bEnquiry } from "@/lib/site";
import {
  submitB2BEnquiry,
  type B2BFieldName,
  type B2BState,
} from "./actions";

/**
 * The trade enquiry form. The contact form's language - bare pill fields, one
 * boxed textarea, one solid CTA - grouped into three numbered fieldsets, so a
 * form twice the length still reads as three short steps.
 *
 * Same contract as `ContactForm`: `useActionState` over a server action, so it
 * posts and works with JavaScript disabled, and every message a visitor reads
 * comes from the schema that guards the write. The browser's `required` stays
 * on as a first pass.
 *
 * The two choice groups are real radios, visually hidden, with the pill as
 * their label. That keeps arrow-key movement, `required` and form posting
 * native - a row of buttons writing to a hidden input gets none of that.
 */

const FIELD = "field-bare normal-case tracking-normal placeholder:normal-case";

const copy = b2bEnquiry.form;

export default function B2BEnquiryForm({ className }: { className?: string }) {
  const [state, formAction, isPending] = useActionState<B2BState, FormData>(
    submitB2BEnquiry,
    null
  );
  const id = useId();

  // The picked quantity pill, held only to decide whether the custom-number
  // field is on screen - the radios themselves stay uncontrolled. Re-seeded
  // from the echoed values whenever a submission comes back, because React
  // resets the form then and the pills fall back to `defaultChecked`.
  const [quantity, setQuantity] = useState("");
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setQuantity(state?.values?.quantity ?? "");
  }

  if (state?.ok) return <Received className={className} />;

  const error = (field: B2BFieldName) => state?.fieldErrors?.[field];
  const value = (field: B2BFieldName) => state?.values?.[field] ?? "";

  return (
    <form
      action={formAction}
      aria-busy={isPending || undefined}
      className={clsx("flex flex-col gap-10", className)}
    >
      {/* Honeypot - see the note in `actions.ts` on why it is not `company`. */}
      <div aria-hidden className="hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <p className="spec-mono -mb-4 text-right">
        <Req /> {copy.required}
      </p>

      <Section index={1} title={copy.sections[0]}>
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
          <Field
            id={`${id}-name`}
            name="name"
            label={copy.name}
            autoComplete="name"
            defaultValue={value("name")}
            error={error("name")}
          />
          <Field
            id={`${id}-company`}
            name="company"
            label={copy.company}
            autoComplete="organization"
            defaultValue={value("company")}
            error={error("company")}
          />
          <Field
            id={`${id}-email`}
            name="email"
            type="email"
            label={copy.email}
            autoComplete="email"
            defaultValue={value("email")}
            error={error("email")}
          />
          <Field
            id={`${id}-phone`}
            name="phone"
            type="tel"
            label={copy.phone}
            autoComplete="tel"
            inputMode="tel"
            defaultValue={value("phone")}
            error={error("phone")}
          />
        </div>
      </Section>

      <Section index={2} title={copy.sections[1]}>
        <Choices
          id={`${id}-business`}
          name="businessType"
          legend={copy.businessType}
          options={copy.businessTypes}
          selected={value("businessType")}
          error={error("businessType")}
        />
      </Section>

      <Section index={3} title={copy.sections[2]}>
        <div className="flex flex-col gap-7">
          <Field
            id={`${id}-products`}
            name="products"
            label={copy.products}
            placeholder={copy.productsHint}
            defaultValue={value("products")}
            error={error("products")}
          />

          <Choices
            id={`${id}-quantity`}
            name="quantity"
            legend={copy.quantity}
            unit={copy.quantityUnit}
            options={copy.quantities}
            selected={value("quantity")}
            error={error("quantity")}
            onSelect={setQuantity}
          />

          {/* Rendered only while "Customised" is picked, so its `required`
              never blocks a form that chose a band. The action checks it
              again. Text with a numeric keypad rather than type=number:
              number inputs swallow "2,500" and step on the scroll wheel. */}
          {quantity === copy.custom.option ? (
            <div className="b2b-reveal sm:max-w-xs">
              <Field
                id={`${id}-custom-quantity`}
                name="customQuantity"
                label={copy.custom.label}
                unit={copy.quantityUnit}
                inputMode="numeric"
                pattern="[0-9][0-9, ]*"
                title="Whole units, e.g. 2500"
                placeholder={copy.custom.placeholder}
                autoComplete="off"
                defaultValue={value("customQuantity")}
                error={error("customQuantity")}
              />
            </div>
          ) : null}

          <div>
            <label
              htmlFor={`${id}-message`}
              className="ui-mono flex items-baseline justify-between gap-3 normal-case tracking-normal"
            >
              {copy.message}
              <span className="spec-mono">{copy.optional}</span>
            </label>
            {/* Boxed, like the contact form's: an underline-only textarea reads
                as a broken input once the text wraps. */}
            <textarea
              id={`${id}-message`}
              name="message"
              rows={6}
              placeholder={copy.messageHint}
              defaultValue={value("message")}
              aria-invalid={error("message") ? true : undefined}
              aria-describedby={error("message") ? `${id}-message-error` : undefined}
              className="mt-3 w-full resize-y rounded-plate border border-rule bg-transparent p-4 font-sans text-ui tracking-normal text-ink placeholder:text-muted focus-visible:border-ink/20 focus-visible:ring-0"
            />
            <FieldError id={`${id}-message-error`}>{error("message")}</FieldError>
          </div>
        </div>
      </Section>

      {/* Form-level failures only; field ones already sit under their input. */}
      {state && !state.ok && !state.fieldErrors ? (
        <p className="spec-mono" role="alert">
          {state.message}
        </p>
      ) : null}

      <ActionButton
        label={isPending ? copy.sending : copy.submit}
        type="submit"
        variant="solid"
        icon="arrow"
        disabled={isPending}
        className="w-full justify-between"
      />
    </form>
  );
}

/* ----------------------------------------------------------------- pieces */

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="micro-mono mb-6 flex w-full items-center gap-3 text-muted">
        <span className="text-ink">{String(index).padStart(2, "0")}</span>
        {title}
        <span aria-hidden className="h-px flex-1 bg-rule" />
      </legend>
      {children}
    </fieldset>
  );
}

/** Required marker. The word "Required" above the form carries the meaning;
    the `required` attribute carries it to assistive tech. */
function Req() {
  return (
    <span aria-hidden className="text-sage-deep">
      *
    </span>
  );
}

function Field({
  id,
  name,
  label,
  unit,
  type = "text",
  autoComplete,
  inputMode,
  pattern,
  title,
  placeholder,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  label: string;
  unit?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="ui-mono normal-case tracking-normal">
        {label} <Req />
        {unit ? <span className="spec-mono ml-2">({unit})</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        title={title}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={clsx(FIELD, "mt-3 placeholder:text-muted")}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

function Choices({
  id,
  name,
  legend,
  unit,
  options,
  selected,
  error,
  onSelect,
}: {
  id: string;
  name: string;
  legend: string;
  unit?: string;
  options: readonly string[];
  selected?: string;
  error?: string;
  onSelect?: (value: string) => void;
}) {
  return (
    <fieldset
      className="min-w-0"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="ui-mono normal-case tracking-normal">
        {legend} <Req />
        {unit ? <span className="spec-mono ml-2">({unit})</span> : null}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="choice">
            <input
              type="radio"
              name={name}
              value={option}
              defaultChecked={selected === option}
              onChange={onSelect ? (event) => onSelect(event.target.value) : undefined}
              required
              className="choice-input sr-only"
            />
            <span className="choice-pill">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="choice-tick"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 8.5 6.5 11.5 12.5 4.5" pathLength={1} />
              </svg>
              {option}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </fieldset>
  );
}

function FieldError({
  id,
  children,
}: {
  id: string;
  children?: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="spec-mono mt-2">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------- received */

/**
 * The panel after Shopify has the brief. Replaces the form in place, with a
 * CSS entrance rather than `data-reveal`: it mounts after a click, long after
 * any scroll trigger for this panel has fired.
 */
function Received({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  // The form was ~1100px and this is ~300, so whoever pressed submit at the
  // foot of it is now looking at empty ground. Bring the answer up, under the
  // header (-100 is the offset Lenis's own anchors use), and hand it focus
  // so a screen reader lands on it too. Through Lenis when it is running: a
  // native scroll under it is overwritten on its next frame.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < 100) {
      if (lenis) lenis.scrollTo(el, { offset: -120 });
      else el.scrollIntoView({ block: "start" });
    }
    el.focus({ preventScroll: true });
    // Once, on mount - Lenis arriving later must not scroll the page again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className={clsx(
        "b2b-received flex scroll-mt-[calc(var(--header-h)+1.5rem)] flex-col items-start gap-6 outline-none",
        className
      )}
    >
      <span className="b2b-received-mark" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 10 17.5 19 7" pathLength={1} />
        </svg>
      </span>
      <p className="micro-mono text-muted">{copy.thanksEyebrow}</p>
      <p className="serif -mt-3 text-display-md text-balance">{copy.thanks}</p>
      <p className="body-mono max-w-measure">{copy.thanksBody}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
        <ActionButton label={copy.browse.label} href={copy.browse.href} variant="solid" />
        {/* A fresh mount clears the answer and the filled fields. */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="link-arrow"
        >
          {copy.another} <span aria-hidden>&rarr;</span>
        </button>
      </div>
    </div>
  );
}
