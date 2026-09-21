"use client";

import Image from "next/image";
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
  className,
}: {
  images: readonly RotatorImage[];
  sizes: string;
  delay?: number;
  interval?: number;
  showIndicators?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Preload all rotator images into browser cache so transitions are instantaneous and glitch-free
  useEffect(() => {
    if (typeof window === "undefined" || !images?.length) return;
    images.forEach((img) => {
      const preload = new window.Image();
      preload.src = img.url;
    });
  }, [images]);

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
    const total = imagesRef.current?.length ?? 0;
    if (total < 2 || !visible || isHovered) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: NodeJS.Timeout;
    let stopped = false;

    const advance = () => {
      if (stopped || document.hidden) {
        timer = setTimeout(advance, 800);
        return;
      }

      setActive((current) => (current + 1) % (imagesRef.current?.length || 1));
      timer = setTimeout(advance, interval);
    };

    // Staggered initial rotation start
    const initialDelay = Math.max(1400, (delay || 0) + 1400);
    timer = setTimeout(advance, initialDelay);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [delay, interval, visible, isHovered]);

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
              priority={index === 0}
              loading={index <= 1 ? "eager" : "lazy"}
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
