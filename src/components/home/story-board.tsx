"use client";

import clsx from "clsx";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { HiArrowLeft, HiArrowRight, HiArrowUpRight } from "react-icons/hi2";
import Image from "@/components/ui/shop-image";
import CircledWord from "@/components/ui/circled-word";
import ActionButton from "@/components/ui/action-button";
import { displayFace, Eyebrow } from "@/components/ui/section";
import { aboutStory } from "@/lib/site";

gsap.registerPlugin(Flip);

export type StoryCard = {
  index: string;
  kicker: string;
  lede: { lead: string; accent: string };
  body: string;
  cta: string;
  href: string;
  alt: string;
  images: { url: string; altText?: string | null }[];
};

/**
 * One circular deck occupies two small left slots and two large right slots.
 * FLIP matches card identities across those containers so the actual card
 * travels between them. Slots retain their size throughout an exchange.
 */
export default function StoryBoard({ cards }: { cards: StoryCard[] }) {
  const scope = useRef<HTMLDivElement>(null);
  const motion = useRef<gsap.core.Timeline | null>(null);
  const locked = useRef(false);
  const queued = useRef<number | null>(null);
  const advanceRef = useRef<((direction: number) => void) | null>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  const count = cards.length;
  const smallCount = Math.min(2, Math.max(0, count - 1));
  const ordered = cards.map(
    (_, index) => cards[(index + count - smallCount + offset) % count]!,
  );

  const advance = useCallback(
    (direction: number) => {
      const root = scope.current;
      if (!root || count < 2) return;
      // Keep at most one pending intent, including reversals during a transition.
      if (locked.current) {
        queued.current = direction;
        return;
      }
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const targets = root.querySelectorAll("[data-story-card]");
      const focusedCard =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest<HTMLElement>("[data-story-card]")
              ?.dataset.storyCard
          : undefined;
      const state = reduced
        ? null
        : Flip.getState(targets, { props: "borderRadius" });
      locked.current = true;
      flushSync(() =>
        setOffset((value) => (value + direction + count) % count),
      );
      if (focusedCard) {
        Array.from(root.querySelectorAll<HTMLElement>("[data-story-card]"))
          .find((element) => element.dataset.storyCard === focusedCard)
          ?.querySelector<HTMLElement>("a")
          ?.focus({ preventScroll: true });
      }
      const finish = () => {
        locked.current = false;
        motion.current = null;
        root.classList.remove("is-exchanging");
        const next = queued.current;
        queued.current = null;
        if (next) advanceRef.current?.(next);
      };
      if (!state) {
        finish();
        return;
      }
      root.classList.add("is-exchanging");
      motion.current = Flip.from(state, {
        targets: root.querySelectorAll("[data-story-card]"),
        duration: 0.72,
        ease: "power3.inOut",
        // Cards already have absolute positioning inside stable slots.
        // Animate their bounds, not a scale that stretches text and buttons.
        absolute: false,
        scale: false,
        zIndex: 5,
        prune: true,
        onEnter: (elements) =>
          gsap.fromTo(
            elements,
            { opacity: 0 },
            { opacity: 1, duration: 0.55, delay: 0.2, clearProps: "opacity" },
          ),
        onComplete: finish,
      });
      // Copy appears after the silhouette has moved, avoiding stretched text.
      motion.current.fromTo(
        root.querySelectorAll(".story-card-footer"),
        {
          opacity: 0,
          y: 10,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          clearProps: "transform,opacity",
        },
        0.4,
      );
    },
    [count],
  );

  useEffect(() => {
    advanceRef.current = advance;
    return () => {
      advanceRef.current = null;
    };
  }, [advance]);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    // A breakpoint change finishes the current exchange before new geometry
    // is measured. Cleanup also prevents a timeline surviving navigation.
    let width = root.clientWidth;
    const observer = new ResizeObserver(() => {
      if (root.clientWidth !== width) {
        width = root.clientWidth;
        queued.current = null;
        motion.current?.progress(1);
      }
    });
    observer.observe(root);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (media.matches) {
        queued.current = null;
        motion.current?.progress(1);
      }
    };
    media.addEventListener("change", reduce);
    const rail = root.querySelector<HTMLElement>("#story-rail");
    let wheelDistance = 0;
    let wheelTime = 0;
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - wheelTime > 180) wheelDistance = 0;
      wheelTime = now;
      if (locked.current) {
        wheelDistance = 0;
        return;
      }
      wheelDistance += event.deltaX;
      if (Math.abs(wheelDistance) >= 50) {
        advanceRef.current?.(wheelDistance > 0 ? 1 : -1);
        wheelDistance = 0;
      }
    };
    rail?.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      media.removeEventListener("change", reduce);
      rail?.removeEventListener("wheel", wheel);
      queued.current = null;
      motion.current?.kill();
    };
  }, []);

  const renderCard = (card: StoryCard, small: boolean) => (
    <article
      key={card.index}
      data-flip-id={`story-${card.index}`}
      data-story-card={card.index}
      className={clsx(
        "story-card group",
        small && "story-card-small",
        cards.indexOf(card) % 2 === 0 ? "story-corner-tr" : "story-corner-bl",
      )}
      aria-label={`${card.lede.lead} ${card.lede.accent}`}
    >
      <div className="story-card-surface">
        <div className="story-card-image">
          {card.images[0] && (
            <Image
              src={card.images[0].url}
              alt={card.alt}
              fill
              sizes="(min-width: 1024px) 28vw, 48vw"
              className="object-cover"
              draggable={false}
            />
          )}
        </div>
        <span className="story-card-shade" aria-hidden />
        <span className="story-tag">{card.kicker}</span>
        <div className="story-card-footer">
          <h3>
            {card.lede.lead} {card.lede.accent}
          </h3>
          <p>{card.body}</p>
        </div>
      </div>
      <StoryCornerLink href={card.href} label={card.cta} />
      <button
        type="button"
        className="story-preview-select"
        aria-label={`Show ${card.lede.lead} ${card.lede.accent}`}
        aria-controls="story-rail"
        onClick={() => {
          const distance = (cards.indexOf(card) - offset + count) % count;
          if (distance)
            advance(distance > count / 2 ? distance - count : distance);
        }}
      >
        <span className="story-preview-arrow" aria-hidden>
          <HiArrowUpRight />
        </span>
      </button>
    </article>
  );

  if (!count) return null;

  return (
    <div
      ref={scope}
      className="story-grid"
      role="region"
      aria-roledescription="carousel"
      aria-label="Our story"
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        advance(event.key === "ArrowRight" ? 1 : -1);
      }}
    >
      <div className="story-copy">
        <Eyebrow align="left">{aboutStory.eyebrow}</Eyebrow>
        <h2
          id="home-story"
          className={clsx(displayFace, "story-heading mt-4 text-display-lg")}
        >
          {aboutStory.title.map((line) => (
            <span className="block" key={line}>
              {line === aboutStory.circled ? (
                <CircledWord>{line}</CircledWord>
              ) : (
                line
              )}
            </span>
          ))}
        </h2>
        <p className="story-intro">{aboutStory.summary}</p>
        <div className="story-intro-actions">
          <ActionButton
            label={aboutStory.primary.label}
            href={aboutStory.primary.href}
            variant="solid"
          />
          <div className="story-nav story-mobile-nav">
            <button
              type="button"
              aria-label="Previous story card"
              aria-controls="story-rail"
              disabled={count < 2}
              onClick={() => advance(-1)}
            >
              <HiArrowLeft aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next story card"
              aria-controls="story-rail"
              disabled={count < 2}
              onClick={() => advance(1)}
            >
              <HiArrowRight aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <div
        id="story-rail"
        className="story-rail story-rail-area"
        tabIndex={0}
        aria-label="Story cards. Swipe or use the left and right arrow keys."
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          suppressClick.current = false;
          gesture.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          if (!gesture.current) return;
          const x = event.clientX - gesture.current.x;
          const y = event.clientY - gesture.current.y;
          if (Math.abs(y) > 12 && Math.abs(y) > Math.abs(x)) {
            gesture.current = null;
            return;
          }
          if (Math.abs(x) > 8 && Math.abs(x) > Math.abs(y)) {
            suppressClick.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          if (start && Math.abs(event.clientX - start.x) > 40)
            advance(event.clientX < start.x ? 1 : -1);
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onPointerLeave={() => {
          if (!suppressClick.current) gesture.current = null;
        }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        {ordered.slice(smallCount, smallCount + 2).map((card) => (
          <div className="story-cell" key={card.index}>
            {renderCard(card, false)}
          </div>
        ))}
      </div>
      <div className="story-actions">
        {ordered.slice(0, smallCount).map((card) => (
          <div className="story-small-slot" key={card.index}>
            {renderCard(card, true)}
          </div>
        ))}
        <div className="story-controls">
          <span className="story-position" aria-hidden>
            <span>{String(offset + 1).padStart(2, "0")}</span>
            <span className="story-position-line" />
            <span>{String(count).padStart(2, "0")}</span>
          </span>
          <div className="story-nav">
            <button
              type="button"
              aria-label="Previous story card"
              aria-controls="story-rail"
              disabled={count < 2}
              onClick={() => advance(-1)}
            >
              <HiArrowLeft aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next story card"
              aria-controls="story-rail"
              disabled={count < 2}
              onClick={() => advance(1)}
            >
              <HiArrowRight aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Featured story: {cards[offset]?.lede.lead} {cards[offset]?.lede.accent}.{" "}
        {offset + 1} of {count}.
      </p>
    </div>
  );
}

