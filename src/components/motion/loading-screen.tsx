"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useRef, useState } from "react";

gsap.registerPlugin(useGSAP);

/**
 * Hard ceiling on the whole sequence. A stalled font file or a hero image that
 * never resolves must never hold the page hostage - past this the curtain
 * lifts regardless of what has actually loaded.
 */
const MAX_MS = 3400;

/**
 * Long enough for the wordmark to finish arriving. Below this the glyphs would
 * still be rising as the panels started to leave, which reads as a glitch
 * rather than as a sequence.
 */
const MIN_MS = 1500;

/** Set once the curtain has lifted, so a reload in-session plays the short cut. */
const SEEN_KEY = "kozy:loaded";

/** The lowercase display statement, pre-split so nothing splits it at runtime. */
const WORDMARK = "kozy living";

/**
 * The first-paint curtain.
 *
 * It is the wordmark and nothing else. There is deliberately no percentage, no
 * meter and no spinner: a progress read-out asks the visitor to watch a number
 * climb, which is the opposite of what a brand built on "do less, with
 * intention" should open with. The type arrives, it rests, and the panels
 * carry it away. The wait is dressed rather than measured.
 *
 * WHY IT IS SERVER-RENDERED. The whole point of a loading screen is to be on
 * screen before anything else, which means it cannot wait for hydration to
 * exist. This renders in the streamed HTML and is covered by CSS in
 * `globals.css` that also locks the scroll (`html:has([data-loader])`), so the
 * curtain is correct and the page is pinned from the very first paint, with no
 * JavaScript involved. GSAP only ever takes over an element that is already
 * there and already right.
 *
 * WHY THERE IS NO REACT STATE UNTIL THE END. Every frame is GSAP writing
 * transforms on nodes it already holds. A rerendering curtain would be
 * rerendering during the exact window the browser is busiest parsing,
 * hydrating and decoding images. The single state flip happens after the exit,
 * and only to unmount: once the curtain is gone it costs nothing, holds no
 * listeners, and leaves no fixed compositing layer behind.
 *
 * WHAT DECIDES WHEN IT LEAVES. Not a fixed timer. The exit is held until the
 * real signals land - webfonts resolved and the window `load` event - floored
 * at `MIN_MS` so a warm cache cannot reduce it to a flicker, and capped at
 * `MAX_MS` so a cold one cannot strand it. It runs long when there is
 * genuinely something to wait for and short when there is not, without ever
 * saying so out loud.
 *
 * ONLY EVER ONCE. `sessionStorage` records the lift. On a repeat load in the
 * same session the markup is identical - the decision is made in the effect,
 * never in the render, so there is no hydration divergence - and the sequence
 * collapses to a fast wipe rather than being skipped outright, so a refresh
 * still resolves into the page instead of tearing.
 */
