"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";
import Image from "@/components/ui/shop-image";
import { kozyStory } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type CollageTile = { url: string; alt: string };

/**
 * The collage band: one solid line, three ghosted ones, a small photograph
 * hung off the end of each, and faint arcs behind the lot.
 *
 * CENTRED AS A BLOCK, AND EACH TILE BELONGS TO A LINE. The first cut placed
 * the tiles at fixed percentages of the band, which have no relationship to
 * where the type actually ends - so at every width some tile sat on a letter
 * ("comfo|rt", the N of "natural", the note under the stack). Now the lines
 * are staggered inside one block that centres on the page, and each tile is
 * hung off its own line, alternating sides - after the lead, before the
 * first ghost, and so on - sized in `em` of that line, so it lands in the
 * space the line leaves at any font size. The geometry is all in
 * `.collage-stack`.
 *
 * Below md the lines sit too close to the right margin to hang anything off,
 * so the inline tiles are hidden and the same frames form a row under the
 * stack instead (hidden lazy images are never fetched, so this costs nothing).
 *
 * THE LINES ARE A SWITCH. Each line is a button; the pressed one is set
 * solid and the rest fall back to ghosts, and the tiles crossfade to that
 * line's set of photographs. The solid line of the original composition is
 * simply the first one pressed. Every set is mounted from the start and
 * faded by opacity - the tiles are thumbnails, and a click that waited on a
 * fetch would show an empty oat square first.
 *
 * The ghosts are indigo at 14%: deliberately below reading contrast, which
 * is why every one of them repeats something the page states properly
 * elsewhere. They lift on hover and focus, so an unpressed line still reads
 * as something to press.
 */
export default function WordCollage({
  sets,
}: {
  /** One set of four frames per line, in line order. */
  sets: CollageTile[][];
}) {
  const scope = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const safe = contextSafe!;

      safe(() => {
        // Each tile drifts at its own rate, which is what makes the band read
        // as layered rather than as one flat image. Scrubbed against the band
        // itself, so the drift is over by the time it leaves the screen.
        //
        // Kept to a tenth of the tile or so. A tile is 1em tall on a 0.98em
        // line, and the glyphs of the line above end about 0.2em short of it:
        // the old 12-30% drift walked tiles straight into the letters.
        gsap.utils
          .toArray<HTMLElement>("[data-tile]", root)
          .forEach((tile, i) => {
            gsap.fromTo(
              tile,
              { yPercent: 8 + i * 2 },
              {
                yPercent: -(8 + i * 2),
                ease: "none",
                scrollTrigger: {
                  trigger: root,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.6,
                },
              },
            );
          });

        gsap.fromTo(
          root.querySelectorAll("[data-arc]"),
          { scale: 0.92, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 1.6,
            stagger: 0.15,
            ease: "expo.out",
            scrollTrigger: { trigger: root, start: "top 80%" },
          },
        );
      })();
    },
    { scope },
  );

  const { collage } = kozyStory;
  const lines = [collage.lead, ...collage.ghosts];

  return (
    <section
      ref={scope}
      aria-label="What the cloth carries"
      className="collage"
    >
      {/* Concentric arcs rising from the foot of the band, centred under the
          stack. Drawn rather than imaged: they carry the same geometry as
          the seal and the notch without costing a request. */}
      <svg
        aria-hidden
        className="collage-arcs"
        viewBox="0 0 1200 520"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle data-arc cx="600" cy="620" r="300" />
        <circle data-arc cx="600" cy="620" r="450" />
        <circle data-arc cx="600" cy="620" r="600" />
      </svg>

      <div
        role="group"
        aria-label="What the cloth carries - choose one to see it"
        className="collage-stack"
      >
        {lines.map((line, i) => (
          <button
            key={line}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={`collage-line${i === active ? " is-active" : ""}`}
          >
            <span className="collage-words">
              {line}
              {/* Decorative: it sits inside a line of type, where an alt
                  would be read out in the middle of the phrase. The slot
                  drifts on scroll; the layers inside it crossfade. */}
              <span aria-hidden data-tile className="collage-tile collage-tile-hung">
                <TileLayers sets={sets} slot={i} active={active} sizes="10vw" />
              </span>
            </span>
          </button>
        ))}
      </div>

      <p className="collage-note">
        {collage.note} <span className="text-ink">{collage.hint}</span>
      </p>

      <div aria-hidden className="collage-tiles">
        {lines.map((line, i) => (
          <div key={line} className="collage-tile">
            <TileLayers sets={sets} slot={i} active={active} sizes="25vw" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** One tile's frame from every set, stacked; only the active set shows. */
function TileLayers({
  sets,
  slot,
  active,
  sizes,
}: {
  sets: CollageTile[][];
  slot: number;
  active: number;
  sizes: string;
}) {
  return (
    <>
      {sets.map((set, s) => {
        const tile = set[slot];
        if (!tile) return null;

        return (
          <span
            key={`${s}-${tile.url}`}
            className={`collage-layer${s === active ? " is-active" : ""}`}
          >
            <Image
              src={tile.url}
              alt=""
              fill
              sizes={sizes}
              className="object-cover"
            />
          </span>
        );
      })}
    </>
  );
}
