"use client";

import clsx from "clsx";
import { useActionState, useId } from "react";
import ActionButton from "@/components/ui/action-button";
import {
  subscribeToNewsletter,
  type NewsletterState,
} from "@/components/newsletter/actions";

/**
 * Newsletter capture for the footer: a bare underlined field and one pill, no
 * box and no fill (DESIGN.md §5). The postcard popup is the same signup wearing
 * the full drawing; this is the quiet version that sits in a rule of links.
 *
 * Both post to `subscribeToNewsletter`, so an address given here lands in
 * Shopify as a subscribed customer exactly as one given to the card does -
 * this form used to acknowledge without storing anything, and two signup
 * surfaces with different meanings is the kind of thing nobody finds until a
 * campaign goes out to half a list.
 */
export default function Newsletter({ className }: { className?: string }) {
  const [state, formAction, isPending] = useActionState<
    NewsletterState,
    FormData
  >(subscribeToNewsletter, null);
  const id = useId();

  if (state?.ok) {
    return (
      <p className={clsx("ui-mono", className)} role="status">
        {state.already
          ? state.message
          : "Thank you - we'll write when the next collection lands."}
      </p>
    );
  }

  return (
    <form action={formAction} className={clsx("w-full", className)}>
      {/* Honeypot - see the note in the postcard card. */}
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

      <div className="flex w-full items-center gap-2">
        <div className="flex-1">
          <label htmlFor={`${id}-email`} className="sr-only">
            Email address
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            placeholder="Email address"
            autoComplete="email"
            aria-invalid={state && !state.ok ? true : undefined}
            aria-describedby={state && !state.ok ? `${id}-error` : undefined}
            className="field-bare"
          />
        </div>
        <ActionButton
          label={isPending ? "Sending…" : "Subscribe"}
          type="submit"
          variant="solid"
          icon="arrow"
          disabled={isPending}
        />
      </div>

      {state && !state.ok ? (
        <p id={`${id}-error`} role="alert" className="spec-mono mt-2">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
