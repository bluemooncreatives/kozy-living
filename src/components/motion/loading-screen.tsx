"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useRef, useState } from "react";

gsap.registerPlugin(useGSAP);

/**
 * Hard ceiling on the whole sequence. A stalled font file or a hero image that
 * never resolves must never hold the page hostage - past this the curtain
 * lifts regardless of what has actually loaded.
 *
 * It was 5600, with a 3200 floor, and the curtain waited on `window.load` -
 * every eager image on the page. A cold visit sat behind the wordmark for
 * three to five seconds and then spent two more on the exit, which is the
 * opposite of what a loading screen is for. The numbers below are measured
 * against the CSS entrance: the last glyph lands at ~1.3s after first paint.
 */
const MAX_MS = 3000;

/**
 * Long enough for the wordmark to finish arriving. Below this the glyphs would
 * still be rising as the panels started to leave, which reads as a glitch
 * rather than as a sequence.
 */
const MIN_MS = 1300;

/**
 * The same floor on a repeat load in the session - a reload. The visitor has
 * already read the wordmark, so this is a fast wipe rather than the sequence:
 * long enough to register as a deliberate cut (a curtain that flickers past in
 * a few frames reads as a rendering fault), short enough not to tax a refresh.
 */
const REPEAT_MIN_MS = 600;

/** Hard ceiling for that repeat load, matching `MAX_MS`'s role on a cold one. */
const REPEAT_MAX_MS = 1600;

/**
 * How long the wordmark must have been ON SCREEN before the exit may start,
 * counted from first contentful paint - which, on a first load, is this
 * curtain. `MIN_MS` counts from navigation start, and that is the right clock
 * when the page arrives promptly; but after a slow first byte the floor has
 * already elapsed by the time anything paints, and the curtain began leaving
 * while its own wordmark was still fading in. The glyphs read as landed ~1.0s in.
 */
const MIN_VISIBLE_MS = 1000;
const REPEAT_MIN_VISIBLE_MS = 450;

/**
 * How much faster the repeat load's exit plays. The entrance is a stylesheet
 * animation with no knowledge of the session, so it runs at one speed either
 * way; what shortens a repeat load is the floor above, not the arrival.
 */
const REPEAT_RATE = 1.6;

/** Set once the curtain has lifted, so a reload in-session plays the short cut. */
const SEEN_KEY = "kozy:loaded";

/** The lowercase display statement, pre-split so nothing splits it at runtime. */
const WORDMARK = "kozy living";

/**
 * The wordmark as glyphs, each carrying its position in the *visible*
 * sequence. The space is skipped when numbering, so the gap between the two
 * words does not buy itself a beat of delay and stall the entrance mid-phrase.
 */
