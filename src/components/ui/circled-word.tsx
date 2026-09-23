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
  tone = "deep",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "deep" | "sage" | "white";
}) {
  const scope = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const path = scope.current?.querySelector<SVGPathElement>("path");
      if (!path) return;

      /**
       * How long this path is ON SCREEN, which is not what `getTotalLength()`
       * reports.
       *
       * That method measures in the path's own user units - the 200x60
       * viewBox - but this SVG carries `preserveAspectRatio="none"`, so the
       * shape is stretched non-uniformly to whatever box the word occupies,
       * and `vector-effect: non-scaling-stroke` then has the browser generate
       * the stroke, dashes included, in SCREEN space.
       *
       * The two numbers drift further apart the wider the word: around a long
       * phrase the browser was being told to draw 388 units of a path that
       * measures 660 on screen, so the ellipse stopped about 60% of the way
       * round and left the last word sitting outside the ring.
       *
       * `pathLength` is the textbook answer and does NOT work here - Chrome
       * normalises it against the user-space length while still dashing in
       * screen space, so the mismatch survives. Sampling the path and pushing
       * each point through its own CTM measures exactly what the browser is
       * about to dash, at any size, under any transform.
       */
      const screenLength = () => {
        const total = path.getTotalLength();
        const ctm = path.getScreenCTM();
        if (!ctm || !total) return total;

        let length = 0;
        let previous: DOMPoint | null = null;
        // 240 samples holds the error on this ellipse well under a pixel and
        // costs a fraction of a millisecond, once.
        for (let step = 0; step <= 240; step += 1) {
          const point = path
            .getPointAtLength((total * step) / 240)
            .matrixTransform(ctm);
          if (previous) {
            length += Math.hypot(point.x - previous.x, point.y - previous.y);
          }
          previous = point;
        }
        return length;
      };

      /** Draw nothing: one dash the length of the path, pushed fully off it. */
      const conceal = () => {
        const length = screenLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      };

      /**
       * Drawn. The dash is REMOVED rather than left at offset 0 - a later
       * resize restretches the path, and a stale dasharray measured against
       * the old width would cut the ring open again.
       */
      const reveal = () =>
        gsap.set(path, { strokeDasharray: "none", strokeDashoffset: 0 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        reveal();
        return;
      }

      conceal();

      ScrollTrigger.create({
        trigger: scope.current,
        start: "top 82%",
        once: true,
        onEnter: () => {
          // Re-measure here, not only at mount: fonts, a Suspense boundary
          // above, or a breakpoint change can all have resized the word
          // between the two moments, and the dash has to match the box it is
          // actually about to be drawn into.
          conceal();
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 1.1,
            ease: "power2.inOut",
            onComplete: reveal,
          });
        },
      });
    },
    { scope }
  );

  const strokeColor =
    tone === "white"
      ? "#ffffff"
      : tone === "sage"
      ? "var(--sage)"
      : "var(--sage-deep)";

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
          /* No dash in the markup on purpose: the ring ships drawn, and only
             the motion layer ever hides it. JavaScript failing costs the
             draw-on, never the ellipse. */
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
