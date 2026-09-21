"use client";

import clsx from "clsx";
import Image from "next/image";
import { useActionState, useEffect, useId } from "react";
import { newsletter } from "@/lib/site";
import { subscribeToNewsletter, type NewsletterState } from "./actions";

/** Slightly uneven rings reproduce the reference's hand-printed ritual seal. */
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
      <text x="120" y="119" textAnchor="middle">
        <tspan x="120">shared Rituals</tspan>
        <tspan x="120" dy="25">
          mindful Days
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
      <div className="ritual-border" aria-hidden="true" />
      <RitualSeal />
      <div className="ritual-content">
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
            <form
              action={formAction}
              className="ritual-form"
              aria-busy={isPending}
            >
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
              <label htmlFor={`${id}-email`} className="sr-only">
                Email address
              </label>
              <div className="ritual-email-line">
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
                    state && !state.ok ? `${id}-error` : undefined
                  }
                  className="ritual-field"
                />
              </div>
              {state && !state.ok ? (
                <p id={`${id}-error`} role="alert" className="ritual-error">
                  {state.message}
                </p>
              ) : null}
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
