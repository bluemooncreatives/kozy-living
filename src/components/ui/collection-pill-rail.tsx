"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useRef } from "react";
import { collectionPills } from "@/lib/site";

gsap.registerPlugin(useGSAP);

type Pill = (typeof collectionPills)[number];
const previewSources = Array.from(
  new Set(collectionPills.map((pill) => pill.previewVideo))
);

/**
 * Collection links with one shared, mouse-following preview. The panel lives
 * for the full rail hover, while its preloaded video layers crossfade as the
 * active pill changes.
 */
export default function CollectionPillRail() {
  const scope = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const videoPlayers = useRef(new Map<string, HTMLVideoElement>());
  const enabled = useRef(false);
  const visible = useRef(false);
  const activeSource = useRef("");
  const revealTimeline = useRef<gsap.core.Timeline | null>(null);
  const moveX = useRef<(value: number) => void>(() => undefined);
  const moveY = useRef<(value: number) => void>(() => undefined);

  useGSAP(
    () => {
      const portal = preview.current;
      if (!portal) return;

      const media = gsap.matchMedia();

      media.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          enabled.current = true;
          gsap.set(portal, {
            autoAlpha: 0,
          });

          moveX.current = gsap.quickTo(portal, "x", {
            duration: 0.18,
            ease: "power3.out",
          });
          moveY.current = gsap.quickTo(portal, "y", {
            duration: 0.18,
            ease: "power3.out",
          });

          return () => {
            enabled.current = false;
            visible.current = false;
            revealTimeline.current?.kill();
            videoPlayers.current.forEach((video) => video.pause());
            gsap.set(portal, { autoAlpha: 0 });
          };
        }
      );

      return () => media.revert();
    },
    { scope }
  );

  function movePreview(clientX: number, clientY: number, immediate = false) {
    const portal = preview.current;
    if (!portal) return;

    const size = portal.offsetWidth;
    const edge = 16;
    let x = clientX - size / 2;
    let y = clientY - size / 2;

    x = Math.max(edge, Math.min(x, window.innerWidth - size - edge));
    y = Math.max(edge, Math.min(y, window.innerHeight - size - edge));

    if (immediate) {
      gsap.set(portal, { x, y });
      return;
    }

    moveX.current(x);
    moveY.current(y);
  }

  function activateVideo(source: string) {
    const nextVideo = videoPlayers.current.get(source);
    if (!nextVideo) return;

    void nextVideo.play().catch(() => {
      // Muted inline playback is normally allowed; a blocked preview simply
      // holds its first frame while the interaction remains functional.
    });

    if (activeSource.current === source) return;

    const previousVideo = videoPlayers.current.get(activeSource.current);
    activeSource.current = source;

    if (previousVideo) {
      gsap.to(previousVideo, {
        opacity: 0,
        duration: 0.2,
        ease: "none",
        overwrite: true,
        onComplete: () => previousVideo.pause(),
      });
    }

    gsap.to(nextVideo, {
      opacity: 1,
      duration: 0.25,
      ease: "power1.out",
      overwrite: true,
    });
  }

  function reveal(pill: Pill, clientX: number, clientY: number) {
    const portal = preview.current;
    if (!enabled.current || !portal) return;

    movePreview(clientX, clientY, !visible.current);
    activateVideo(pill.previewVideo);
    revealTimeline.current?.kill();
    visible.current = true;

    revealTimeline.current = gsap
      .timeline()
      .set(portal, { visibility: "visible" })
      .to(portal, {
        autoAlpha: 1,
        duration: 0.3,
        ease: "power1.out",
      });
  }

  function conceal() {
    const portal = preview.current;
    if (!enabled.current || !portal || !visible.current) return;

    revealTimeline.current?.kill();
    revealTimeline.current = gsap
      .timeline({
        onComplete: () => {
          visible.current = false;
          videoPlayers.current.forEach((video) => video.pause());
          gsap.set(portal, { visibility: "hidden" });
        },
      })
      .to(portal, {
        autoAlpha: 0,
        duration: 0.25,
        ease: "power1.in",
      });
  }

  return (
    <div ref={scope}>
      <ul
        className="shell mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3"
        onPointerMove={(event) =>
          visible.current && movePreview(event.clientX, event.clientY)
        }
        onPointerLeave={conceal}
      >
        {collectionPills.map((pill) => (
          <li key={pill.title}>
            <Link
              href={pill.handle ? `/search/${pill.handle}` : "/search"}
              prefetch={false}
              className="pill"
              onPointerEnter={(event) =>
                reveal(pill, event.clientX, event.clientY)
              }
              onFocus={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                reveal(pill, bounds.right, bounds.top + bounds.height / 2);
              }}
              onBlur={conceal}
            >
              {pill.title}
            </Link>
          </li>
        ))}
      </ul>

      <div
        ref={preview}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0 z-[998] aspect-square overflow-hidden rounded-[1.5rem] border border-rule bg-paper opacity-0 shadow-[0_24px_70px_rgba(52,23,6,0.18)] will-change-[transform,opacity]"
        style={{ width: "min(64vw, calc(100vh - 8rem), 26rem)" }}
      >
        {previewSources.map((source) => (
          <video
            key={source}
            ref={(node) => {
              if (node) videoPlayers.current.set(source, node);
              else videoPlayers.current.delete(source);
            }}
            src={source}
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover opacity-0"
          />
        ))}
      </div>
    </div>
  );
}
