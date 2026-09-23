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
 * wrapping components: every surface opts in by writing an attribute on an
 * element, and nothing has to import a motion component or thread a prop.
 * That is what keeps the behaviour consistent end to end rather than a set of
 * one-off animations that drift apart.
 *
 *   data-reveal            fade and rise as it enters the viewport
 *   data-reveal-group      stagger the element's own children instead
 *   data-reveal-media      (inside either) the photograph settles from a
 *                          slight push-in as its frame arrives - see `Plate`
 *   data-split             words rise out of their own masks - markup from
 *                          `motion/split-text.tsx`
 *   data-magnetic          the element leans toward the cursor
 *   data-parallax          drifts against the scroll, for large photography
 *
 * and, with no attribute, every `.marquee-track` on the page picks up speed
 * with the scroll and eases back to its idle pace.
 *
 * Registered inside `useGSAP` with the pathname as a dependency, so a route
 * change reverts every tween and trigger this created and rebuilds against the
 * new DOM. Everything is created through `contextSafe` - including the passes
 * that run later from a frame callback or a mutation - because GSAP only
 * records what is created while its context is active. The previous version
 * created its ScrollTriggers in a rAF, outside the context, so they were never
 * reverted and accumulated across a session.
 *
 * THREE TIMING RULES, all learned the hard way on a streaming App Router page:
 *
 * 1. Never touch a node React has not hydrated. Content inside a `<Suspense>`
 *    boundary is in the DOM (streamed HTML) before React hydrates it, and an
 *    inline style written in that gap is a hydration mismatch, after which the
 *    tree is not patched. React writes its fiber onto every host node it
 *    hydrates, so that is checked directly: an unhydrated node is skipped, not
 *    claimed, and the scan retries shortly after. This used to be a rule for
 *    authors - "never put data-reveal inside Suspense" - and it had been
 *    broken twice. It is now enforced here instead.
 *
 * 2. The DOM is watched, not scanned once. Suspense boundaries resolve after
 *    the first pass, and an element hidden by CSS but never claimed by a
 *    trigger stays at `opacity: 0` for good.
 *
 * 3. On a route change, start states are applied BEFORE the browser paints the
 *    new page (this runs in a layout effect), and the triggers are armed one
 *    frame later. Applying them a frame late - as this used to - painted a
 *    staggered group visible, hid it, and then animated it in: a flash on
 *    every navigation. Arming a frame late is deliberate: Next resets the
 *    scroll position after this effect, and a trigger armed against the OLD
 *    scroll position fires for everything above it at once.
 */
