"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import Image from "@/components/ui/shop-image";
import { Eyebrow, Headline } from "@/components/ui/section";
import { kozyStory } from "@/lib/site";

gsap.registerPlugin(useGSAP);

/** The Kompanion a weave is shown in, resolved from its pinned handle. */
export type FibreKompanion = {
  title: string;
  handle: string;
  image: { url: string; alt: string };
};

/**
 * The material palette as a list that answers back: the live row fills
 * indigo, and a tilted card - a photograph over a caption - rides down the
 * list to park beside it, laid OVER the rows rather than in a column of its
 * own. In its own column the card was a separate object that never lined up
 * with the row it described; over the list it reads as that row's picture.
 *
 * EACH WEAVE IS SHOWN IN THE KOMPANION MADE OF IT. The card used to take
 * whichever product frame came next, which put a pink muslin robe beside
 * "Cotton waffle weave". Now every photograph is the product whose own copy
 * names that fabric, and the caption says which. A weave with no Kompanion
 * yet shows its name on an oat panel - never somebody else's cloth.
 *
 * THE CARD IS DRIVEN BY `quickTo`, NOT BY A CSS TRANSITION. A pointer moving
 * quickly down five rows reverses direction mid-flight, and a CSS transition
 * restarts from wherever it had got to - the card lags, then catches up in a
 * rush. `quickTo` retargets a running tween instead, which is the same reason
 * `ActionButton` uses it for its icon well. The card takes no pointer events,
 * so the rows beneath it stay hoverable.
 *
 * ROWS ARE BUTTONS, NOT DIVS. Hover alone would leave this section inert on a
 * phone and unreachable from a keyboard; every row is focusable, and focus
 * moves the card exactly as the pointer does. The round control under the
 * list steps to the next weave, as in the reference.
 *
 * The floating card is hidden below lg, where the rows are too narrow to lay
 * anything over. There, each row with a Kompanion carries its own thumbnail.
 */
export default function FibreList({
  kompanions,
}: {
  kompanions: (FibreKompanion | null)[];
}) {
  const scope = useRef<HTMLElement>(null);
  const moveTo = useRef<((value: number) => void) | null>(null);
  // The resize observer outlives renders, so it reads the live row here.
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const { fibres } = kozyStory;
  const current = kompanions[active] ?? null;

  /** Centres the card on a row, kept inside the list's own height. */
  const place = useCallback((index: number, instant = false) => {
    const root = scope.current;
    const row = root?.querySelectorAll<HTMLElement>("[data-row]")[index];
    const board = root?.querySelector<HTMLElement>("[data-board]");
    const card = root?.querySelector<HTMLElement>("[data-float]");
    if (!row || !board || !card) return;

    const centred = row.offsetTop + row.offsetHeight / 2 - card.offsetHeight / 2;
    const y = gsap.utils.clamp(
      0,
      Math.max(0, board.offsetHeight - card.offsetHeight),
      centred,
    );

    if (instant || !moveTo.current) gsap.set(card, { y });
    else moveTo.current(y);
  }, []);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      const card = root?.querySelector<HTMLElement>("[data-float]");
      const board = root?.querySelector<HTMLElement>("[data-board]");
      if (!card || !board) return;

      const safe = contextSafe!;
      moveTo.current = safe(
        gsap.quickTo(card, "y", { duration: 0.55, ease: "expo.out" }),
      ) as unknown as (value: number) => void;

      // Row heights follow the type size, so the parked position is
      // measured again whenever the list itself resizes.
      const observer = new ResizeObserver(
        safe(() => place(activeRef.current, true)),
      );
      observer.observe(board);
      return () => observer.disconnect();
    },
    { scope },
  );

  const focus = (index: number) => {
    activeRef.current = index;
    setActive(index);
    place(index);
  };

  const next = () => focus((active + 1) % fibres.length);

  return (
    <section
      ref={scope}
      aria-labelledby="fibres"
      className="shell py-14 md:py-20"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow align="left">{kozyStory.fibresEyebrow}</Eyebrow>
          <Headline id="fibres" size="lg" className="mt-3">
            {kozyStory.fibresTitle}
          </Headline>
        </div>
        {/* The hint names the floating card, which exists only at lg - on a
            phone there is no hover and each row carries its own photograph. */}
        <p className="spec-mono max-w-xs md:text-right">
          {fibres.length} {kozyStory.fibresNote}
          <span className="hidden lg:inline"> {kozyStory.fibresHint}</span>
        </p>
      </div>

      <div data-board className="fibre-board">
        <ul className="fibre-rows">
          {fibres.map((fibre, i) => {
            const kompanion = kompanions[i];

            return (
              <li key={fibre.name}>
                <button
                  type="button"
                  data-row
                  aria-pressed={i === active}
                  onMouseEnter={() => focus(i)}
                  onFocus={() => focus(i)}
                  onClick={() => focus(i)}
                  className={`fibre-row${i === active ? " is-active" : ""}`}
                >
                  <span aria-hidden className="fibre-dot" />
                  <span className="fibre-name">{fibre.name}</span>
                  <span className="fibre-note">{fibre.note}</span>
                  <span className="fibre-seen">
                    {kompanion
                      ? `${kozyStory.fibreSeenIn} ${kompanion.title}`
                      : kozyStory.fibreInPalette}
                  </span>
                  <span aria-hidden className="fibre-index">
                    {fibre.index}
                  </span>

                  {/* The narrow layout's photography: no card floats below
                      lg, so the cloth comes to the row. */}
                  {kompanion ? (
                    <span className="fibre-thumb lg:hidden">
                      <Image
                        src={kompanion.image.url}
                        alt=""
                        fill
                        sizes="4rem"
                        className="object-cover"
                      />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div aria-hidden data-float className="fibre-float">
          <div className="fibre-float-photo">
            {fibres.map((fibre, i) => {
              const kompanion = kompanions[i];

              return (
                <div
                  key={fibre.name}
                  className={`fibre-float-shot${i === active ? " is-active" : ""}`}
                >
                  {kompanion ? (
                    <Image
                      src={kompanion.image.url}
                      alt=""
                      fill
                      sizes="22rem"
                      className="object-cover"
                    />
                  ) : (
                    <span className="fibre-float-empty">{fibre.name}</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="fibre-float-caption">
            <span className="fibre-float-kicker">{fibres[active]?.name}</span>
            {current
              ? `${kozyStory.fibreSeenIn} ${current.title}.`
              : `${fibres[active]?.note}.`}
          </p>
        </div>
      </div>

      {/* The line under the list, as in the reference: what the live row is
          shown in - a real link to that Kompanion - and the step onward. */}
      <div className="fibre-foot">
        <p className="body-mono text-pretty" aria-live="polite">
          {current ? (
            <>
              {kozyStory.fibreSeenIn}{" "}
              <Link
                href={`/product/${current.handle}`}
                className="text-ink underline decoration-rule underline-offset-4 transition-colors hover:decoration-ink"
              >
                {current.title}
              </Link>
              .
            </>
          ) : (
            <>
              {fibres[active]?.name}: {kozyStory.fibreInPalette.toLowerCase()}.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={next}
          aria-label={kozyStory.fibreNext}
          className="fibre-next"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}
