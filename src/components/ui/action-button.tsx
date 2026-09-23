"use client";

import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import gsap from "gsap";
import Link from "next/link";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

export type ActionIcon = "arrow" | "down" | "mail" | "plus";

const paths: Record<ActionIcon, string> = {
  arrow: "M7 17 17 7M9 7h8v8",
  down: "M12 5v14M6 13l6 6 6-6",
  mail: "M3 7h18v10H3zM3 7l9 6 9-6",
  plus: "M12 5v14M5 12h14",
};

function Icon({ name }: { name: ActionIcon }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

/**
 * The site's call to action: a pill with a circular icon node socketed into
 * its end. Used for every CTA on every page so one shape and one hover
 * behaviour carry the whole product.
 *
 * The hover has two halves. The icon well grows and turns through GSAP
 * `quickTo`, which lets a fast pointer reverse it mid-flight without the
 * queueing that makes CSS transitions feel sticky. The label ROLLS: it slides
 * up out of its slot and an identical copy rolls in beneath it (see
 * `.action-btn-roll` in globals.css). That half is pure CSS because it has no
 * mid-flight reversal problem - it is one transform on one element - and CSS
 * keeps it working before hydration.
 *
 * Renders an `<a>`, a `<Link>` or a `<button>` depending on what it is given,
 * so a form submit and a navigation share the same component.
 */
export default function ActionButton({
  label,
  href,
  icon = "arrow",
  variant = "outline",
  type,
  disabled,
  onClick,
  className,
  ...rest
}: {
  label: string;
  href?: string;
  icon?: ActionIcon;
  variant?: "outline" | "solid" | "glass";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
} & Record<string, unknown>) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = scope.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const well = el.querySelector<HTMLElement>(".action-btn-icon");
      if (!well) return;

      // scaleX/scaleY rather than the `scale` shorthand: GSAP cannot revert
      // the shorthand on cleanup and warns "not eligible for reset".
      const scaleX = gsap.quickTo(well, "scaleX", {
        duration: 0.4,
        ease: "power3.out",
      });
      const scaleY = gsap.quickTo(well, "scaleY", {
        duration: 0.4,
        ease: "power3.out",
      });
      const scale = (v: number) => {
        scaleX(v);
        scaleY(v);
      };
      const spin = gsap.quickTo(well, "rotation", {
        duration: 0.5,
        ease: "power3.out",
      });
      const enter = () => {
        scale(1.12);
        spin(45);
      };
      const leave = () => {
        scale(1);
        spin(0);
      };

      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
      el.addEventListener("focus", enter);
      el.addEventListener("blur", leave);

      return () => {
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointerleave", leave);
        el.removeEventListener("focus", enter);
        el.removeEventListener("blur", leave);
      };
    },
    { scope }
  );

  const classes = clsx(
    {
      outline: "action-btn",
      solid: "action-btn-solid",
      glass: "action-btn-glass",
    }[variant],
    disabled && "cursor-not-allowed opacity-45",
    className
  );

  const body = (
    <>
      <span className="action-btn-label">
        {/* The copy that rolls in is drawn from `data-text` by CSS, with an
            empty alternative text - so it is not in the DOM, and not read. */}
        <span className="action-btn-roll" data-text={label}>
          {label}
        </span>
      </span>
      <span className="action-btn-icon">
        <Icon name={icon} />
      </span>
    </>
  );

  if (href && !disabled) {
    // Route handlers get a plain <a> too, never a <Link>: <Link> PREFETCHES,
    // and a prefetch is a real GET. `/api/auth/logout` deletes every customer
    // cookie on GET, so the "Sign out" button on /account signed the customer
    // out the moment it scrolled into view in production; `/api/auth/login`
    // minted a new PKCE verifier each time. These leave the app anyway, so a
    // client transition has nothing to offer them.
    const external = /^(https?:|mailto:|tel:|\/api\/)/.test(href);

    if (external) {
      return (
        <a
          ref={scope as React.RefObject<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...rest}
        >
          {body}
        </a>
      );
    }

    return (
      <Link
        ref={scope as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...rest}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      ref={scope as React.RefObject<HTMLButtonElement>}
      type={type ?? "button"}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      {...rest}
    >
      {body}
    </button>
  );
}
