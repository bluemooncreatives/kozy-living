"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The site's motion layer.
 *
 * Deliberately driven by data attributes scanned from the DOM rather than by
 * wrapping components: every surface on the site opts in by writing
 * `data-reveal` on an element, and nothing has to import a motion component or
 * thread a prop. That is what makes the behaviour consistent end to end rather
 * than a set of one-off animations that drift apart.
 *
 *   data-reveal            fade and rise as it enters the viewport
 *   data-reveal-group      stagger the element's own children instead
 *   data-magnetic          the element leans toward the cursor
 *   data-parallax          drifts against the scroll, for large photography
 *
 * Everything is registered inside `useGSAP` scoped to the document with the
 * pathname as a dependency, so a route change reverts every tween and trigger
 * this created and rebuilds against the new DOM - no leaked ScrollTriggers,
 * which is the usual way a GSAP site slowly grinds to a halt during a session.
 */
export default function MotionProvider() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      // Tell the head script's watchdog that motion is alive, whether or not
      // we go on to animate anything. A window flag rather than a DOM
      // attribute: React reconciles attributes on <html>.
      (window as unknown as { __motionReady?: boolean }).__motionReady = true;

      if (reduced) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0 });
        return;
      }

      const ease = "power3.out";

      /* ------------------------------------------------------------ reveal */

      const settle = (targets: Element[]) =>
        targets.forEach((el) => el.setAttribute("data-reveal-done", ""));

      const solo = gsap.utils.toArray<HTMLElement>(
        "[data-reveal]:not([data-reveal-group])"
      );

      // Order matters: ScrollTrigger.batch fires onEnter for anything already
      // in view as soon as it refreshes. Setting the start state afterwards
      // would push those elements down *after* their reveal had played and
      // leave them stranded there.
      if (solo.length) {
        gsap.set(solo, { y: 26 });

        ScrollTrigger.batch(solo, {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease,
              stagger: 0.08,
              onComplete: () => settle(batch),
            }),
        });
      }

      // Grouped reveals stagger their children, which is what a grid or a
      // rail wants - the container fading as one block reads as a slab.
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
        const children = Array.from(group.children);
        if (!children.length) return;

        gsap.set(group, { opacity: 1 });
        gsap.set(children, { opacity: 0, y: 26 });

        ScrollTrigger.create({
          trigger: group,
          start: "top 88%",
          once: true,
          onEnter: () =>
            gsap.to(children, {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease,
              stagger: 0.09,
              onComplete: () => settle([group, ...children]),
            }),
        });
      });

      /* ---------------------------------------------------------- parallax */

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        const distance = Number(el.dataset.parallax) || 12;

        gsap.fromTo(
          el,
          { yPercent: -distance / 2 },
          {
            yPercent: distance / 2,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });

      /* ---------------------------------------------------------- magnetic */

      // Pointer-driven, so it is restricted to devices that actually have one.
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
      if (!fine.matches) return;

      const cleanups: Array<() => void> = [];

      gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((el) => {
        const pull = Number(el.dataset.magnetic) || 0.25;
        const moveX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
        const moveY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

        const onMove = (event: PointerEvent) => {
          const box = el.getBoundingClientRect();
          moveX((event.clientX - (box.left + box.width / 2)) * pull);
          moveY((event.clientY - (box.top + box.height / 2)) * pull);
        };

        const onLeave = () => {
          moveX(0);
          moveY(0);
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        });
      });

      return () => cleanups.forEach((off) => off());
    },
    { dependencies: [pathname], revertOnUpdate: true }
  );

  return null;
}
