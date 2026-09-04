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
      className="h-4 w-4"
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
 * The hover is two tweens rather than a CSS transition because they have to
 * disagree: the icon well grows and rotates while the label slides the other
 * way, and `quickTo` lets a fast pointer reverse either of them mid-flight
 * without the queueing that makes CSS transitions feel sticky.
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
      const text = el.querySelector<HTMLElement>(".action-btn-label");
      if (!well || !text) return;

      const scale = gsap.quickTo(well, "scale", {
        duration: 0.4,
        ease: "power3.out",
      });
      const spin = gsap.quickTo(well, "rotation", {
        duration: 0.5,
        ease: "power3.out",
      });
      const slide = gsap.quickTo(text, "x", {
        duration: 0.4,
        ease: "power3.out",
      });

      const enter = () => {
        scale(1.12);
        spin(45);
        slide(-3);
      };
      const leave = () => {
        scale(1);
        spin(0);
        slide(0);
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
      <span className="action-btn-label">{label}</span>
      <span className="action-btn-icon">
        <Icon name={icon} />
      </span>
    </>
  );

  if (href && !disabled) {
    const external = /^(https?:|mailto:|tel:)/.test(href);

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
