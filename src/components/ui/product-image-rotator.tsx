"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type RotatorImage = {
  url: string;
  altText?: string | null;
};

/**
 * A small, visibility-aware product-image reel.
 *
 * Every image stays in the same composited frame and the incoming photograph
 * fades over the outgoing one. The timer is stopped when the tile or tab is
 * hidden, and it never advances to an image the browser has not decoded yet.
 * That keeps these supporting hero tiles animated without competing with the
 * much heavier feature video.
 */
export default function ProductImageRotator({
  images,
  sizes,
  delay = 0,
  interval = 4800,
  className,
}: {
  images: readonly RotatorImage[];
  sizes: string;
  delay?: number;
  interval?: number;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(new Set<number>());
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "120px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (images.length < 2 || !visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;
    let stopped = false;

    const advance = () => {
      if (stopped || document.hidden) {
        timer = window.setTimeout(advance, 800);
        return;
      }

      setActive((current) => {
        const next = (current + 1) % images.length;
        // The outgoing photograph remains fully opaque until its replacement
        // is decoded. On a slow connection this becomes a longer hold, never
        // a flash of the plate background.
        return loaded.current.has(next) ? next : current;
      });
      timer = window.setTimeout(advance, interval);
    };

    timer = window.setTimeout(advance, interval + delay);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [delay, images.length, interval, visible]);

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      {images.map((image, index) => (
        <Image
          key={image.url}
          src={image.url}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          loading={index === 0 ? "eager" : "lazy"}
          onLoad={() => loaded.current.add(index)}
          className={`${className ?? ""} transition-[opacity,transform] duration-[1200ms] ease-editorial ${
            index === active
              ? "z-[2] scale-100 opacity-100"
              : "z-[1] scale-[1.035] opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
