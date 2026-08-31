"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";
import type { LenisOptions } from "lenis";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

const options: LenisOptions = {
  autoRaf: false,
  autoResize: true,
  autoToggle: true,
  smoothWheel: true,
  syncTouch: false,
  lerp: 0.09,
  wheelMultiplier: 1,
  touchMultiplier: 1,
  orientation: "vertical",
  gestureOrientation: "vertical",
  overscroll: true,
  anchors: {
    // The sticky announcement + navigation stack is 6.25rem tall.
    offset: -100,
    lerp: 0.1,
  },
  allowNestedScroll: false,
  stopInertiaOnNavigate: true,
  respectReducedMotion: true,
  prevent: (node) => Boolean(node.closest("[data-lenis-prevent]")),
  // Preserve native shift-wheel behavior for horizontal rails and tables.
  virtualScroll: ({ event }) => !event.shiftKey,
};

/** Keeps Lenis, GSAP ScrollTrigger and route commits on the same scroll state. */
function ScrollSynchronizer() {
  const pathname = usePathname();

  const onScroll = useCallback((lenis: Lenis) => {
    ScrollTrigger.update();

    const root = document.documentElement;
    root.style.setProperty("--scroll-progress", lenis.progress.toFixed(4));
    root.style.setProperty("--scroll-velocity", lenis.velocity.toFixed(3));

    if (lenis.direction) {
      root.dataset.scrollDirection = lenis.direction > 0 ? "down" : "up";
    }
  }, []);

  const lenis = useLenis(onScroll, [onScroll], -100);

  useEffect(() => {
    if (!lenis) return;

    // Next owns the actual scroll-restoration decision. Lenis only recomputes
    // dimensions and synchronizes scroll-linked scenes after the new route has
    // committed, so back/forward restoration remains native and predictable.
    const frame = requestAnimationFrame(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    });

    return () => cancelAnimationFrame(frame);
  }, [lenis, pathname]);

  return null;
}

export default function SmoothScrollProvider({
  children,
}: {
  children: ReactNode;
}) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const tick = (time: number) => {
      lenisRef.current?.lenis?.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      // Restore GSAP's defaults for hot reloads and provider remounts.
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, []);

  return (
    <ReactLenis ref={lenisRef} root options={options}>
      <ScrollSynchronizer />
      {children}
    </ReactLenis>
  );
}
