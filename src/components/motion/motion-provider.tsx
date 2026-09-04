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
 * wrapping components: every surface opts in by writing `data-reveal` on an
 * element, and nothing has to import a motion component or thread a prop.
 * That is what keeps the behaviour consistent end to end rather than a set of
 * one-off animations that drift apart.
 *
 *   data-reveal            fade and rise as it enters the viewport
 *   data-reveal-group      stagger the element's own children instead
 *   data-magnetic          the element leans toward the cursor
 *   data-parallax          drifts against the scroll, for large photography
 *
 * Registered inside `useGSAP` with the pathname as a dependency, so a route
 * change reverts every tween and trigger this created and rebuilds against the
 * new DOM - no leaked ScrollTriggers, which is the usual way a GSAP site
 * slowly grinds to a halt over a session.
 *
 * TWO TIMING RULES, both learned the hard way on a streaming App Router page:
 *
 * 1. Nothing is touched until after hydration. Content inside a `<Suspense>`
 *    boundary is present in the streamed HTML before React hydrates it, so
 *    setting a transform on it early makes React find a `style` attribute it
 *    never rendered - a hydration mismatch, and the tree is then not patched.
 *
 * 2. The DOM is watched, not scanned once. Those same boundaries resolve after
 *    the first pass, and an element hidden by CSS but never claimed by a
 *    trigger stays at `opacity: 0` for good - a whole product rail silently
 *    missing from the page.
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
      const seen = new WeakSet<Element>();
      const cleanups: Array<() => void> = [];
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

      /** Returns only the nodes not already wired up by an earlier pass. */
      const claim = <T extends Element>(nodes: T[]) =>
        nodes.filter((node) => {
          if (seen.has(node)) return false;
          seen.add(node);
          return true;
        });

      const settle = (targets: Element[]) =>
        targets.forEach((el) => el.setAttribute("data-reveal-done", ""));

      /* ------------------------------------------------------------ reveal */

      const registerReveals = () => {
        const solo = claim(
          gsap.utils.toArray<HTMLElement>(
            "[data-reveal]:not([data-reveal-group])"
          )
        );

        // Order matters: ScrollTrigger.batch fires onEnter for anything
        // already in view as soon as it refreshes. Setting the start state
        // afterwards would push those elements down *after* their reveal had
        // played and strand them there.
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
        // rail wants - a container fading as one block reads as a slab.
        claim(gsap.utils.toArray<HTMLElement>("[data-reveal-group]")).forEach(
          (group) => {
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
          }
        );
      };

      /* ---------------------------------------------------------- parallax */

      const registerParallax = () =>
        claim(gsap.utils.toArray<HTMLElement>("[data-parallax]")).forEach(
          (el) => {
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
          }
        );

      /* ---------------------------------------------------------- magnetic */

      const registerMagnetic = () => {
        if (!fine.matches) return;

        claim(gsap.utils.toArray<HTMLElement>("[data-magnetic]")).forEach(
          (el) => {
            const pull = Number(el.dataset.magnetic) || 0.25;
            const moveX = gsap.quickTo(el, "x", {
              duration: 0.5,
              ease: "power3.out",
            });
            const moveY = gsap.quickTo(el, "y", {
              duration: 0.5,
              ease: "power3.out",
            });

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
          }
        );
      };

      /* ------------------------------------------------------------ timing */

      const scan = () => {
        registerReveals();
        registerParallax();
        registerMagnetic();
        ScrollTrigger.refresh();
      };

      let pending = false;
      let outer = 0;
      let inner = 0;

      // Two frames past mount puts this after React's hydration commit, so
      // nothing here mutates a node the reconciler has not reached yet.
      outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(scan);
      });

      // Suspense boundaries resolve after that first pass. Re-scan when the
      // tree changes, coalesced to one pass per frame so a streaming page does
      // not run the selector sweep dozens of times in a row.
      const observer = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          scan();
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
        observer.disconnect();
        cleanups.forEach((off) => off());
      };
    },
    { dependencies: [pathname], revertOnUpdate: true }
  );

  return null;
}
