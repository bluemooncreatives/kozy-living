"use client";

import Image from "@/components/ui/shop-image";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type RotatorImage = {
  url: string;
  altText?: string | null;
};

/**
 * A refined, visibility-aware product-image reel with microanimations.
 *
 * Transitions between photographs with a subtle, gentle Ken Burns float:
 * incoming image smoothly fades in and scales from 1.05 down to 1.00,
 * while the outgoing image fades to 0.
 * Pauses on hover so visitors can inspect any piece without rush.
 * Features subtle glowing micro-indicators on multi-image boxes.
 */
export default function ProductImageRotator({
  images,
  sizes,
  delay = 0,
  interval = 3600,
  showIndicators = true,
  priority = false,
  className,
}: {
  images: readonly RotatorImage[];
  sizes: string;
  delay?: number;
  interval?: number;
  showIndicators?: boolean;
  /** Only for a reel in the first viewport. See the note on the <Image>. */
  priority?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // The timer only ever needs the COUNT, so it depends on that directly. It
  // used to mirror the whole array into a ref during render - which React
  // forbids (`react-hooks/refs`, the one error `npm run lint` reported).
  const total = images.length;

  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // How many shots are mounted - the one on screen and the one after it.
  // Every layer sits in the same box, so every mounted <img> is "in view" and
  // lazy loading fetches it at once: a reel of eight fetched all eight on
  // arrival, and the homepage's reels pulled ~100 photographs before the
  // curtain had even lifted. A shot is now mounted one full interval before
  // its turn, which is ample for a sized WebP, and never unmounted after, so
  // a second lap costs nothing. The same count on the server and the first
  // client render, so hydration agrees.
  const [mounted, setMounted] = useState(Math.min(2, images.length));
  const nextUp = Math.min(images.length, active + 2);
  if (nextUp > mounted) setMounted(nextUp);

  // NOTE: there used to be an effect here that "preloaded" every shot with
  // `new Image().src = image.url`. That is the ORIGINAL file, outside the
  // srcset - so each of the ~15 reels on the homepage downloaded every one of
  // its photographs at full size (several are multi-megabyte PNGs) on top of
  // the sized variant it actually displays, and competed with the first
  // viewport for bandwidth to do it. The layers below are all in the DOM and
  // all in the same box, so lazy loading already fetches each one, at the
  // right width, well before its turn comes round.

  // Observer pauses cycling when tile is out of view (saves CPU & battery)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setVisible(entry.isIntersecting);
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Timer loop for automatic advancing
  useEffect(() => {
    if (total < 2 || !visible || isHovered) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: NodeJS.Timeout;
    let stopped = false;

    const advance = () => {
      if (stopped || document.hidden) {
        timer = setTimeout(advance, 800);
        return;
      }

      setActive((current) => (current + 1) % total);
      timer = setTimeout(advance, interval);
    };

    // Staggered initial rotation start
    const initialDelay = Math.max(1400, (delay || 0) + 1400);
    timer = setTimeout(advance, initialDelay);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [delay, interval, visible, isHovered, total]);

  if (!images?.length) return null;

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute inset-0 overflow-hidden"
    >
      {images.map((image, index) => {
        const isActive = index === active;
        if (index >= mounted) return null;
        return (
          <div
            key={image.url}
            aria-hidden={!isActive}
            className={clsx(
              "absolute inset-0 h-full w-full pointer-events-none transition-all duration-[1200ms] ease-out will-change-[opacity,transform]",
              isActive
                ? "z-[2] opacity-100 scale-100"
                : "z-[1] opacity-0 scale-[1.05]",
            )}
          >
            <Image
              src={image.url}
              alt={image.altText || ""}
              fill
              sizes={sizes}
              // Priority only where the caller says the reel is in the first
              // viewport. Hard-coding it on the first shot put a high-priority
              // preload on EVERY reel on the page - most of them far below the
              // fold - and the loading curtain waits on priority images.
              priority={priority && index === 0}
              loading={priority && index === 0 ? undefined : "lazy"}
              className={clsx(
                className ?? "object-cover",
                "h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]",
              )}
            />
          </div>
        );
      })}

      {/* Subtle Micro-indicators */}
      {images.length > 1 && showIndicators && (
        <div
          aria-hidden
          className="absolute top-2.5 left-3 sm:top-3.5 sm:left-3.5 z-20 flex items-center gap-1.5 pointer-events-none"
        >
          {images.map((_, i) => (
            <span
              key={i}
              className={clsx(
                "h-1 rounded-full transition-all duration-500",
                i === active
                  ? "w-4 bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                  : "w-1 bg-white/45",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
