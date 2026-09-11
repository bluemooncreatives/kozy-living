"use client";

import clsx from "clsx";
import { useActionState, useEffect, useId } from "react";
import { newsletter } from "@/lib/site";
import { subscribeToNewsletter, type NewsletterState } from "./actions";

/**
 * The newsletter postcard.
 *
 * An airmail envelope with a card slipped inside it: striped border, a
 * perforated stamp in the corner, ruled address lines, and a postmark button.
 * The drawing is deliberate - a card that looks like something left by hand is
 * the only kind of interruption this brand can make without sounding like an
 * ad, and every detail here is paying for the interruption.
 *
 * Layout is one column at every width. The card already carries a lot of
 * ornament, and a responsive rearrangement on top of that reads as a different
 * component rather than the same one narrower.
 *
 * `useActionState` drives it, so it still posts and works with JavaScript off -
 * the server action is the submit target either way.
 */
export default function NewsletterPostcard({
  className,
  onSubscribed,
}: {
  className?: string;
  /** Called once Shopify has the address - the popup uses it to close itself. */
  onSubscribed?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    NewsletterState,
    FormData
  >(subscribeToNewsletter, null);
  const id = useId();

  useEffect(() => {
    if (state?.ok) onSubscribed?.();
  }, [state?.ok, onSubscribed]);

  return (
    <div className={clsx("postcard-frame w-full", className)}>
      <div className="postcard-card px-6 py-7 sm:px-9 sm:py-9">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="display-face text-display-lg font-normal lowercase text-ink">
              {state?.ok ? newsletter.thanks : newsletter.title}
            </h2>

            {state?.ok ? (
              <p className="mt-3 font-sans text-body italic text-muted" role="status">
                {state.already ? state.message : newsletter.thanksBody}
              </p>
            ) : (
              <p className="mt-3 font-sans text-body italic text-muted">
                {newsletter.body.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            )}
          </div>

          {/* The stamp. Decorative - the wordmark is already on the page, and
              read aloud here it would interrupt the heading. */}
          <span
            aria-hidden
            className="postcard-stamp flex shrink-0 items-center justify-center px-3.5 py-4 sm:px-4 sm:py-5"
          >
            <span className="display-face text-[0.9375rem] font-normal lowercase text-ink">
              {newsletter.stamp}
            </span>
          </span>
        </div>

        {state?.ok ? null : (
          <form action={formAction} className="mt-6">
            {/* Honeypot. Hidden from sight and from assistive tech, and out of
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

            <label htmlFor={`${id}-email`} className="sr-only">
              Email address
            </label>

            {/* The address block. Three ruled lines: the first is the field
                itself, the two beneath are the rest of the postcard showing
                through. Fixed heights rather than a repeating gradient so the
                field's underline lands exactly on its rule. */}
            <div className="flex h-[2.125rem] items-end">
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder={newsletter.placeholder}
                aria-invalid={state && !state.ok ? true : undefined}
                aria-describedby={
                  state && !state.ok ? `${id}-error` : `${id}-note`
                }
                className="postcard-field"
              />
            </div>
            <div aria-hidden className="h-[2.125rem] border-b border-rule" />
            <div aria-hidden className="h-[2.125rem] border-b border-rule" />

            {state && !state.ok ? (
              <p id={`${id}-error`} role="alert" className="spec-mono mt-3">
                {state.message}
              </p>
            ) : (
              <p id={`${id}-note`} className="spec-mono mt-3">
                {newsletter.note}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="postcard-submit mt-5 text-[1.0625rem]"
            >
              {isPending ? newsletter.sending : newsletter.cta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
