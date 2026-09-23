"use client";

import gsap from "gsap";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A hairline across the top of the viewport while a navigation is in flight.
 *
 * WHY THIS EXISTS. Every route here is dynamic - the root layout reads the
 * cart cookie - so a click waits on the server render before anything on
 * screen changes. With nothing acknowledging the click, a 400ms wait reads as
 * a dead link and gets clicked again. The bar answers on the click itself.
 *
 * WHAT STARTS IT. A plain left click on a same-origin link to a different
 * URL, heard in the CAPTURE phase: Next's <Link> calls `preventDefault` in its
 * own handler to run a client navigation, so by the bubble phase every link
 * click looks cancelled. Also a submitted `method="get"` form, or one marked
 * `data-route-progress` (the search box navigates with `router.push`). Not a
 * server-action form - those never navigate, and a bar that starts and never
 * lands is worse than none.
 *
 * WHAT ENDS IT. The pathname or the query changing - i.e. the new route has
 * committed. A ceiling fades it anyway, so a navigation that never happens
 * (a click on a link a handler then swallowed) cannot strand it on screen.
 *
 * It waits `DELAY` before showing at all: a prefetched route commits inside
 * that window, and a bar that flashes for one frame on every instant
 * navigation is noise, not feedback.
 */

const DELAY = 120;
const CEILING = 10000;

export default function RouteProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const search = useSearchParams();
  const running = useRef(false);
  const timers = useRef({ delay: 0, ceiling: 0 });
  // Filled by the listener effect, called by the commit effect below.
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = bar.current;
    if (!el) return;

    const stop = () => {
      clearTimeout(timers.current.delay);
      clearTimeout(timers.current.ceiling);
    };

    const start = () => {
      stop();
      running.current = true;
      timers.current.delay = window.setTimeout(() => {
        gsap.killTweensOf(el);
        // power4.out covers most of the bar in the first second, then all but
        // stalls: it always looks like it is getting somewhere, and it never
        // claims to be done before the route is.
        gsap.fromTo(
          el,
          { scaleX: 0, opacity: 1 },
          { scaleX: 0.9, duration: 9, ease: "power4.out" },
        );
      }, DELAY);
      timers.current.ceiling = window.setTimeout(finish, CEILING);
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) {
        return;
      }

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, or only a hash: nothing is going to load.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      start();
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const method = form.getAttribute("method")?.toLowerCase();
      if (method === "get" || form.hasAttribute("data-route-progress")) start();
    };

    const finish = () => {
      stop();
      if (!running.current) return;
      running.current = false;
      gsap.killTweensOf(el);
      // Never shown (the route beat the delay): nothing to finish.
      if (Number(gsap.getProperty(el, "opacity")) === 0) return;
      gsap
        .timeline()
        .to(el, { scaleX: 1, duration: 0.25, ease: "power2.out" })
        .to(el, { opacity: 0, duration: 0.3, ease: "power1.out" }, "+=0.05");
    };

    finishRef.current = finish;
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      stop();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  // The new route has committed.
  useEffect(() => {
    finishRef.current();
  }, [pathname, search]);

  return (
    <div
      ref={bar}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[1050] h-[2px] origin-left scale-x-0 bg-sage opacity-0"
    />
  );
}