/** Same socketed arrow as the plates, with a small SVG contour morph. */
function StoryCornerLink({ href, label }: { href: string; label: string }) {
  const path = useRef<SVGPathElement>(null);
  const rest =
    "M32 3C48 3 61 16 61 32C61 48 48 61 32 61C16 61 3 48 3 32C3 16 16 3 32 3Z";
  const hover =
    "M32 3C53 3 61 11 61 32C61 53 53 61 32 61C11 61 3 53 3 32C3 11 11 3 32 3Z";
  const morph = (active: boolean) => {
    if (!path.current) return;
    gsap.to(path.current, {
      attr: { d: active ? hover : rest },
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 0.35,
      ease: "power2.out",
      overwrite: true,
    });
  };
  useEffect(() => {
    const element = path.current;
    return () => {
      if (element) gsap.killTweensOf(element);
    };
  }, []);
  return (
    <Link
      href={href}
      prefetch={false}
      className="story-corner-button"
      aria-label={label}
      onMouseEnter={() => morph(true)}
      onMouseLeave={() => morph(false)}
      onFocus={() => morph(true)}
      onBlur={() => morph(false)}
    >
      <svg viewBox="0 0 64 64" aria-hidden className="story-corner-shape">
        <path ref={path} d={rest} />
      </svg>
      <HiArrowUpRight aria-hidden className="story-corner-arrow" />
    </Link>
  );
}
