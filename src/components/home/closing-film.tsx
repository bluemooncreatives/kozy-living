"use client";

import { PauseIcon, PlayIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The closing band's films. The clips are 9:16 Reels and the band is 2:1, so
 * a cover crop keeps only the middle ~28% of their height - measured, it cut
 * the heads off one shot and the cushions off the next. Each clip is shown
 * WHOLE as a portrait strip at the band's height instead, over a blurred,
 * dimmed copy of itself that fills the rest of the frame. Both layers of a
 * clip are one file (the second is served from cache) and are driven
 * together so the fill never drifts from the strip.
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
  const strips = useRef<(HTMLVideoElement | null)[]>([]);
  const fills = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visible = useRef(false);
  // A pause pressed by the shopper outlasts scrolling away and back.
  const held = useRef(false);
  const reduced = useRef(false);

  const pair = (index: number) => [strips.current[index], fills.current[index]];

  const play = useCallback((index: number) => {
    // Autoplay can still be refused (low power mode, data saver); the frame
    // then simply stays put.
    Promise.all(pair(index).map((v) => v?.play())).then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, []);

  const stop = useCallback((index: number) => {
    pair(index).forEach((v) => v?.pause());
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
    pair(next).forEach((v) => {
      if (v) v.currentTime = 0;
    });
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
        <div
          key={src}
          className={clsx(
            "absolute inset-0 transition-opacity duration-1000 ease-in-out",
            index === active ? "opacity-100" : "opacity-0",
          )}
        >
          <video
            ref={(el) => {
              fills.current[index] = el;
            }}
            src={src}
            aria-hidden
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl"
          />
          <video
            ref={(el) => {
              strips.current[index] = el;
            }}
            src={src}
            aria-hidden
            muted
            playsInline
            preload="metadata"
            onEnded={index === active ? () => advanceFrom(index) : undefined}
            className="absolute inset-y-0 left-1/2 aspect-[9/16] h-full -translate-x-1/2 object-cover shadow-[0_0_3rem_rgba(35,50,75,0.35)]"
          />
        </div>
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
