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



/**
 * A plate's film loop. There is no per-plate playlist: the plate paints the
 * film at `start` in the shared `films` list, then takes whatever the shared
 * queue in `@/lib/hero-clips` hands it next. With all three plates drawing
 * from the one list, and the queue carrying on from wherever the last plate
 * stopped, the reel runs end to end across the bento instead of each box
 * looping its own set.
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
 * Collisions are handled at the desk in `@/lib/hero-clips`: a film is checked
 * out before it is loaded and only checked back in once it has left the
 * screen, so the three plates can never land on the same film - not even
 * mid-blend, when both clips are on screen.
 *
 * `delay` staggers the plates against each other. All three share one hold
 * duration, so offsetting the start is enough to keep their transitions from
 * ever firing on the same frame.
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
  className,
}: {
  /** The shared list every plate draws from. */
  films: readonly string[];
  /** Which of those this plate paints before any of this runs. */
  start: number;
  delay?: number;
  /** Draws the prev/next buttons. For the large frames only. */
  controls?: boolean;
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
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const layers = layerRefs.current;
      const videos = videoRefs.current;
      if (!layers[0] || !layers[1]) return;

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
      let timeline: gsap.core.Timeline | undefined;
      let detach: (() => void) | undefined;
      let busy = false;
      let stopped = false;

      const current = () => history[history.length - 1]!;

      const schedule = (seconds: number) => {
        clearTimeout(timer);
        timer = setTimeout(() => step(false), seconds * 1000);
      };

      /** Resolves once the layer has a frame to show, or once we give up. */
      const buffer = (video: HTMLVideoElement) =>
        new Promise<void>((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            clearTimeout(guard);
            video.removeEventListener("canplay", done);
            detach = undefined;
            resolve();
          };

          const guard = setTimeout(done, BUFFER_LIMIT);
          video.addEventListener("canplay", done);
          // Unmounting mid-buffer must not leave the listener or the guard
          // behind - the promise is simply abandoned along with them.
          detach = () => {
            clearTimeout(guard);
            video.removeEventListener("canplay", done);
          };

          if (video.readyState >= 3) done();
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

        const stepping = back ? backPick() : null;
        const incoming = stepping ?? nextFilm(films, current());
        const wentBack = back && stepping !== null;

        busy = true;
        clearTimeout(timer);

        // Re-assigning the same source would tear down a clip that is already
        // buffered and playing - which is precisely the case when stepping
        // back onto the layer that just left.
        if (incomingVideo.src !== incoming) {
          incomingVideo.src = incoming;
          incomingVideo.load();
        }
        await buffer(incomingVideo);
        if (stopped) {
          releaseFilm(incoming);
          return;
        }

        // A refused autoplay (low power mode, data saver) is not worth
        // surfacing: the clip holds its first frame and the blend still runs.
        void incomingVideo.play().catch(() => {});

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
            0
          )
          // The only movement in the frame. It runs on the scaler, not on the
          // <video>: the clip carries the plate's `transition-transform`
          // hover push, and two owners writing one transform means the hover
          // dies and every tweened frame is dragged through a 700ms CSS
          // transition. Slightly longer than the blend so the new clip is
          // still settling as it lands.
          .fromTo(
            scalerRefs.current[nextIndex],
            { scale: 1.05 },
            { scale: 1, duration: BLEND * 1.3, ease: "power2.inOut" },
            0
          )
          // Safe now, and only now: the incoming clip is fully opaque over
          // it, so dropping the outgoing one in a single step is invisible.
          .set(outgoingLayer, { opacity: 0 });
      };

      stepRef.current = (back: boolean) => step(back);
      schedule(HOLD + delay);

      return () => {
        stopped = true;
        stepRef.current = null;
        clearTimeout(timer);
        detach?.();
        timeline?.kill();
        releaseFilm(current());
      };
    },
    { scope: rootRef, dependencies: [first, films, delay] }
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
              aria-hidden
              autoPlay={index === 0}
              muted
              loop
              playsInline
              preload={index === 0 ? "auto" : "none"}
              className={className}
            />
          </div>
        </div>
      ))}

      {controls ? (
        <div className="absolute right-3 top-3 z-30 flex items-center gap-2 md:right-5 md:top-5">
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
