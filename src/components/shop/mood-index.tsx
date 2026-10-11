"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { splitText } from "@/components/motion/split-text";
import ActionButton from "@/components/ui/action-button";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import Plate from "@/components/ui/plate";
import Image from "@/components/ui/shop-image";
import MoodRail from "./mood-rail";
import { useMoodShop } from "./mood-shop";

/**
 * Step one of /shop-by-mood: the moods as a list beside one large photograph.
 *
 *   intro  | list        the intro (badge, headline, lede) is the server's,
 *   stage  | list        passed in whole; this file owns the stage and list
 *
 * BUILT TO BE READ AT A GLANCE. Every row shows everything a shopper needs to
 * choose - number, name, the merchant's one line, how many Kompanions - with
 * nothing folded away, and nothing is open until something is chosen. The
 * list is headed "1  Pick a mood" and the shelf below "2", so the page states
 * its own two steps.
 *
 * THE CHOSEN ROW is unmistakable: it floods indigo, carries a "Selected"
 * check and unfolds a strip of the mood's photographs with the way down to
 * its Kompanions and the way to clear it. Choosing is still a navigation -
 * every row is a plain link to `?mood=<handle>#kompanions` - and the state
 * between the click and the server's answer is in `mood-shop.tsx`.
 *
 * THE STAGE is labelled for what it is: "Preview" while it shows a mood the
 * pointer rests on, "Selected" once it shows the chosen one. With nothing
 * chosen and no pointer on the list it walks through the moods by itself
 * (desktop only, never under reduced motion, only while on screen), and the
 * row it is showing draws a progress line - so the photograph and the row it
 * belongs to are visibly one thing.
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
  step: string;
  hintRail: string;
  hintPointer: string;
  hintTouch: string;
  shop: string;
  goTo: string;
  comingSoon: string;
  selected: string;
  preview: string;
  moodWord: string;
  showing: string;
  clear: string;
  unsure: string;
  browseAll: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const kompanions = (count: number) =>
  count === 1 ? "1 Kompanion" : `${count} Kompanions`;

/** How long the pointer rests on a row before the stage turns to it. */
const HOVER_INTENT_MS = 90;

/**
 * One mood's turn on the stage while it walks through them unattended.
 * `.mood-row-progress` in globals.css draws over the same span - move both.
 */
const CYCLE_MS = 4200;

