"use client";

import { useEffect, type RefObject } from "react";

/**
 * useHorizontalScrollPassthrough
 *
 * Attaches to a horizontally-scrollable container and ensures that purely
 * vertical wheel gestures are never swallowed by the container when the page
 * behind it could scroll instead.
 *
 * Problem: browsers deliver wheel events to the element under the pointer.
 * If that element has `overflow-x: auto/scroll`, the browser considers it a
 * scroll candidate and consumes the event — even when the container has
 * nothing left to scroll horizontally and the gesture was clearly meant for
 * the page.  Lenis's `data-lenis-prevent` makes things worse: it opts the
 * element out of smooth-scroll handling entirely, leaving raw browser
 * behaviour in charge.
 *
 * Solution applied here:
 *   1. Attach a *native* (not React synthetic) wheel listener with
 *      `{ passive: false }` so we can call `preventDefault()`.
 *   2. Classify the gesture:
 *        • Horizontal / diagonal (|deltaX| ≥ |deltaY|)
 *          → let it go; native horizontal scrolling is the right handler.
 *        • Purely vertical (|deltaY| > |deltaX|)
 *          → check whether the container still has room to scroll in the
 *            wheel direction.  If it does, let it go (the rail itself
 *            should scroll).  If it is at the boundary (or has no horizontal
 *            overflow at all), call `preventDefault()` and forward the delta
 *            to the page via `window.scrollBy` so the page scrolls instead.
 *
 * Edge cases covered:
 *   • At left/right boundary — correctly detected via scrollLeft, scrollWidth
 *     and clientWidth with a 1px tolerance for sub-pixel rounding.
 *   • No overflow at all — scrollWidth === clientWidth; always passes through.
 *   • Trackpad momentum — handled correctly because classification runs on
 *     every individual event, not on the first event of a gesture.
 *   • Reduced-motion — no special logic needed; we never touch animations.
 *   • SSR — the effect is conditional on `typeof window !== "undefined"` via
 *     `useEffect`, which only runs in the browser.
 *   • Unmount — the listener is removed in the cleanup return value.
 *   • Null ref — guarded; safe to call before the element mounts.
 */
export function useHorizontalScrollPassthrough(
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      // ── Horizontal / diagonal gesture ────────────────────────────────────
      // Let the browser handle natively; this is a scroll-right/left intent.
      if (absX >= absY) return;

      // ── Purely vertical gesture ──────────────────────────────────────────
      // Determine whether the container has room to absorb the scroll in the
      // horizontal direction.  If it does not, forward to the page.
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScrollLeft = scrollWidth - clientWidth;

      // 1px tolerance for fractional pixel rounding across display densities.
      const atLeftEdge = scrollLeft <= 1;
      const atRightEdge = scrollLeft >= maxScrollLeft - 1;
      const noHorizontalOverflow = maxScrollLeft <= 0;

      // Container cannot scroll in any direction — always pass through.
      if (noHorizontalOverflow) {
        e.preventDefault();
        window.scrollBy({ top: e.deltaY, behavior: "auto" });
        return;
      }

      // Container is at the boundary in the wheel direction — pass through.
      const scrollingUp = e.deltaY < 0; // user wheeling up → page should go up
      if (
        (scrollingUp && atLeftEdge) ||
        (!scrollingUp && atRightEdge)
      ) {
        // Note: "scrolling up on the page" when deltaY < 0 and the horizontal
        // rail is at its left edge is the common case.  We don't try to infer
        // the user's intent beyond what the delta values tell us.
        e.preventDefault();
        window.scrollBy({ top: e.deltaY, behavior: "auto" });
        return;
      }

      // Container still has room to scroll — let the browser decide.
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}