const glyphs = (() => {
  let order = 0;
  return Array.from(WORDMARK).map((char) => ({
    char,
    order: char === " " ? -1 : order++,
  }));
})();

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
 * real signals land - webfonts resolved and the images in the first viewport
 * decoded - floored at `MIN_MS` (and at `MIN_VISIBLE_MS` after first paint) so
 * a warm cache cannot reduce it to a flicker, and capped at `MAX_MS` so a cold
 * one cannot strand it. It runs long when there
 * is genuinely something to wait for and short when there is not, without
 * ever saying so out loud.
 *
 * THE PAGE IS HANDED BACK AS THE PANELS START MOVING, not after they finish:
 * scroll and clicks unlock, and the motion layer is told to begin, while the
 * curtain is still sweeping up. See `unlock`.
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
   * Hands the page back the moment the panels START to leave, not when they
   * have finished. Idempotent.
   *
   * Dropping the attribute unlocks scrolling (the CSS lock hangs off it) and
   * lets pointer events through the departing panels (`.loader:not([data-
   * loader])`), so the page is usable a full second earlier than it used to
   * be. `kozy:loader-exit` is the motion layer's cue: the first fold's reveals
   * start while the curtain is still sweeping off them, so the page is already
   * arriving as it is uncovered instead of being uncovered and THEN arriving.
   */
  const unlock = useCallback(() => {
    const el = root.current;
    if (!el || !el.hasAttribute("data-loader")) return;
    el.removeAttribute("data-loader");
    window.dispatchEvent(new Event("kozy:loader-exit"));
  }, []);

  /**
   * Removes the curtain once it is off screen. Idempotent and safe to call
   * from the watchdog, from the timeline, or from cleanup, in any order.
   */
  const release = useCallback(() => {
    unlock();
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode. The curtain simply plays again next load.
    }
    window.dispatchEvent(new Event("kozy:loader-done"));
    setDone(true);
  }, [unlock]);

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
        unlock();
        gsap.to(el, { autoAlpha: 0, duration: 0.2, onComplete: release });
        return;
      }

      /* ------------------------------------------------------ the sequence */

      // There is deliberately no entrance timeline here. The wordmark's
      // arrival is a CSS animation (`.loader-char` / `.loader-wordmark` in
      // globals.css) so that it plays from the first painted frame rather than
      // waiting for this file to be fetched, parsed, hydrated and run - which
      // is longest on exactly the slow connection the curtain exists to cover.
      // Driving it from GSAP meant an empty cream panel for a second or more
      // and then the type popping in, which is worse than no curtain at all.
      // GSAP owns the exit, and nothing else.

      /**
       * Freezes the CSS entrance where it currently stands and hands the
       * elements to GSAP.
       *
       * Both would otherwise write `transform` on the same nodes, and a
       * running stylesheet animation outranks an inline style - the exit tween
       * would compute correctly and appear to do nothing. Reading the computed
       * matrix before clearing the animation is what makes a mid-entrance
       * handoff continue from the live position instead of snapping: on a warm
       * cache the page can be ready before the last glyph has landed.
       */
      const handoff = (nodes: Element[]) =>
        nodes.forEach((node) => {
          const el = node as HTMLElement;
          const held = getComputedStyle(el).transform;
          const alpha = getComputedStyle(el).opacity;
          el.style.animation = "none";
          if (held && held !== "none") el.style.transform = held;
          el.style.opacity = alpha;
        });

      /* ------------------------------------------------------------ release */

      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;

        // GSAP cannot tween what CSS is still animating.
        handoff([...chars, ...mark]);

        const exit = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          onComplete: release,
        });

        exit
          // Whatever the handoff froze - on a fast exit the block can still be
          // part way through its fade - is brought to full ink first, so the
          // word never leaves looking washed out.
          .to(mark, { opacity: 1, duration: 0.2, ease: "power1.out" }, 0)
          // The glyphs leave from the far end, so the wordmark unwrites itself
          // rather than simply vanishing. The small absolute offset is a held
          // beat, so the sequence reads as arrive, rest, depart rather than as
          // one continuous slide - short, because the floor above has already
          // given the wordmark its rest.
          .to(
            chars,
            {
              yPercent: -115,
              // The idle loop leaves a few pixels of lift pinned as a `y` by
              // the handoff. Tweening it back to 0 alongside the percentage
              // absorbs that offset over the exit instead of carrying it as a
              // constant, so glyphs caught at different points in the ripple
              // all clear the mask edge together.
              y: 0,
              duration: 0.6,
              ease: "power3.in",
              stagger: { each: 0.025, from: "end" },
            },
            0.12
          )
          // Two panels leaving in stacking order - cream is on top, so cream
          // goes first and uncovers the sage beneath it, which then goes and
          // uncovers the page. Lifting the lower one first would be invisible.
          // The lag between them is what gives the exit depth instead of the
          // flat slab a single panel produces.
          .to(
            q("[data-loader-panel=cream]"),
            { yPercent: -100, duration: 0.95, ease: "expo.inOut" },
            "-=0.32"
          )
          // Hand over as the cream panel starts to travel. expo.inOut barely
          // moves for its first third, so by the time the page is actually
          // visible under the sage panel, its reveals are already under way.
          .add(unlock, "<")
          .to(
            q("[data-loader-panel=sage]"),
            { yPercent: -100, duration: 1, ease: "expo.inOut" },
            "<0.12"
          )
          // The morph. Each trailing edge bows into the plate radius the whole
          // site is built on as it sweeps up, and flattens again as it clears.
          .to(
            panels,
            {
              "--loader-bulge": "50%",
              duration: 0.48,
              ease: "sine.inOut",
              stagger: 0.12,
              yoyo: true,
              repeat: 1,
            },
            "<-0.12"
          );

        if (repeat) exit.timeScale(REPEAT_RATE);
      };

      // The real signals. `document.fonts.ready` matters here specifically
      // because the curtain IS type - lifting before the display face has
      // resolved would show the fallback for a frame and then swap.
      //
      // NOT `window.load`. That waits on every eager image in the document,
      // including rails far below the fold, and on this catalogue it was
      // routinely the whole of the 5.6s ceiling. What the visitor sees the
      // instant the curtain lifts is the first viewport, so the wait is for
      // the images IN it to decode - and nothing else. Measured by geometry
      // rather than by attribute: Next 16's `priority` no longer writes
      // `fetchpriority`, and "marked important" was never quite the same
      // question as "on screen". Each is caught on its own: a broken image
      // costs its own frame, never the curtain.
      const critical = Array.from(document.images)
        .filter((img) => {
          const box = img.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            box.top < window.innerHeight &&
            box.bottom > 0
          );
        })
        .map((img) => img.decode().catch(() => undefined));

      const ready = Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        ...critical,
      ]);

      // Measured from navigation start, NOT from when this effect ran. The
      // entrance begins at first paint, so a baseline taken here would start
      // the clock somewhere in the middle of it, and the curtain's total
      // on-screen time would grow with however long the bundle took - the
      // opposite of what these floors are for. `performance.now()` is already
      // relative to the navigation, so it needs no baseline of its own.
      const floor = repeat ? REPEAT_MIN_MS : MIN_MS;
      const visible = repeat ? REPEAT_MIN_VISIBLE_MS : MIN_VISIBLE_MS;
      let hold = 0;

      ready.then(() => {
        const painted =
          performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
          performance.now();
        hold = window.setTimeout(
          finish,
          Math.max(0, floor - performance.now(), painted + visible - performance.now())
        );
      });

      // The ceiling never cuts the wordmark's own time on screen short either:
      // it exists for a font or an image that stalls, not for a slow server.
      const paintedAt =
        performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
        performance.now();
      const guard = window.setTimeout(
        finish,
        Math.max(
          0,
          (repeat ? REPEAT_MAX_MS : MAX_MS) - performance.now(),
          paintedAt + (repeat ? REPEAT_MIN_VISIBLE_MS : MIN_VISIBLE_MS) - performance.now()
        )
      );

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
          {glyphs.map(({ char, order }, index) =>
            char === " " ? (
              <span key={index} className="loader-space" aria-hidden />
            ) : (
              <span key={index} className="loader-clip" aria-hidden>
                <span
                  data-loader-char
                  className="loader-char"
                  // The stagger, shipped in the HTML. CSS multiplies this by
                  // the per-glyph delay, so the wordmark writes itself in
                  // sequence with no JavaScript and no runtime measuring pass.
                  style={{ "--i": order } as React.CSSProperties}
                >
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
