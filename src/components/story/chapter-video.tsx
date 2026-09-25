"use client";

import { useEffect, useRef } from "react";

/**
 * A silent loop that plays only while it is on screen.
 *
 * The clip is Shopify's original upload - 1080x1920, ~6.6 MB - shown in a
 * card a third of the page wide. `preload="none"` and a play that waits for
 * the card to scroll in keep that off the first load of a long page, and
 * pausing it off screen stops a hidden video decoding for as long as the
 * tab is open.
 *
 * Under reduced motion it never plays: the poster, a frame of the clip, is
 * the whole card.
 */
export default function ChapterVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          // A rejected play (a data-saver setting, a blocked autoplay) just
          // leaves the poster up, which is the correct fallback.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-label={label}
      muted
      loop
      playsInline
      preload="none"
      className="scatter-photo absolute inset-0 h-full w-full object-cover"
    />
  );
}