export default function MotionProvider() {
  const pathname = usePathname();

  useGSAP(
    (_context, contextSafe) => {
      const safe = contextSafe!;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Tell the head script's watchdog that motion is alive, whether or not
      // we go on to animate anything. A window flag rather than a DOM
      // attribute: React reconciles attributes on <html>.
      (window as unknown as { __motionReady?: boolean }).__motionReady = true;

      // Every hidden start state lives in CSS under `no-preference`, so a
      // reduced-motion visitor never sees one; there is nothing to undo.
      if (reduced) return;

      // expo.out front-loads the travel: most of the distance is covered in
      // the first quarter of the tween, which reads as a response rather than
      // a wait, and the long tail is where the smoothness comes from.
      const ease = "expo.out";
      const seen = new WeakSet<Element>();
      const cleanups: Array<() => void> = [];
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

      // A translated reveal feels like a bounce when a touch gesture is what
      // brings a product rail into view: the document moves with the finger
      // while every card simultaneously travels the last stretch of its
      // tween. Touch screens keep the fade, but only fine-pointer devices get
      // the decorative rise. This also leaves the rail stationary beneath the
      // finger on its first interaction after a reload.
      const revealY = fine.matches ? 32 : 0;

      /** How far a photograph is pushed in before it settles. */
      const MEDIA_SCALE = 1.12;

      /** React 19 attaches `__reactFiber$<id>` to each host node it hydrates. */
      const hydrated = (node: Element) =>
        Object.keys(node).some((key) => key.startsWith("__reactFiber$"));

      let deferred = false;

      /**
       * Returns only the nodes not already wired up by an earlier pass, and
       * never one React has yet to hydrate - those are left unclaimed for the
       * retry to pick up (rule 1).
       */
      const claim = <T extends Element>(nodes: T[]) =>
        nodes.filter((node) => {
          if (seen.has(node)) return false;
          if (!hydrated(node)) {
            deferred = true;
            return false;
          }
          seen.add(node);
          return true;
        });

      const settle = (targets: Element[]) =>
        targets.forEach((el) => el.setAttribute("data-reveal-done", ""));

      /**
       * A finished reveal keeps its opacity (the CSS start state still applies
       * to `[data-reveal]`) but drops the transform. GSAP would otherwise leave
       * `translate(0px, 0px)` inline for good - and any transform on an
       * ancestor turns it into the containing block for `position: fixed`
       * descendants, silently re-anchoring the next fixed bar anyone puts in
       * a card. It also releases the compositing layer.
       */
      const rest = (targets: Element[]) => {
        settle(targets);
        gsap.set(targets, { clearProps: "transform" });
      };

      const mediaIn = (roots: Element[]) =>
        roots.flatMap((root) =>
          Array.from(root.querySelectorAll("[data-reveal-media]")),
        );

      /** Pushes the photographs in, ready to settle. A no-op with none. */
      const pushMedia = (roots: Element[]) => {
        const media = mediaIn(roots);
        if (media.length) gsap.set(media, { scale: MEDIA_SCALE });
      };

      /**
       * Settles them. Longer than the frame's own rise, so the picture is still
       * coming to rest as the card lands. Guarded because GSAP warns on an
       * empty target list, and most revealed elements hold no photograph.
       */
      const settleMedia = (roots: Element[], stagger: number) => {
        const media = mediaIn(roots);
        if (!media.length) return;
        gsap.to(media, { scale: 1, duration: 1.6, ease, stagger });
      };

      /** Trigger creation, queued by each pass and run by `arm`. */
      const armQueue: Array<() => void> = [];

      /* ------------------------------------------------------------ reveal */

      const prepareReveals = () => {
        const solo = claim(
          gsap.utils
            .toArray<HTMLElement>("[data-reveal]:not([data-reveal-group])")
            .filter((node) => !node.closest("[data-reveal-group]")),
        );

        if (solo.length) {
          // The start state goes on before the trigger exists:
          // ScrollTrigger.batch fires onEnter for anything already in view as
          // soon as it refreshes, and a start state applied afterwards would
          // push those elements down after their reveal had played.
          gsap.set(solo, { y: revealY });
          pushMedia(solo);

          armQueue.push(() =>
            ScrollTrigger.batch(solo, {
              start: "top 88%",
              once: true,
              onEnter: safe((batch: Element[]) => {
                gsap.to(batch, {
                  opacity: 1,
                  y: 0,
                  duration: 1,
                  ease,
                  stagger: 0.08,
                  onComplete: () => rest(batch),
                });
                settleMedia(batch, 0.08);
              }),
            }),
          );
        }

        // Grouped reveals stagger their children, which is what a grid or a
        // rail wants - a container fading as one block reads as a slab.
        const groups = claim(
          gsap.utils.toArray<HTMLElement>("[data-reveal-group]"),
        );
        groups.forEach((group) => {
          const children = Array.from(group.children);
          if (!children.length) return;

          gsap.set(group, { opacity: 1 });
          gsap.set(children, { opacity: 0, y: revealY });
          pushMedia(children);

          armQueue.push(() =>
            ScrollTrigger.create({
              trigger: group,
              start: "top 88%",
              once: true,
              onEnter: safe(() => {
                gsap.to(children, {
                  opacity: 1,
                  y: 0,
                  duration: 1,
                  ease,
                  stagger: 0.09,
                  onComplete: () => {
                    settle([group]);
                    rest(children);
                  },
                });
                settleMedia(children, 0.09);
              }),
            }),
          );
        });

        return solo.length + groups.length;
      };

      /* ------------------------------------------------------------- split */

      const prepareSplits = () => {
        const targets = claim(gsap.utils.toArray<HTMLElement>("[data-split]"));

        targets.forEach((el) => {
          // The hidden start state is CSS (`.split-word` sits 1.6em down in
          // its slot), so there is nothing to set here and nothing that can
          // flash. GSAP reads that offset back as its starting `y`.
          const pieces = el.querySelectorAll(".split-word, .split-unit");
          if (!pieces.length) {
            settle([el]);
            return;
          }

          armQueue.push(() =>
            ScrollTrigger.create({
              trigger: el,
              start: "top 92%",
              once: true,
              onEnter: safe(() => {
                gsap.to(pieces, {
                  y: 0,
                  opacity: 1,
                  duration: 1.1,
                  ease,
                  stagger: 0.06,
                  onComplete: () => {
                    // Order matters: the attribute first releases the CSS
                    // start state and lifts the clip, THEN the inline values
                    // go. Both land in one task, so no frame sees either half.
                    settle([el]);
                    gsap.set(pieces, { clearProps: "transform,opacity" });
                  },
                });
              }),
            }),
          );
        });

        return targets.length;
      };

      /* ---------------------------------------------------------- parallax */

      const prepareParallax = () => {
        const targets = claim(
          gsap.utils.toArray<HTMLElement>("[data-parallax]"),
        );
        targets.forEach((el) => {
          const distance = Number(el.dataset.parallax) || 12;

          armQueue.push(() =>
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
              },
            ),
          );
        });
        return targets.length;
      };

      /* ---------------------------------------------------------- magnetic */

      const registerMagnetic = () => {
        if (!fine.matches) return 0;

        const targets = claim(
          gsap.utils.toArray<HTMLElement>("[data-magnetic]"),
        );
        targets.forEach((el) => {
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
        });
        return targets.length;
      };

      /* --------------------------------------------------------- marquees

         Every ticker on the page runs faster while the page is being scrolled
         and eases back to its own pace as the scroll settles, so the bands
         feel attached to the gesture instead of looping on a separate clock.

         The tracks are CSS animations and stay that way - they keep running
         on the compositor, and with no JavaScript they still simply loop.
         This only ever adjusts their `playbackRate`. Direction never changes:
         a ticker that reverses when you scroll up reads as a glitch, not as
         a response. `updatePlaybackRate` rather than assigning the property,
         so a compositor-driven animation re-syncs without a jump. */

      let tracks: Animation[] = [];
      let applied = 1;
      let boost = 0;
      let lastY = window.scrollY;

      const collectTracks = () => {
        tracks = gsap.utils
          .toArray<HTMLElement>(".marquee-track, .marquee-track-reverse")
          .flatMap((track) => track.getAnimations());
      };

      const setRate = (rate: number) => {
        tracks.forEach((animation) => {
          if (typeof animation.updatePlaybackRate === "function") {
            animation.updatePlaybackRate(rate);
          } else {
            animation.playbackRate = rate;
          }
        });
      };

      const pace = () => {
        const y = window.scrollY;
        // Pixels per 60fps frame, so a 120Hz screen gets the same response.
        const speed = Math.abs(y - lastY) / gsap.ticker.deltaRatio(60);
        lastY = y;

        // Up to 4x at a hard fling; a gentle read-scroll barely nudges it.
        const target = Math.min(speed / 5, 3);
        // Rises quicker than it falls, so it answers a flick at once and
        // then coasts down rather than stopping dead with the wheel.
        boost += (target - boost) * (target > boost ? 0.2 : 0.05);

        const rate = 1 + boost;
        if (!tracks.length || Math.abs(rate - applied) < 0.02) return;
        applied = rate;
        setRate(rate);
      };

      gsap.ticker.add(pace);
      cleanups.push(() => {
        gsap.ticker.remove(pace);
        setRate(1);
      });

      /* ------------------------------------------------------------ timing */

      let armFrame = 0;
      let retry = 0;
      let retries = 0;

      const arm = safe(() => {
        const queued = armQueue.splice(0);
        if (!queued.length) return;
        queued.forEach((create) => create());
        ScrollTrigger.refresh(true);
      });

      /**
       * One pass. Start states go on immediately; triggers are armed now, or
       * on the next frame when `armLater` (rule 3).
       */
      const scan = safe((armLater: boolean) => {
        deferred = false;
        const added =
          prepareReveals() +
          prepareSplits() +
          prepareParallax() +
          registerMagnetic();
        collectTracks();

        if (added) {
          if (armLater) {
            cancelAnimationFrame(armFrame);
            armFrame = requestAnimationFrame(() => arm());
          } else {
            arm();
          }
        }

        // Rule 1: nodes still waiting on hydration. Hydrating a boundary does
        // not mutate the DOM, so the observer below would never report it -
        // this has to poll. Bounded: a boundary that never hydrates must not
        // keep a timer alive for the whole session.
        clearTimeout(retry);
        if (deferred && retries < 50) {
          retries += 1;
          retry = window.setTimeout(() => scan(false), 100);
        }
      });

      /* The loading curtain, when one is up.
       *
       * `ScrollTrigger.batch` reveals everything already in the viewport the
       * moment it refreshes. Scanning while the curtain still fully covers the
       * page would spend the entire first fold's reveal behind it. So the
       * first scan waits for the curtain's EXIT cue - the moment its panels
       * start to lift - and the first fold's entrance plays as it is being
       * uncovered. `kozy:loader-done` is a second chance in case the exit cue
       * was missed.
       *
       * Only the FIRST scan: on a route change the curtain no longer exists,
       * the query below misses, and this runs at once.
       */
      const curtain = document.querySelector("[data-loader]");
      let onCurtain: (() => void) | null = null;
      let bail = 0;

      if (curtain) {
        const go = () => {
          if (!onCurtain) return;
          window.removeEventListener("kozy:loader-exit", onCurtain);
          window.removeEventListener("kozy:loader-done", onCurtain);
          onCurtain = null;
          clearTimeout(bail);
          scan(false);
        };
        onCurtain = go;
        window.addEventListener("kozy:loader-exit", go, { once: true });
        window.addEventListener("kozy:loader-done", go, { once: true });
        // The curtain has its own ceiling, but this layer does not get to
        // depend on another component being correct: if neither event ever
        // arrives, the page must still animate rather than stay blank.
        bail = window.setTimeout(go, 5000);
      } else {
        scan(true);
      }

      // Suspense boundaries resolve after that first pass. Re-scan when the
      // tree changes, coalesced to one pass per frame so a streaming page does
      // not run the selector sweep dozens of times in a row.
      let pending = false;
      let mutationFrame = 0;
      const observer = new MutationObserver(() => {
        if (pending || onCurtain) return;
        pending = true;
        mutationFrame = requestAnimationFrame(() => {
          pending = false;
          scan(false);
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-reveal"],
      });

      return () => {
        cancelAnimationFrame(armFrame);
        cancelAnimationFrame(mutationFrame);
        clearTimeout(retry);
        clearTimeout(bail);
        if (onCurtain) {
          window.removeEventListener("kozy:loader-exit", onCurtain);
          window.removeEventListener("kozy:loader-done", onCurtain);
        }
        observer.disconnect();
        cleanups.forEach((off) => off());
      };
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
