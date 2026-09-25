"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The masthead grid's scroll drift: cells marked `data-drift` travel up by
 * that many pixels across the grid's passage through the viewport, so the
 * second and fourth columns slide against the first and third and the grid
 * reads as two layers rather than one flat sheet.
 *
 * ON AN INNER WRAPPER, NEVER THE CELL. Each cell is also a child of a
 * `data-reveal-group`, and the motion layer animates the cell's own transform
 * for its entrance; two tweens on one element's `y` fight, and the loser
 * snaps. The drift wrapper sits one level in.
 *
 * Fine pointers and md+ only, and nothing under reduced motion: on a phone
 * the grid is two columns with no layers to separate, and a cell that moves
 * under the thumb that is scrolling it feels loose, not layered.
 */
export default function StoryHeroGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      // OWNED BY THE HOOK'S CONTEXT - never reverted by hand. A matchMedia
      // created inside `useGSAP` is recorded by its context, which reverts it
      // on unmount. This used to also return `() => mm.revert()` and wrap the
      // `add` callback in `contextSafe`: reverting the matchMedia reverted
      // its parent context, which ran that cleanup again, and navigating
      // away from the page died in "Maximum call stack size exceeded".
      // `mm.add` keeps its own context for the tweens made inside it.
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.utils.toArray<HTMLElement>("[data-drift]", root).forEach((el) => {
            const distance = Number(el.dataset.drift) || 0;
            gsap.fromTo(
              el,
              { y: distance / 2 },
              {
                y: -distance / 2,
                ease: "none",
                scrollTrigger: {
                  trigger: root,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.6,
                },
              },
            );
          });
        },
      );
    },
    { scope },
  );

  return (
    <div ref={scope} data-reveal-group className={className}>
      {children}
    </div>
  );
}
