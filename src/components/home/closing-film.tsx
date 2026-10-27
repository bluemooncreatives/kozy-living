"use client";

import { PauseIcon, PlayIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The closing band's films, cover-cropped to fill the band (owner's call,
 * 2026-10-28). The clips are 9:16 Reels and the band is 2:1, so only a
 * horizontal slice of each survives; it is held a little above centre, where
 * the faces and hands sit. They used to be shown whole as a portrait strip
 * over a blurred copy of themselves, which left two-thirds of the band as
 * blur.
 *
 * A playlist, crossfaded on `ended` like the hero's: the native `loop`
 * attribute is never set, because it suppresses that event.
 *
 * Plays only while the band is on screen - it is the last thing on the page,
 * and most visits never reach it. Under `prefers-reduced-motion: reduce` it
 * holds the first clip's opening frame. The loop runs past five seconds, so
 * WCAG 2.2.2 asks for a pause control: the same sage toggle the hero carries.
 */
export default function ClosingFilm({ clips }: { clips: readonly string[] }) {
  const frame = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visible = useRef(false);
  // A pause pressed by the shopper outlasts scrolling away and back.
  const held = useRef(false);
  const reduced = useRef(false);

  const play = useCallback((index: number) => {
    // Autoplay can still be refused (low power mode, data saver); the frame
    // then simply stays put.
    Promise.resolve(videos.current[index]?.play()).then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, []);

  const stop = useCallback((index: number) => {
    videos.current[index]?.pause();
    setPlaying(false);
  }, []);

  // Re-runs on every turn of the playlist, so a reduced-motion or visibility
  // change always acts on the clip actually on screen, not a stale one.
  useEffect(() => {
    const root = frame.current;
    if (!root) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      reduced.current = media.matches;
      if (visible.current && !media.matches && !held.current) play(active);
      else stop(active);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
        sync();
      },
      { threshold: 0.15 },
    );
    observer.observe(root);
    media.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
    };
  }, [active, play, stop]);

  const advanceFrom = (index: number) => {
    const next = (index + 1) % clips.length;
    const video = videos.current[next];
    if (video) video.currentTime = 0;
    // One clip: restart it in place - `active` would not change, so the
    // effect above would not run to play it again.
    if (next === index) play(index);
    setActive(next);
  };

  const toggle = () => {
    held.current = playing;
    if (playing) stop(active);
    else play(active);
  };

  return (
    <div
      ref={frame}
      className="absolute inset-0 overflow-hidden rounded-plate bg-ink"
    >
      {clips.map((src, index) => (
        <video
          key={src}
          ref={(el) => {
            videos.current[index] = el;
          }}
          src={src}
          aria-hidden
          muted
          playsInline
          preload="metadata"
          onEnded={index === active ? () => advanceFrom(index) : undefined}
          className={clsx(
            "absolute inset-0 h-full w-full object-cover object-[center_40%] transition-opacity duration-1000 ease-in-out",
            index === active ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause video" : "Play video"}
        aria-pressed={!playing}
        // Mid-height on the right: clear of the copy row above and of the
        // wordmark and seal, which overhang the band's foot.
        className="on-dark absolute right-3 top-[45%] z-20 flex h-8 w-8 items-center justify-center rounded-full border border-sage text-sage transition-colors hover:bg-sage hover:text-ink md:right-5 md:top-1/2"
      >
        {playing ? (
          <PauseIcon aria-hidden className="h-4 w-4" />
        ) : (
          <PlayIcon aria-hidden className="h-4 w-4 translate-x-[1px]" />
        )}
      </button>
    </div>
  );
}
