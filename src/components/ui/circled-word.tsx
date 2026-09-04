"use client";

import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * A word with a hand-drawn ellipse looped around it, as the reference rings
 * "DESIGNS" in orange. Ours is sage, and it draws itself on when the heading
 * enters the viewport.
 *
 * The ellipse is a single open path with a deliberate overshoot past its own
 * start, which is what stops it reading as a machine-drawn oval. It is sized
 * in percentages of the wrapping span, so it tracks the word at any type size
 * and through any line wrap without measurement.
 */
export default function CircledWord({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scope = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const path = scope.current?.querySelector<SVGPathElement>("path");
      if (!path) return;

      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(path, { strokeDashoffset: 0 });
        return;
      }

      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 1.1,
        ease: "power2.inOut",
        scrollTrigger: { trigger: scope.current, start: "top 82%", once: true },
      });
    },
    { scope }
  );

  return (
    <span
      ref={scope}
      className={clsx("relative inline-block whitespace-nowrap", className)}
    >
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
        // Sits behind nothing and catches no clicks; it is pure decoration
        // that overhangs the word on every side.
        className="pointer-events-none absolute -inset-x-[6%] -inset-y-[18%] h-[136%] w-[112%]"
      >
        <path
          d="M104 6C64 3 18 12 8 30c-9 17 30 26 82 27 47 1 100-7 105-25C199 16 168 7 128 5"
          fill="none"
          stroke="var(--sage-deep)"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
