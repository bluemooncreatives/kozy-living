"use client";

import clsx from "clsx";
import { useLenis } from "lenis/react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { splitText } from "@/components/motion/split-text";
import ActionButton from "@/components/ui/action-button";
import Plate from "@/components/ui/plate";
import Image from "@/components/ui/shop-image";

/**
 * The ritual schedule: the moods as an accordion beside one large photograph.
 *
 *   intro  | list        the intro (badge, headline, lede) is the server's,
 *   stage  | list        passed in whole; this file owns the stage and list
 *
 * THE OPEN ROW IS THE CHOSEN MOOD. Choosing is still a navigation - every
 * row is a plain link to `?mood=<handle>#kompanions`, so the list works with
 * JavaScript off, the back button is right and the address is the state.
 * Until something is chosen, the first live mood stands open as an
 * invitation, the way the reference opens on its first fixture; its button
 * chooses it. Nothing below the list renders until a mood is chosen.
 *
 * Three pieces of client state, none of them shop state:
 *
 *   pending   the row clicked, opened at once rather than after the server
 *             answers, so the accordion turns under the finger. Valid only
 *             while the URL still shows the mood it was clicked FROM: once
 *             the navigation commits, the props agree and it drops out.
 *   hovered   which mood the stage previews. Fine pointers and focus only.
 *   scroll    the glide down to the Kompanions, held until the accordion
 *             has turned. Lenis's own anchor handling would start it on the
 *             click and carry the page away before the row had opened.
 *
 * The stage is desktop-only, as the preview always was: hover does not exist
 * on a phone, and the open row carries its own photograph instead.
 */

export type IndexMood = {
  key: string;
  label: string;
  description: string;
  /** Kompanions in this mood. Zero renders as a shown-but-dead row. */
  count: number;
  /** This mood's own address - `?mood=<key>#kompanions`. */
  href: string;
  /** Borrowed photography, lead shot first and unique across the index. */
  images: { url: string; altText?: string }[];
};

