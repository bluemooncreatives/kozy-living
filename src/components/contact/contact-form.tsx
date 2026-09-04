"use client";

import clsx from "clsx";
import { useActionState, useId } from "react";
import {
  submitContactMessage,
  type ContactFieldName,
  type ContactState,
} from "./actions";

/**
 * The enquiry form (DESIGN.md §5): bare underlined fields, no boxes, one solid
 * pill for the send.
 *
 * `useActionState` drives it, so the form still posts and works with
 * JavaScript disabled - the server action is the submit target either way, and
 * the pending flag is the only thing the client adds.
 *
 * Validation deliberately lives in the action rather than here. The browser's
 * own `required`/`type=email` handling is left on as a first pass, but the
 * messages a visitor actually reads come back from the same schema that guards
 * the write, so the two can never disagree.
 */

const FIELD =
  "field-bare normal-case tracking-normal placeholder:normal-case";

export default function ContactForm({ className }: { className?: string }) {
  const [state, formAction, isPending] = useActionState<ContactState, FormData>(
    submitContactMessage,
    null
  );
  const id = useId();

  if (state?.ok) {
    return (
      <div className={clsx("flex flex-col items-start gap-6", className)}>
        <p className="serif text-display-sm" role="status">
          {state.message}
        </p>
        {/* A fresh mount clears the previous answer and the filled fields. */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="link-arrow"
        >
          Write another <span aria-hidden>&rarr;</span>
        </button>
      </div>
    );
  }

  const error = (field: ContactFieldName) => state?.fieldErrors?.[field];

  return (
    <form action={formAction} className={clsx("flex flex-col gap-8", className)}>
      {/* Honeypot. Hidden from sight and from assistive tech, and excluded from
          the tab order, so only a script that fills every input trips it. */}
      <div aria-hidden className="hidden">
        <label htmlFor={`${id}-company`}>Company</label>
        <input
          id={`${id}-company`}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <Field
          id={`${id}-name`}
          name="name"
          label="Name"
          autoComplete="name"
          required
          error={error("name")}
        />
        <Field
          id={`${id}-email`}
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          error={error("email")}
        />
      </div>

      <Field
        id={`${id}-phone`}
        name="phone"
        type="tel"
        label="Phone Number"
        autoComplete="tel"
        error={error("phone")}
      />

      <div>
        <label htmlFor={`${id}-message`} className="ui-mono normal-case tracking-normal">
          Message
        </label>
        {/* The one boxed control on the page - a textarea with only an
            underline reads as a broken input once the text wraps. */}
        <textarea
          id={`${id}-message`}
          name="message"
          rows={8}
          required
          aria-invalid={error("message") ? true : undefined}
          aria-describedby={error("message") ? `${id}-message-error` : undefined}
          className="mt-3 w-full resize-y rounded-plate border border-rule bg-transparent p-4 font-sans text-ui tracking-normal text-ink focus-visible:border-ink/20 focus-visible:ring-0"
        />
        <FieldError id={`${id}-message-error`}>{error("message")}</FieldError>
      </div>

      {/* Form-level failures only. Field-level ones are already under their
          inputs, and repeating them here reads as two separate problems. */}
      {state && !state.ok && !state.fieldErrors ? (
        <p className="spec-mono" role="alert">
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="btn-solid w-full" disabled={isPending}>
        {isPending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  required,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="ui-mono normal-case tracking-normal">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={clsx(FIELD, "mt-3")}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
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
