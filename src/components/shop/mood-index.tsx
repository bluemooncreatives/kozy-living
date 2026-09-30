"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import Plate from "@/components/ui/plate";
import Image from "@/components/ui/shop-image";

/**
 * The ritual index: the moods as a numbered typographic list, with one large
 * photograph beside it that turns to whichever mood the pointer or focus is on.
 *
 * Every row is a plain link, exactly like the colour coils. Choosing a mood is
 * a navigation, so the list works with JavaScript off and the back button is
 * correct. The only client state is WHICH PHOTOGRAPH the preview shows - a
 * hover affordance, never shop state - and without JS it simply rests on the
 * chosen mood, or the first.
 *
 * The preview is desktop-only. Hover does not exist on a phone, and a sticky
 * column needs a second column to stick beside; below `lg` each row carries
 * its own thumbnail instead, so the photograph is never lost, only moved.
 */

export type IndexMood = {
  key: string;
  label: string;
  description: string;
  /** Kompanions in this mood. Zero renders as a shown-but-dead row. */
  count: number;
  /** Where this row goes. For the current mood, the URL that clears it. */
  href: string;
  active?: boolean;
  image?: { url: string; altText?: string } | null;
};

const pad = (value: number) => String(value).padStart(2, "0");

const kompanions = (count: number) =>
  count === 1 ? "1 Kompanion" : `${count} Kompanions`;

export default function MoodIndex({
  moods,
  label,
  comingSoon,
}: {
  moods: IndexMood[];
  /** The small caps title over the list. */
  label: string;
  comingSoon: string;
}) {
  // Two pieces of state, not one: the CAPTION follows the pointer onto any
  // row, but the PHOTOGRAPH only moves to a mood that has one. Hovering a
  // "coming soon" mood keeps the last picture rather than flashing a blank
  // placeholder between two real ones.
  const [captionKey, setCaptionKey] = useState<string | null>(null);
  const [photoKey, setPhotoKey] = useState<string | null>(null);

  const active = moods.find((mood) => mood.active) ?? null;
  const resting =
    active ?? moods.find((mood) => mood.count > 0) ?? moods[0] ?? null;

  // One frame per distinct photograph. Two moods CAN share a lead shot - the
  // server only avoids it where a mood has an alternative - and Plate keys its
  // layers by URL, so the stack is deduped and each mood points at its frame.
  const { gallery, frameOf } = useMemo(() => {
    const frames: { url: string; altText?: string }[] = [];
    const at = new Map<string, number>();
    const frameOf = new Map<string, number>();

    for (const mood of moods) {
      if (!mood.image?.url) continue;
      if (!at.has(mood.image.url)) {
        at.set(mood.image.url, frames.length);
        frames.push({ url: mood.image.url, altText: mood.image.altText });
      }
      frameOf.set(mood.key, at.get(mood.image.url)!);
    }

    return { gallery: frames, frameOf };
  }, [moods]);

  const shown =
    moods.find((mood) => mood.key === captionKey) ?? resting;
  const framed =
    frameOf.get(photoKey ?? "") ??
    frameOf.get(resting?.key ?? "") ??
    0;

  const point = (mood: IndexMood) => {
    setCaptionKey(mood.key);
    if (frameOf.has(mood.key)) setPhotoKey(mood.key);
  };

  const release = () => {
    setCaptionKey(null);
    setPhotoKey(null);
  };

  if (!moods.length) return null;

  const shownIndex = shown ? moods.indexOf(shown) : 0;

  return (
    <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-10 xl:gap-x-16">
      <div className="lg:col-span-7">
        <div className="micro-mono flex items-baseline justify-between border-b border-rule pb-3 text-muted">
          <span>{label}</span>
          <span className="tabular-nums">{pad(moods.length)}</span>
        </div>

        <ol
          data-reveal-group=""
          className="mood-index"
          onMouseLeave={release}
          onBlur={(event) => {
            // Focus leaving the whole list, not moving between its rows.
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              release();
            }
          }}
        >
          {moods.map((mood, index) => {
            const body = (
              <>
                <span className="mood-row-thumb" aria-hidden>
                  {mood.image?.url ? (
                    <Image
                      src={mood.image.url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span className="mood-row-num display-face tabular-nums">
                  {pad(index + 1)}
                </span>
                <span className="mood-row-name display-face">{mood.label}</span>
                {mood.description ? (
                  <span className="mood-row-desc">{mood.description}</span>
                ) : null}
                <span className="mood-row-count tabular-nums">
                  {mood.count ? kompanions(mood.count) : comingSoon}
                </span>
              </>
            );

            // In the set but not yet in the catalogue. Shown, because a mood
            // is part of how the brand describes itself whether or not stock
            // has reached it; not a link, because it leads nowhere.
            if (!mood.count) {
              return (
                <li key={mood.key}>
                  <div
                    className="mood-row is-dead"
                    onMouseEnter={() => point(mood)}
                  >
                    {body}
                  </div>
                </li>
              );
            }

            return (
              <li key={mood.key}>
                <Link
                  href={mood.href}
                  scroll={!mood.active}
                  prefetch={false}
                  aria-current={mood.active ? "true" : undefined}
                  className={clsx("mood-row", mood.active && "is-active")}
                  onMouseEnter={() => point(mood)}
                  onFocus={() => point(mood)}
                >
                  {body}
                  {/* Choosing the mood already showing clears it - the only
                      way back to the empty state short of the back button -
                      so the showing row says so with a cross, not an arrow. */}
                  <span className="mood-row-arrow" aria-hidden>
                    {mood.active ? (
                      <XMarkIcon className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <ArrowUpRight />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {/* The preview. `aria-hidden` and out of the tab order: every mood it can
          show is already a link in the list, and a second stop for the same
          destination is noise to a keyboard or a screen reader. */}
      <div className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-[calc(var(--header-h)+1.5rem)]">
          <Link
            href={shown?.count ? shown.href : "#"}
            tabIndex={-1}
            aria-hidden
            prefetch={false}
            scroll={!shown?.active}
            className={clsx(
              "group block",
              !shown?.count && "pointer-events-none"
            )}
          >
            <Plate
              gallery={gallery.length ? gallery : null}
              galleryIndex={framed}
              placeholderText="mood"
              aspect="4/5"
              arrow
              // 4:5 at 38vw is taller than the space under the header on a
              // laptop screen, which pushed the caption - the one part that
              // says what you are looking at - below the fold. The width
              // stays pinned and the photograph crops instead.
              className="max-h-[calc(100svh-var(--header-h)-3rem)]"
              sizes="(min-width: 1536px) 36rem, (min-width: 1024px) 38vw, 1px"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-plate">
                <div className="mood-preview-scrim" />
                {shown ? (
                  <>
                    <span
                      key={`n-${shown.key}`}
                      className="mood-preview-num display-face tabular-nums"
                    >
                      {pad(shownIndex + 1)}
                    </span>
                    <div
                      key={`c-${shown.key}`}
                      className="mood-preview-caption"
                    >
                      <p className="display-face text-display-lg text-paper">
                        {shown.label}
                      </p>
                      <p className="spec-mono mt-2 text-paper/80">
                        {shown.count ? kompanions(shown.count) : comingSoon}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </Plate>
          </Link>
        </div>
      </div>
    </div>
  );
}