export default function LoadingScreen() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  /**
   * Hands the page back. Idempotent and safe to call from the watchdog, from
   * the timeline, or from cleanup, in any order.
   *
   * The attribute goes first and synchronously: it is what the CSS scroll lock
   * hangs off, so dropping it here unlocks the page on the same frame the
   * curtain clears rather than one React commit later.
   */
  const release = useCallback(() => {
    root.current?.removeAttribute("data-loader");
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode. The curtain simply plays again next load.
    }
    window.dispatchEvent(new Event("kozy:loader-done"));
    setDone(true);
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const q = gsap.utils.selector(el);
      const chars = q("[data-loader-char]");
      const mark = q("[data-loader-mark]");
      const panels = q("[data-loader-panel]");

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      let repeat = false;
      try {
        repeat = sessionStorage.getItem(SEEN_KEY) === "1";
      } catch {
        repeat = false;
      }

      // NOTE: the scroll lock is pure CSS (`html:has([data-loader])`), not a
      // call into Lenis. Lenis is instantiated by a parent provider and child
      // effects run first, so reaching for the instance here would find it
      // null on the one commit that matters. With the document unscrollable,
      // Lenis has nowhere to scroll to and needs no involvement.

      // Reduced motion gets no theatre at all - one short fade, and out.
      if (reduced) {
        gsap.to(el, { autoAlpha: 0, duration: 0.2, onComplete: release });
        return;
      }

      /* ------------------------------------------------------ the sequence */

      // The entrance only. It carries no completion callback and no knowledge
      // of the exit: on a slow load the entrance finishes long before the page
      // is ready, and a timeline that ended by releasing the curtain would
      // tear it away with the page still loading behind it.
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      if (repeat) {
        // No entrance, but the curtain must still look composed rather than
        // empty for the moment it is up.
        gsap.set(chars, { yPercent: 0 });
        gsap.set(mark, { scale: 1, autoAlpha: 1 });
      } else {
        // `fromTo`, not `to`: the start state is authored in CSS, and stating
        // it again here means GSAP never has to infer it from a computed style
        // that a fallback font may still be influencing on the first frame.
        tl.fromTo(
          chars,
          { yPercent: 115 },
          {
            yPercent: 0,
            duration: 1.15,
            stagger: { each: 0.045, from: "start" },
          }
        )
          // One slow settle underneath the glyphs, running most of the wait.
          // It is barely perceptible frame to frame, which is the point: the
          // screen is never quite frozen, but nothing on it is asking to be
          // watched either.
          .fromTo(
            mark,
            { scale: 1.05, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 2.6, ease: "power2.out" },
            0
          );
      }

      /* ------------------------------------------------------------ release */

      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;

        const exit = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          onComplete: release,
        });

        exit
          // The glyphs leave from the far end, so the wordmark unwrites itself
          // rather than simply vanishing.
          .to(chars, {
            yPercent: -115,
            duration: 0.7,
            stagger: { each: 0.028, from: "end" },
          })
          // Two panels leaving in stacking order - cream is on top, so cream
          // goes first and uncovers the sage beneath it, which then goes and
          // uncovers the page. Lifting the lower one first would be invisible.
          // The lag between them is what gives the exit depth instead of the
          // flat slab a single panel produces.
          .to(
            q("[data-loader-panel=cream]"),
            { yPercent: -100, duration: 1, ease: "expo.inOut" },
            "-=0.3"
          )
          .to(
            q("[data-loader-panel=sage]"),
            { yPercent: -100, duration: 1.05, ease: "expo.inOut" },
            "<0.14"
          )
          // The morph. Each trailing edge bows into the plate radius the whole
          // site is built on as it sweeps up, and flattens again as it clears.
          .to(
            panels,
            {
              "--loader-bulge": "50%",
              duration: 0.5,
              ease: "sine.inOut",
              stagger: 0.14,
              yoyo: true,
              repeat: 1,
            },
            "<-0.14"
          );

        if (repeat) exit.timeScale(1.9);

        // Queue behind the entrance if it is still running, otherwise go now.
        // Appending to an already-finished timeline would extend its duration
        // past a playhead that has stopped, and the exit would never render.
        if (tl.isActive()) {
          tl.eventCallback("onComplete", () => exit.play(0));
          exit.pause();
        }
      };

      // The real signals. `document.fonts.ready` matters here specifically
      // because the curtain IS type - lifting before the display face has
      // resolved would show the fallback for a frame and then swap.
      const ready = Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        document.readyState === "complete"
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              window.addEventListener("load", () => resolve(), { once: true });
            }),
      ]);

      const floor = repeat ? 0 : MIN_MS;
      const started = performance.now();
      let hold = 0;

      ready.then(() => {
        const left = Math.max(0, floor - (performance.now() - started));
        hold = window.setTimeout(finish, left);
      });

      const guard = window.setTimeout(finish, repeat ? 600 : MAX_MS);

      return () => {
        clearTimeout(hold);
        clearTimeout(guard);
        // Torn down mid-sequence (a hot reload, or React's development double
        // mount): unlock, but do NOT record the session flag - the visitor has
        // not actually seen the curtain play, and marking it seen would demote
        // the real first load to the short cut.
        root.current?.removeAttribute("data-loader");
      };
    },
    { scope: root, dependencies: [] }
  );

  // Unmounted the moment the curtain is off screen: no fixed full-viewport
  // layer left promoted for the rest of the session.
  if (done) return null;

  return (
    <div
      ref={root}
      data-loader=""
      role="status"
      aria-label="Loading"
      className="loader"
    >
      {/* Under-panel. Leaves second, so the curtain parts in two planes. */}
      <div data-loader-panel="sage" className="loader-panel loader-panel-sage" />

      <div data-loader-panel="cream" className="loader-panel loader-panel-cream">
        {/* Pre-split in the markup, not by a runtime splitter: the spans ship
            in the HTML, so there is no measure-wrap-reflow pass on the busiest
            frame of the page's life, and no DOM mutation for React to
            reconcile against. */}
        <h2
          data-loader-mark
          className="wordmark loader-wordmark"
          aria-label={WORDMARK}
        >
          {Array.from(WORDMARK).map((char, index) =>
            char === " " ? (
              <span key={index} className="loader-space" aria-hidden />
            ) : (
              <span key={index} className="loader-clip" aria-hidden>
                <span data-loader-char className="loader-char">
                  {char}
                </span>
              </span>
            )
          )}
        </h2>
      </div>
    </div>
  );
}
