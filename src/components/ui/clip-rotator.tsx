"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { nextFilm, releaseFilm, reserveFilm } from "@/lib/hero-clips";

gsap.registerPlugin(useGSAP);

/** How long a clip holds the frame before the next one blends in. */
const HOLD = 11;
/** Length of the dissolve itself. */
const BLEND = 1.6;
/** Give up waiting for a clip to buffer after this and cut to it anyway. */
const BUFFER_LIMIT = 2500;
/** Begin fetching the next clip this long before its transition. */
const WARM_AHEAD = 4;

/**
 * The feature plate's film loop. The plate paints the
 * film at `start` in the shared `films` list, then takes whatever the shared
 * queue in `@/lib/hero-clips` hands it next, so the reel runs end to end.
 *
 * ONE INVARIANT MAKES A BLANK EDGE IMPOSSIBLE, and every decision below
 * follows from it: at every frame of the transition, every pixel of the plate
 * is covered either by the outgoing clip - opaque, full bleed, never moved -
 * or by the incoming one.
 *
 * So the two clips dissolve into each other in place. The incoming layer sits
 * full bleed on top and fades 0 to 1; the outgoing layer holds at full opacity
 * underneath for the whole blend and is only dropped afterwards, in a single
 * step, when it is already completely covered. At no point are both layers
 * translucent, which is what a naive crossfade gets wrong. Nothing travels
 * into frame either - the only motion is a scale settling from 1.05 to 1, and
 * a scale above 1 can only ever over-cover.
 *
 * The layers carry NO inline transform from React. GSAP reads an element's
 * existing transform as its base and composes `xPercent` on top of it, so a
 * static `translateX(8%)` in the markup became a permanent 63px offset that
 * survived every tween - which is exactly the blank band this component was
 * once reported for. The initial state is set by GSAP, in the effect, or not
 * at all.
 *
 * Two stacked <video> layers rather than one element with a swapped `src`: a
 * source swap blanks the frame for as long as the next file takes to buffer.
 * The incoming layer is loaded and playing BEFORE the blend runs, so the
 * transition is only ever between two live frames. It also means stepping back
 * is instant - the previous clip is still loaded in the other layer, so the
 * source is left alone when it already holds what was asked for.
 *
 * The next file is warmed before the hold ends, and all playback/timers stop
 * when the feature is outside the viewport or the tab is hidden.
 *
 * `prefers-reduced-motion: reduce` opts out entirely and simply holds the
 * starting film - no rotation, no blend, and no controls to start one. Every
 * layer is `aria-hidden`: these are decorative surfaces, and the copy over
 * them already carries the meaning.
 */
