"use client";

import clsx from "clsx";
import { useState } from "react";
import ActionButton from "@/components/ui/action-button";

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
        Thank you - we&apos;ll write when the next collection lands.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (email.trim()) setDone(true);
      }}
      className={clsx("flex w-full items-center gap-2", className)}
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
      <ActionButton
        label="Subscribe"
        type="submit"
        variant="solid"
        icon="arrow"
      />
    </form>
  );
}
