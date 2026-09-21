"use client";

import clsx from "clsx";
import Image from "next/image";
import { useActionState, useEffect, useId } from "react";
import { newsletter } from "@/lib/site";
import { subscribeToNewsletter, type NewsletterState } from "./actions";

/**
 * Concentric-ring ritual seal.
 * Text uses Title Case ("Shared Rituals / Mindful Days") as in the reference.
 */
function RitualSeal() {
  return (
    <svg viewBox="0 0 240 250" className="ritual-seal" aria-hidden="true">
      <g fill="none" stroke="currentColor">
        {Array.from({ length: 15 }, (_, index) => (
          <ellipse
            key={index}
            cx={120 + Math.sin(index * 2) * 1.8}
            cy={125 + Math.cos(index) * 1.4}
            rx={113 - index * 7.1}
            ry={121 - index * 7.55}
            strokeWidth={index % 3 === 0 ? 1.3 : 0.8}
            transform={`rotate(${index % 2 ? -4 : 3} 120 125)`}
          />
        ))}
      </g>
      <text x="120" y="117" textAnchor="middle">
        <tspan x="120">Shared Rituals</tspan>
        <tspan x="120" dy="26">
          Mindful Days
        </tspan>
      </text>
    </svg>
  );
}

export default function NewsletterPostcard({
  className,
  onSubscribed,
  headingId,
}: {
  className?: string;
  onSubscribed?: () => void;
  headingId?: string;
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
    <div className={clsx("ritual-card", className)}>
      {/* Blue K-tile frame — flush to all edges */}
      <div className="ritual-border" aria-hidden="true" />

      {/* Concentric-ring seal — top-right */}
      <RitualSeal />

      <div className="ritual-content">
        {/* Heading */}
        <h2 id={headingId} className="ritual-title">
          {state?.ok ? (
            newsletter.thanks
          ) : (
            <>
              Shall we
              <br />
              share a ritual
            </>
          )}
        </h2>

        {/* Body / form */}
        {state?.ok ? (
          <p className="ritual-copy" role="status">
            {state.already ? state.message : newsletter.thanksBody}
          </p>
        ) : (
          <>
            <p className="ritual-copy">
              {newsletter.body.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>

            {/*
             * Email form — dynamically rendered from site config.
             *
             * The floating "your email" label sits above the wavy underline
             * and fades when the visitor focuses or fills the field, matching
             * the reference image where the placeholder appears as visible
             * text rather than a greyed HTML placeholder.
             */}
            <form
              action={formAction}
              className="ritual-form"
              aria-busy={isPending}
            >
              {/* Honeypot — hidden from real users */}
              <div aria-hidden="true" className="hidden">
                <label htmlFor={`${id}-company`}>Company</label>
                <input
                  id={`${id}-company`}
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Accessible label (screen-readers only) */}
              <label htmlFor={`${id}-email`} className="sr-only">
                Email address
              </label>

              {/* Visible ghost label + wavy-underline wrapper */}
              <div className="ritual-email-line">
                <input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder=" "
                  aria-invalid={state && !state.ok ? true : undefined}
                  aria-describedby={
                    state && !state.ok ? `${id}-error` : undefined
                  }
                  className="ritual-field"
                />
                <span className="ritual-email-label" aria-hidden="true">
                  {newsletter.placeholder}
                </span>
              </div>

              {state && !state.ok ? (
                <p id={`${id}-error`} role="alert" className="ritual-error">
                  {state.message}
                </p>
              ) : null}

              {/* CTA button — label and loading text from site config */}
              <button
                type="submit"
                disabled={isPending}
                className="ritual-submit"
              >
                {isPending ? newsletter.sending : newsletter.cta}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Kozy Living logo — bottom-right, inside K-tile frame */}
      <div className="ritual-logo">
        <Image
          src="/logo/kozy-logo.png"
          alt="Kozy Living"
          width={3836}
          height={2160}
          sizes="(max-width: 600px) 100px, 180px"
        />
        <span>Rooted in Rituals</span>
      </div>
    </div>
  );
}