export default function ClipRotator({
  films,
  start,
  delay = 0,
  controls,
  poster,
  className,
}: {
  /** The shared list every plate draws from. */
  films: readonly string[];
  /** Which of those this plate paints before any of this runs. */
  start: number;
  delay?: number;
  /** Draws the prev/next buttons. For the large frames only. */
  controls?: boolean;
  poster?: string;
  className?: string;
}) {
  // Server and client both render this one, before any queue exists.
  const first = films[start] ?? films[0]!;

  const rootRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scalerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  // Filled in by the effect. The buttons are rendered by React but driven
  // from inside the GSAP scope, where all the sequencing state lives.
  const stepRef = useRef<((back: boolean) => void) | null>(null);

  useGSAP(
    () => {
      const layers = layerRefs.current;
      const videos = videoRefs.current;
      if (!layers[0] || !layers[1]) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        videos.forEach((video) => video?.pause());
        return;
      }

      // The film already painted is claimed here rather than at the queue,
      // so the other plates route around it from their very first turn.
      reserveFilm(first);

      // The whole starting state, owned by GSAP rather than by the markup.
      gsap.set(layers[0], { zIndex: 2, opacity: 1 });
      gsap.set(layers[1], { zIndex: 1, opacity: 0 });

      let active = 0;
      // What each plate has shown, oldest first, current last. Stepping back
      // walks this rather than picking at random, so the button returns the
      // clip the viewer just saw.
      const history: string[] = [first];

      let timer: ReturnType<typeof setTimeout> | undefined;
      let warmTimer: ReturnType<typeof setTimeout> | undefined;
      let timeline: gsap.core.Timeline | undefined;
      let detach: (() => void) | undefined;
      let busy = false;
      let stopped = false;
      let inView = true;
      let pageVisible = !document.hidden;
      let staged: string | null = null;
      let claimed: string | null = null;

      const current = () => history[history.length - 1]!;

      const warmNext = () => {
        if (stopped || busy || staged || !inView || !pageVisible) return;
        const incomingVideo = videos[active === 0 ? 1 : 0];
        if (!incomingVideo) return;

        staged = nextFilm(films, current());
        if (incomingVideo.src !== staged) {
          incomingVideo.preload = "auto";
          incomingVideo.src = staged;
          incomingVideo.load();
        }
      };

      const schedule = (seconds: number) => {
        clearTimeout(timer);
        clearTimeout(warmTimer);
        if (stopped || busy || !inView || !pageVisible) return;
        warmTimer = setTimeout(
          warmNext,
          Math.max(0, seconds - WARM_AHEAD) * 1000,
        );
        timer = setTimeout(() => step(false), seconds * 1000);
      };

      /** Resolves once the layer has a frame to show, or once we give up. */
      const buffer = (video: HTMLVideoElement) =>
        new Promise<boolean>((resolve) => {
          let settled = false;
          const done = (ready: boolean) => {
            if (settled) return;
            settled = true;
            clearTimeout(guard);
            video.removeEventListener("canplay", onReady);
            detach = undefined;
            resolve(ready);
          };

          const onReady = () => done(true);
          const guard = setTimeout(() => done(false), BUFFER_LIMIT);
          video.addEventListener("canplay", onReady);
          // Unmounting mid-buffer must not leave the listener or the guard
          // behind - the promise is simply abandoned along with them.
          detach = () => {
            clearTimeout(guard);
            video.removeEventListener("canplay", onReady);
          };

          if (video.readyState >= 3) done(true);
        });

      /**
       * The film shown before this one - or, if another plate has claimed it
       * since, whatever the queue offers instead. Never the one on screen.
       */
      const backPick = (): string | null => {
        const prior = history[history.length - 2];
        if (!prior) return null;
        if (reserveFilm(prior)) return prior;
        return nextFilm(films, current());
      };

      const step = async (back: boolean) => {
        // A click landing mid-blend is dropped rather than queued: two
        // timelines on one pair of layers is how a layer ends up stranded
        // half-faded.
        if (busy || stopped) return;

        const nextIndex = active === 0 ? 1 : 0;
        const incomingLayer = layers[nextIndex];
        const incomingVideo = videos[nextIndex];
        const outgoingLayer = layers[active];
        if (!incomingLayer || !incomingVideo || !outgoingLayer) return;

        clearTimeout(timer);
        clearTimeout(warmTimer);

        // A manual previous action invalidates the forward clip we warmed.
        if (back && staged) {
          releaseFilm(staged);
          staged = null;
        }

        const stepping = back ? backPick() : null;
        const incoming = stepping ?? staged ?? nextFilm(films, current());
        const wentBack = back && stepping !== null;
        staged = null;
        claimed = incoming;

        busy = true;

        // Re-assigning the same source would tear down a clip that is already
        // buffered and playing - which is precisely the case when stepping
        // back onto the layer that just left.
        if (incomingVideo.src !== incoming) {
          incomingVideo.src = incoming;
          incomingVideo.load();
        }
        const ready = await buffer(incomingVideo);
        if (stopped) {
          releaseFilm(incoming);
          claimed = null;
          return;
        }
        if (!ready) {
          // Keep the fully painted outgoing clip. A slow or malformed remote
          // file is skipped instead of being allowed to create a blank frame.
          releaseFilm(incoming);
          claimed = null;
          busy = false;
          schedule(1.5);
          return;
        }

        // The play promise resolves only once playback has actually started.
        // Waiting for it prevents the dissolve from outrunning the decoder.
        await incomingVideo.play().catch(() => {});

        const outgoing = current();

        timeline = gsap
          .timeline({
            onComplete: () => {
              releaseFilm(outgoing);
              const spent = videos[active];
              // Freeing the file that just left keeps three plates from
              // holding six decoded videos between them.
              if (spent) spent.pause();

              active = nextIndex;
              if (wentBack) {
                history.pop();
                history.pop();
              }
              history.push(incoming);
              claimed = null;
              // Deep history is never replayed - two entries back is as far
              // as two layers can go - so it is trimmed rather than grown.
              if (history.length > 4) history.shift();

              busy = false;
              schedule(HOLD);
            },
          })
          // Both layers start the blend in position, at full size and fully
          // opaque underneath. `x`, `y` and `xPercent` are pinned to zero
          // rather than left unset, so no base transform can survive into a
          // tween.
          .set(outgoingLayer, { zIndex: 1, opacity: 1 })
          .set(incomingLayer, {
            zIndex: 2,
            opacity: 0,
            x: 0,
            y: 0,
            xPercent: 0,
            yPercent: 0,
          })
          .to(
            incomingLayer,
            { opacity: 1, duration: BLEND, ease: "power2.inOut" },
            0,
          )
          // The only movement in the frame. It runs on the scaler, not on the
          // <video>: the clip carries the plate's `transition-transform`
          // hover push, and two owners writing one transform means the hover
          // dies and every tweened frame is dragged through a 700ms CSS
          // transition. Slightly longer than the blend so the new clip is
          // still settling as it lands.
          .fromTo(
            scalerRefs.current[nextIndex],
            { scale: 1.025 },
            { scale: 1, duration: BLEND * 1.3, ease: "power2.inOut" },
            0,
          )
          // Safe now, and only now: the incoming clip is fully opaque over
          // it, so dropping the outgoing one in a single step is invisible.
          .set(outgoingLayer, { opacity: 0 });
      };

      stepRef.current = (back: boolean) => step(back);

      const syncPlayback = () => {
        pageVisible = !document.hidden;
        const shouldRun = inView && pageVisible;

        if (!shouldRun) {
          clearTimeout(timer);
          clearTimeout(warmTimer);
          timeline?.pause();
          videos.forEach((video) => video?.pause());
          return;
        }

        timeline?.resume();
        if (busy) {
          videos.forEach((video) => void video?.play().catch(() => {}));
        } else {
          void videos[active]?.play().catch(() => {});
          schedule(HOLD + delay);
        }
      };

      const observer = new IntersectionObserver(
        ([entry]) => {
          inView = Boolean(entry?.isIntersecting);
          syncPlayback();
        },
        { rootMargin: "160px" },
      );
      if (rootRef.current) observer.observe(rootRef.current);
      document.addEventListener("visibilitychange", syncPlayback);
      syncPlayback();

      return () => {
        stopped = true;
        stepRef.current = null;
        clearTimeout(timer);
        clearTimeout(warmTimer);
        detach?.();
        timeline?.kill();
        observer.disconnect();
        document.removeEventListener("visibilitychange", syncPlayback);
        releaseFilm(current());
        releaseFilm(staged);
        releaseFilm(claimed);
      };
    },
    { scope: rootRef, dependencies: [first, films, delay] },
  );

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      {[0, 1].map((index) => (
        <div
          key={index}
          ref={(el) => {
            layerRefs.current[index] = el;
          }}
          // A class, never a style object: React re-applies an inline style on
          // every render and would fight GSAP for the same properties.
          className={
            index === 0 ? "absolute inset-0" : "absolute inset-0 opacity-0"
          }
        >
          <div
            ref={(el) => {
              scalerRefs.current[index] = el;
            }}
            className="absolute inset-0"
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={index === 0 ? first : undefined}
              poster={index === 0 ? poster : undefined}
              aria-hidden
              autoPlay={index === 0}
              muted
              loop
              playsInline
              preload={index === 0 ? "auto" : "metadata"}
              className={className}
            />
          </div>
        </div>
      ))}

      {controls ? (
        <div className="absolute right-3 top-3 z-30 flex items-center gap-2 motion-reduce:hidden md:right-5 md:top-5">
          {[
            { back: true, label: "Previous clip", Icon: ChevronLeftIcon },
            { back: false, label: "Next clip", Icon: ChevronRightIcon },
          ].map(({ back, label, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => stepRef.current?.(back)}
              // Icon-only, so the accessible name comes from aria-label
              // rather than from a visible one.
              aria-label={label}
              className="glass flex h-9 w-9 items-center justify-center rounded-full p-0 text-paper transition-transform duration-300 ease-editorial hover:scale-105 active:scale-95"
            >
              <Icon aria-hidden className="h-4 w-4" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
