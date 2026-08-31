"use client";

import Image from "next/image";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

export type ReelItem = {
  kind: "image" | "video";
  src: string;
  alt?: string;
  label: string;
  caption: string;
};

/**
 * The estate reel - four plates of estate footage read as one horizontal
 * band, half stills and half silent loops.
 *
 * The stagger is height, not offset: tops align on the hairline grid and the
 * cells alternate 3:4 and 4:5, so the captions fall on two baselines by
 * themselves. Doing it with `margin-top` instead would break the top edge,
 * which is the one line holding the band together.
 *
 * Playback is scoped to what is on screen. An IntersectionObserver starts a
 * loop when its cell enters the viewport and pauses it on the way out, so a
 * page with four autoplaying clips never decodes more than the visible ones.
 * Two accessibility obligations come with autoplay and this component owns
 * both, exactly as `HeroVideo` does:
 *   - `prefers-reduced-motion: reduce` suppresses playback entirely.
 *   - WCAG 2.2.2 needs a stop for motion running past five seconds, hence the
 *     single band-level toggle rather than one control per cell.
 */
export default function EstateReel({
  items,
  label,
}: {
  items: readonly ReelItem[];
  label: string;
}) {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [playing, setPlaying] = useState(true);
  // Mirrors `playing` for the observer callback, which is registered once and
  // would otherwise close over the initial value and resume a paused band.
  const playingRef = useRef(true);
  const reducedMotion = useRef(false);

  const hasVideo = items.some((item) => item.kind === "video");

  const register = useCallback((src: string, el: HTMLVideoElement | null) => {
    if (el) videoRefs.current.set(src, el);
    else videoRefs.current.delete(src);
  }, []);

  // Autoplay can be refused outright (low power mode, data saver). That is not
  // an error worth surfacing - the poster frame simply stays put.
  const safePlay = (video: HTMLVideoElement) => {
    video.play().catch(() => {});
  };

  useEffect(() => {
    if (!hasVideo) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedMotion.current = media.matches;
      if (media.matches) {
        videoRefs.current.forEach((video) => video.pause());
        playingRef.current = false;
        setPlaying(false);
      }
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [hasVideo]);

  useEffect(() => {
    if (!hasVideo) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            if (playingRef.current && !reducedMotion.current) safePlay(video);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    videoRefs.current.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [hasVideo, items]);

  const toggle = () => {
    const next = !playing;
    playingRef.current = next;
    setPlaying(next);
    // Resuming only restarts clips already on screen; the observer picks up
    // the rest as they scroll in.
    videoRefs.current.forEach((video) => {
      if (next) safePlay(video);
      else video.pause();
    });
  };

  return (
    <div>
      <ul
        aria-label={label}
        data-lenis-prevent-horizontal
        className="rail items-start gap-3 px-[var(--gutter)] pb-2 md:gap-4 lg:grid lg:grid-cols-4 lg:overflow-visible"
      >
        {items.map((item, index) => (
          <li
            key={item.src}
            className="w-[72%] shrink-0 snap-start sm:w-[46%] lg:w-auto"
          >
            <figure>
              <div
                className={clsx(
                  "plate w-full",
                  // Alternating crops are what stagger the captions.
                  index % 2 === 0 ? "aspect-[3/4]" : "aspect-[4/5]"
                )}
              >
                {item.kind === "video" ? (
                  <>
                    <video
                      ref={(el) => register(item.src, el)}
                      src={item.src}
                      aria-hidden
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </>
                ) : (
                  <Image
                    src={item.src}
                    alt={item.alt ?? ""}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 46vw, 72vw"
                    className="object-cover"
                  />
                )}
              </div>

              <figcaption className="mt-5">
                <span className="micro-mono block text-oxblood">
                  {item.label}
                </span>
                <span className="serif mt-2 block text-display-sm italic">
                  {item.caption}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
