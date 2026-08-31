"use client";

import clsx from "clsx";
import { useState } from "react";

/**
 * Newsletter capture: a bare underlined field and an arrow link, no box and no
 * fill (DESIGN.md §5).
 *
 * Deliberately client-side and self-contained - there is no subscriber backend
 * wired up yet, so this validates and acknowledges without claiming to have
 * stored anything. Point the submit handler at a route handler or Shopify
 * customer-marketing mutation when that endpoint exists.
 */
export default function Newsletter({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className={clsx("ui-mono", className)} role="status">
        Thank you - we&apos;ll write when the next harvest is roasted.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (email.trim()) setDone(true);
      }}
      className={clsx("flex w-full items-end gap-4", className)}
    >
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          autoComplete="email"
          className="field-bare"
        />
      </div>
      <button type="submit" className="link-arrow shrink-0 pb-2">
        Subscribe <span aria-hidden>&rarr;</span>
      </button>
    </form>
  );
}