type Copy = {
  label: string;
  comingSoon: string;
  view: string;
  showing: string;
  clear: string;
  preview: string;
  browseAll: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const kompanions = (count: number) =>
  count === 1 ? "1 Kompanion" : `${count} Kompanions`;

/** How long the pointer rests on a row before the stage turns to it. */
const HOVER_INTENT_MS = 90;

/**
 * Click to glide: long enough for the row to open and the stage to wipe -
 * the accordion's own transition is 750ms, and most of its travel is in the
 * first half - but short enough to read as the click's answer.
 */
const GLIDE_AFTER_MS = 620;

/** A click the browser should keep: new tab, new window, download. */
const modified = (event: MouseEvent) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey;

export default function MoodIndex({
  moods,
  selectedKey,
  clearHref,
  resultsAnchor,
  intro,
  copy,
}: {
  moods: IndexMood[];
  /** The mood the URL names, or null for the resting page. */
  selectedKey: string | null;
  /** The address with nothing chosen. */
  clearHref: string;
  /** The id of the section the Kompanions gather in. */
  resultsAnchor: string;
  /** Badge, headline and lede - server-rendered, set in the grid's corner. */
  intro: ReactNode;
  copy: Copy;
}) {
  const lenis = useLenis();

  const [pending, setPending] = useState<{
    key: string | null;
    from: string | null;
  } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const intent = useRef(0);
  const glide = useRef<number | null>(null);

  const chosen =
    pending && pending.from === selectedKey ? pending.key : selectedKey;
  const teaser = moods.find((mood) => mood.count > 0)?.key ?? null;
  const openKey = chosen ?? teaser;

  // One frame per distinct photograph. Two moods CAN share a lead shot - the
  // server only avoids it where a mood has an alternative - and Plate keys
  // its layers by URL, so the stack is deduped and each mood points at its
  // frame. A mood with no photograph has no frame, and the stage stays on
  // whatever it last showed rather than wiping to a blank placeholder.
  const { gallery, frameOf } = useMemo(() => {
    const frames: { url: string; altText?: string }[] = [];
    const at = new Map<string, number>();
    const frameOf = new Map<string, number>();

    for (const mood of moods) {
      const lead = mood.images[0];
      if (!lead?.url) continue;
      if (!at.has(lead.url)) {
        at.set(lead.url, frames.length);
        frames.push(lead);
      }
      frameOf.set(mood.key, at.get(lead.url)!);
    }

    return { gallery: frames, frameOf };
  }, [moods]);

  const staged =
    moods.find((mood) => mood.key === hovered && frameOf.has(mood.key)) ??
    moods.find((mood) => mood.key === openKey) ??
    moods[0] ??
    null;
  const stagedIndex = staged ? moods.indexOf(staged) : 0;
  const frame = frameOf.get(staged?.key ?? "") ?? 0;

  const scrollToResults = () => {
    const target = document.getElementById(resultsAnchor);
    if (!target) return;
    // Through Lenis when it is running: a native scroll under it is
    // overwritten on its next frame. Both honour the section's scroll-margin,
    // which is what clears the sticky header.
    if (lenis) {
      lenis.scrollTo(target, {
        duration: 1.3,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // The glide, once the chosen mood has committed. Measured from the click,
  // so a slow server is not then made to wait a second time.
  useEffect(() => {
    const clickedAt = glide.current;
    if (clickedAt === null || !selectedKey) return;

    const wait = Math.max(
      120,
      GLIDE_AFTER_MS - (performance.now() - clickedAt),
    );
    const timer = window.setTimeout(() => {
      glide.current = null;
      scrollToResults();
    }, wait);

    return () => window.clearTimeout(timer);
    // `scrollToResults` is rebuilt every render; the commit is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  useEffect(() => () => window.clearTimeout(intent.current), []);

  /** Choosing a mood: from a row's head, its button, or the stage. */
  const choose = (event: MouseEvent, key: string) => {
    if (event.defaultPrevented || modified(event)) return;

    // Lenis listens for same-page anchor clicks on `window` and would begin
    // the scroll right now. Stopping the event at React's root keeps it from
    // ever arriving; the route-progress hairline listens in the capture
    // phase and still hears it.
    event.stopPropagation();

    if (key === selectedKey) {
      // Already showing - nothing to fetch, only somewhere to go.
      event.preventDefault();
      setPending(null);
      scrollToResults();
      return;
    }

    setPending({ key, from: selectedKey });
    // The stage follows the open row from here; a preview left over from
    // the pointer or the focus would otherwise outlive the choice.
    setHovered(null);
    glide.current = performance.now();
  };

  const clear = (event: MouseEvent) => {
    if (event.defaultPrevented || modified(event)) return;
    setPending({ key: null, from: selectedKey });
    setHovered(null);
    glide.current = null;
  };

  const preview = (key: string) => {
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(() => setHovered(key), HOVER_INTENT_MS);
  };

  const point = (event: PointerEvent, key: string) => {
    // A tap fires pointerenter too. On a touch screen it would park the
    // stage on whatever was last tapped, with no leave to bring it back.
    if (event.pointerType === "mouse") preview(key);
  };

  const release = () => {
    window.clearTimeout(intent.current);
    // A beat before letting go, so the pointer crossing the rule between
    // two rows does not flick the stage back to the open mood and out again.
    intent.current = window.setTimeout(() => setHovered(null), 160);
  };

  if (!moods.length) return null;

  const stageLive = Boolean(staged?.count);
  const previewing = Boolean(hovered && staged && staged.key !== openKey);

  return (
    <div className="mood-sched">
      <div className="mood-sched-intro">{intro}</div>

      {/* The stage. `aria-hidden` and out of the tab order: every mood it can
          show is already a link in the list, and a second stop for the same
          destination is noise to a keyboard or a screen reader. */}
      <div className="mood-sched-stage">
        <Link
          href={stageLive && staged ? staged.href : clearHref}
          tabIndex={-1}
          aria-hidden
          prefetch={false}
          scroll={false}
          onClick={(event) => {
            if (stageLive && staged) choose(event, staged.key);
            else event.preventDefault();
          }}
          className={clsx(
            "group block h-full",
            !stageLive && "pointer-events-none",
          )}
        >
          <Plate
            gallery={gallery.length ? gallery : null}
            galleryIndex={frame}
            galleryTransition="wipe"
            placeholderText="mood"
            aspect={null}
            arrow
            className="h-full min-h-[22rem]"
            sizes="(min-width: 1536px) 40rem, (min-width: 1024px) 42vw, 1px"
          >
            {/* `notch-tr` again: Plate's children sit outside its masked
                layer, so without it the top scrim washes across the cut and
                greys the cream halo round the corner arrow. */}
            <div className="notch-tr pointer-events-none absolute inset-0 overflow-hidden rounded-plate">
              <div className="mood-stage-scrim" />

              {staged ? (
                <>
                  <p className="mood-stage-num display-face">
                    <span className="mood-stage-num-slot">
                      <span
                        key={`n-${staged.key}`}
                        className="mood-stage-num-roll tabular-nums"
                      >
                        {pad(stagedIndex + 1)}
                      </span>
                    </span>
                    <span className="mood-stage-total tabular-nums">
                      / {pad(moods.length)}
                    </span>
                  </p>

                  <div key={`c-${staged.key}`} className="mood-stage-caption">
                    <p className="mood-stage-meta">
                      {previewing ? (
                        <span className="mood-stage-tag">{copy.preview}</span>
                      ) : null}
                      <span>
                        {staged.count
                          ? kompanions(staged.count)
                          : copy.comingSoon}
                      </span>
                    </p>
                    <p className="mood-stage-title display-face">
                      {splitText(staged.label)}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </Plate>
        </Link>
      </div>

      <div className="mood-sched-list">
        <ol
          aria-label={copy.label}
          data-reveal-group=""
          className="mood-acc"
          onPointerLeave={release}
          onBlur={(event) => {
            // Focus leaving the whole list, not moving between its rows.
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              release();
            }
          }}
        >
          {moods.map((mood, index) => {
            const open = mood.key === openKey;
            const isChosen = mood.key === chosen;
            const live = mood.count > 0;
            // The second photograph where there is one: the stage beside the
            // list is already showing the first.
            const thumb = mood.images[1] ?? mood.images[0] ?? null;

            const head = (
              <>
                <span className="mood-acc-num tabular-nums">
                  {pad(index + 1)}.
                </span>
                <span className="mood-acc-name">{mood.label}</span>
                {live ? (
                  <span className="mood-acc-chev" aria-hidden>
                    <ChevronRightIcon className="h-4 w-4" strokeWidth={2} />
                  </span>
                ) : (
                  <span className="mood-acc-soon">{copy.comingSoon}</span>
                )}
              </>
            );

            return (
              <li
                key={mood.key}
                className="mood-acc-item"
                data-open={open ? "" : undefined}
                data-dead={live ? undefined : ""}
              >
                {/* In the set but not yet in the catalogue: shown, because a
                    mood is part of how the brand describes itself whether or
                    not stock has reached it; not a link, because it leads
                    nowhere. */}
                {live ? (
                  <Link
                    href={mood.href}
                    scroll={false}
                    prefetch={false}
                    aria-current={isChosen ? "true" : undefined}
                    className="mood-acc-head"
                    onClick={(event) => choose(event, mood.key)}
                    onPointerEnter={(event) => point(event, mood.key)}
                    onFocus={() => setHovered(mood.key)}
                  >
                    {head}
                  </Link>
                ) : (
                  <div
                    className="mood-acc-head"
                    onPointerEnter={(event) => point(event, mood.key)}
                  >
                    {head}
                  </div>
                )}

                {live ? (
                  <div className="mood-acc-panel" inert={!open}>
                    <div className="mood-acc-clip">
                      <div className="mood-acc-body">
                        {mood.description ? (
                          <p className="mood-acc-desc">{mood.description}</p>
                        ) : null}
                        <p className="mood-acc-meta tabular-nums">
                          {kompanions(mood.count)}
                        </p>

                        <div className="mood-acc-actions">
                          {isChosen ? (
                            <>
                              {/* A button, not a link to the same address:
                                  the Kompanions are already on the page, and
                                  re-navigating would refetch it. */}
                              <ActionButton
                                label={copy.showing}
                                icon="down"
                                variant="solid"
                                onClick={scrollToResults}
                              />
                              <Link
                                href={clearHref}
                                scroll={false}
                                prefetch={false}
                                className="mood-acc-clear"
                                onClick={clear}
                              >
                                <XMarkIcon
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.25}
                                />
                                {copy.clear}
                              </Link>
                            </>
                          ) : (
                            // ActionButton keeps its own onClick for buttons,
                            // so the choice is heard here as the click
                            // bubbles out of its link.
                            <span
                              className="contents"
                              onClick={(event) => choose(event, mood.key)}
                            >
                              <ActionButton
                                label={copy.view}
                                href={mood.href}
                                icon="arrow"
                                variant="solid"
                                scroll={false}
                                prefetch={false}
                              />
                            </span>
                          )}
                        </div>

                        {thumb ? (
                          <span className="mood-acc-thumb" aria-hidden>
                            <Image
                              src={thumb.url}
                              alt=""
                              fill
                              sizes="(min-width: 1024px) 9rem, 6rem"
                              className="object-cover"
                            />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        {/* No `data-reveal`: on a laptop this sits on the fold's bottom edge,
            below the reveal line, and stood missing until the first scroll. */}
        <div className="mood-sched-foot">
          <ActionButton
            label={copy.browseAll}
            href="/search"
            icon="arrow"
            variant="solid"
          />
        </div>
      </div>
    </div>
  );
}