function useMedia(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export default function MoodIndex({
  moods,
  clearHref,
  intro,
  copy,
}: {
  moods: IndexMood[];
  /** The address with nothing chosen. */
  clearHref: string;
  /** Badge, headline and lede - server-rendered, set in the grid's corner. */
  intro: ReactNode;
  copy: Copy;
}) {
  const { chosenKey, choose, clear, scrollToResults } = useMoodShop();

  const [hovered, setHovered] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [stageOnScreen, setStageOnScreen] = useState(false);
  const intent = useRef(0);
  const stage = useRef<HTMLDivElement>(null);

  const finePointer = useMedia("(hover: hover) and (pointer: fine)");
  const stillPlease = useMedia("(prefers-reduced-motion: reduce)");
  const wide = useMedia("(min-width: 1024px)");

  const live = useMemo(() => moods.filter((mood) => mood.count > 0), [moods]);

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

  // The unattended walk. Only where there is a stage to watch and a pointer
  // that could take over from it, and only while it is on screen.
  const cycling =
    !chosenKey &&
    !hovered &&
    wide &&
    finePointer &&
    !stillPlease &&
    stageOnScreen &&
    live.length > 1;

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const watch = new IntersectionObserver(
      ([entry]) => setStageOnScreen(Boolean(entry?.isIntersecting)),
      { threshold: 0.35 },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    if (!cycling) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setTick((value) => value + 1);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [cycling]);

  useEffect(() => () => window.clearTimeout(intent.current), []);

  const walked = live.length ? live[tick % live.length]!.key : null;

  const staged =
    moods.find((mood) => mood.key === hovered && frameOf.has(mood.key)) ??
    moods.find((mood) => mood.key === chosenKey) ??
    moods.find((mood) => mood.key === walked) ??
    moods[0] ??
    null;
  const stagedIndex = staged ? moods.indexOf(staged) : 0;
  const frame = frameOf.get(staged?.key ?? "") ?? 0;
  const stagedIsChosen = Boolean(staged && staged.key === chosenKey);

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
    // two rows does not flick the stage away and back.
    intent.current = window.setTimeout(() => setHovered(null), 160);
  };

  if (!moods.length) return null;

  return (
    <div className="mood-sched">
      <div className="mood-sched-intro">{intro}</div>

      {/* The stage. `aria-hidden` and out of the tab order: every mood it can
          show is already a link in the list, and a second stop for the same
          destination is noise to a keyboard or a screen reader. */}
      <div ref={stage} className="mood-sched-stage">
        <Link
          href={staged?.count ? staged.href : clearHref}
          tabIndex={-1}
          aria-hidden
          prefetch={false}
          scroll={false}
          onClick={(event) => {
            if (staged?.count) choose(event, staged.key, "soon");
            else event.preventDefault();
          }}
          className={clsx(
            "group block h-full",
            !staged?.count && "pointer-events-none",
          )}
        >
          <Plate
            gallery={gallery.length ? gallery : null}
            galleryIndex={frame}
            galleryTransition="wipe"
            placeholderText="mood"
            aspect={null}
            arrow
            className="h-full min-h-[18rem]"
            sizes="(min-width: 1536px) 40rem, (min-width: 1024px) 42vw, 1px"
          >
            {/* `notch-tr`, the same cut as the photograph's: Plate masks its
                own media, not its children, and this scrim spans the whole
                frame - unmasked, it laid a grey film over the cream the
                notch exists to show, behind the corner arrow. */}
            <div className="notch-tr pointer-events-none absolute inset-0 overflow-hidden rounded-plate">
              <div className="mood-stage-scrim" />

              {staged ? (
                <>
                  <span
                    key={`t-${staged.key}-${stagedIsChosen}`}
                    className="mood-stage-tag"
                    data-tone={stagedIsChosen ? "selected" : "preview"}
                  >
                    {stagedIsChosen ? (
                      <CheckIcon className="h-3 w-3" strokeWidth={3} />
                    ) : (
                      <span className="mood-stage-tag-dot" />
                    )}
                    {stagedIsChosen ? copy.selected : copy.preview}
                  </span>

                  <div key={`c-${staged.key}`} className="mood-stage-caption">
                    <p className="mood-stage-meta tabular-nums">
                      {copy.moodWord} {pad(stagedIndex + 1)}
                      <span aria-hidden> · </span>
                      {staged.count ? kompanions(staged.count) : copy.comingSoon}
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
        <div className="mood-list-head">
          <p className="mood-steplabel">
            <span className="mood-step-num" aria-hidden>
              1
            </span>
            {copy.step}
          </p>
          <p className="mood-list-hint">
            <span className="mood-hint-rail">{copy.hintRail}</span>
            <span className="mood-hint-pointer">{copy.hintPointer}</span>
            <span className="mood-hint-touch">{copy.hintTouch}</span>
          </p>
        </div>

        {/* Below `lg` the list below is hidden and this rail picks instead -
            see `mood-rail.tsx` for why a phone gets photographs. */}
        <MoodRail
          moods={moods}
          clearHref={clearHref}
          label={copy.label}
          copy={{
            comingSoon: copy.comingSoon,
            selected: copy.selected,
            moodWord: copy.moodWord,
            shop: copy.shop,
            showing: copy.showing,
            clear: copy.clear,
            goTo: copy.goTo,
          }}
        />

        <ol
          aria-label={copy.label}
          data-reveal-group=""
          className="mood-rows"
          onPointerLeave={release}
          onBlur={(event) => {
            // Focus leaving the whole list, not moving between its rows.
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              release();
            }
          }}
        >
          {moods.map((mood, index) => {
            const isChosen = mood.key === chosenKey;
            const isWalked = cycling && mood.key === walked;
            const isLive = mood.count > 0;

            const body = (
              <>
                <span className="mood-row-num tabular-nums">{pad(index + 1)}</span>
                <span className="mood-row-text">
                  <span className="mood-row-name">
                    {mood.label}
                    {isChosen ? (
                      <span className="mood-row-flag">
                        <CheckIcon className="h-3 w-3" strokeWidth={3} aria-hidden />
                        {copy.selected}
                      </span>
                    ) : null}
                  </span>
                  {mood.description ? (
                    <span className="mood-row-desc">{mood.description}</span>
                  ) : null}
                </span>
                {isLive ? (
                  <>
                    <span className="mood-row-count tabular-nums">
                      {kompanions(mood.count)}
                    </span>
                    <span className="mood-row-go" aria-hidden>
                      {isChosen ? (
                        <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 rotate-45" />
                      )}
                    </span>
                  </>
                ) : (
                  <span className="mood-row-soon">{copy.comingSoon}</span>
                )}
              </>
            );

            return (
              <li
                key={mood.key}
                className="mood-row"
                data-chosen={isChosen ? "" : undefined}
                data-dead={isLive ? undefined : ""}
              >
                {/* In the set but not yet in the catalogue: shown, because a
                    mood is part of how the brand describes itself whether or
                    not stock has reached it; not a link, because it leads
                    nowhere. */}
                {isLive ? (
                  <Link
                    href={mood.href}
                    scroll={false}
                    prefetch={false}
                    aria-current={isChosen ? "true" : undefined}
                    className="mood-row-head"
                    onClick={(event) => choose(event, mood.key, "soon")}
                    onPointerEnter={(event) => point(event, mood.key)}
                    onFocus={() => setHovered(mood.key)}
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    className="mood-row-head"
                    onPointerEnter={(event) => point(event, mood.key)}
                  >
                    {body}
                  </div>
                )}

                {isLive ? (
                  <div className="mood-row-panel" inert={!isChosen}>
                    <div className="mood-row-clip">
                      <div className="mood-row-more">
                        {mood.images.length ? (
                          <span className="mood-row-thumbs" aria-hidden>
                            {mood.images.slice(0, 3).map((image) => (
                              <span key={image.url} className="mood-row-thumb">
                                <Image
                                  src={image.url}
                                  alt=""
                                  fill
                                  sizes="5rem"
                                  className="object-cover"
                                />
                              </span>
                            ))}
                          </span>
                        ) : null}

                        <span className="mood-row-actions">
                          {/* A button, not a link to the same address: the
                              Kompanions are already on the page, and
                              re-navigating would refetch it. */}
                          <ActionButton
                            label={copy.showing}
                            icon="down"
                            variant="outline"
                            onClick={scrollToResults}
                          />
                          <Link
                            href={clearHref}
                            scroll={false}
                            prefetch={false}
                            className="mood-row-clear"
                            onClick={clear}
                          >
                            {copy.clear}
                          </Link>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {isWalked ? (
                  <span key={tick} aria-hidden className="mood-row-progress" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <p className="mood-sched-foot">
          {copy.unsure}{" "}
          <Link href="/search" className="mood-sched-foot-link">
            {copy.browseAll}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </div>
  );
}
