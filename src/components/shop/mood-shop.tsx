"use client";

import clsx from "clsx";
import { useLenis } from "lenis/react";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import Plate from "@/components/ui/plate";

/* ---------------------------------------------------------------------------
   The shop-by-mood page's shared client state.

   The URL is still the ONLY shop state: a mood is chosen by navigating to
   `?mood=<handle>`, every control is a real link, and the page works with
   JavaScript off. What lives here is the half-second between a click and the
   server's answer, which the two halves of the page have to agree about:

     the list      opens the clicked row at once, rather than after the round
                   trip, so the choice registers under the finger;
     the results   say "Gathering…" over the old shelf instead of sitting on
                   it as if nothing had happened, then swap.

   `pending` is valid only while the URL still shows the mood it was clicked
   FROM; once the navigation commits the props agree and it drops out on its
   own, with no effect to reset it.

   Clicks stop propagating at React's root. Lenis's `anchors` option listens on
   `window` for same-page `#hash` clicks and starts its own scroll at once,
   which carried the page away from the list before the row had turned. The
   scroll is made here instead, through Lenis, against the section's own
   scroll-margin.
--------------------------------------------------------------------------- */

export type ShopMood = {
  key: string;
  label: string;
  /** Live moods can be chosen; the rest are "coming soon". */
  count: number;
  href: string;
};

type Choose = (
  event: MouseEvent,
  key: string,
  /** `now` from inside the results, `soon` from the list (let the row turn). */
  scroll?: "now" | "soon",
) => void;

type MoodShopValue = {
  moods: ShopMood[];
  /** The mood the URL names. */
  selectedKey: string | null;
  /** The URL's mood, or the one just clicked while it loads. */
  chosenKey: string | null;
  /** A choice is on its way to the server. */
  loading: boolean;
  choose: Choose;
  clear: (event: MouseEvent) => void;
  scrollToResults: () => void;
};

const MoodShopContext = createContext<MoodShopValue | null>(null);

export function useMoodShop() {
  const value = useContext(MoodShopContext);
  if (!value) throw new Error("useMoodShop must be used inside <MoodShop>");
  return value;
}

/** A click the browser should keep: new tab, new window, download. */
const modified = (event: MouseEvent) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey;

/**
 * From the list, the glide waits this long so the chosen row visibly turns
 * indigo first - the confirmation - before the page carries the eye down.
 */
const GLIDE_FROM_LIST_MS = 450;

/** A navigation that never answers must not leave the shelf dimmed for good. */
const PENDING_CEILING_MS = 12000;

export function MoodShop({
  moods,
  selectedKey,
  resultsAnchor,
  children,
}: {
  moods: ShopMood[];
  selectedKey: string | null;
  resultsAnchor: string;
  children: ReactNode;
}) {
  const lenis = useLenis();
  const [pending, setPending] = useState<{
    key: string | null;
    from: string | null;
  } | null>(null);
  const glide = useRef(0);

  const inFlight = Boolean(pending && pending.from === selectedKey);
  const chosenKey = inFlight ? pending!.key : selectedKey;

  useEffect(() => {
    if (!inFlight) return;
    const timer = window.setTimeout(() => setPending(null), PENDING_CEILING_MS);
    return () => window.clearTimeout(timer);
  }, [inFlight]);

  useEffect(
    () => () => window.clearTimeout(glide.current),
    [],
  );

  const scrollToResults = () => {
    const target = document.getElementById(resultsAnchor);
    if (!target) return;
    // Through Lenis when it is running: a native scroll under it is
    // overwritten on its next frame. Both honour the section's scroll-margin,
    // which is what clears the sticky header.
    if (lenis) {
      lenis.scrollTo(target, {
        duration: 1.2,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const choose: Choose = (event, key, scroll = "soon") => {
    if (event.defaultPrevented || modified(event)) return;
    event.stopPropagation();

    window.clearTimeout(glide.current);
    const go = () =>
      scroll === "now"
        ? scrollToResults()
        : (glide.current = window.setTimeout(
            scrollToResults,
            GLIDE_FROM_LIST_MS,
          ));

    if (key === selectedKey) {
      // Already showing - nothing to fetch, only somewhere to go.
      event.preventDefault();
      setPending(null);
      go();
      return;
    }

    setPending({ key, from: selectedKey });
    go();
  };

  const clear = (event: MouseEvent) => {
    if (event.defaultPrevented || modified(event)) return;
    window.clearTimeout(glide.current);
    setPending({ key: null, from: selectedKey });
  };

  return (
    <MoodShopContext.Provider
      value={{
        moods,
        selectedKey,
        chosenKey,
        loading: inFlight,
        choose,
        clear,
        scrollToResults,
      }}
    >
      {children}
    </MoodShopContext.Provider>
  );
}

/* ----------------------------------------------------------------- results */

/**
 * Wraps step two. While a choice is in flight the shelf beneath dims and a
 * "Gathering…" chip says what is coming, so the pause reads as work rather
 * than as a click that did nothing.
 */
export function MoodResults({
  gathering,
  children,
}: {
  /** "Gathering" - the mood's name follows it. */
  gathering: string;
  children: ReactNode;
}) {
  const { loading, chosenKey, moods } = useMoodShop();
  const coming = moods.find((mood) => mood.key === chosenKey) ?? null;

  return (
    <div className="mood-results" data-loading={loading ? "" : undefined}>
      {/* Zero-height and sticky: the chip floats over the dimmed shelf in
          view, without pushing the shelf down by its own height. */}
      {loading ? (
        <div className="mood-gathering" role="status">
          <span className="mood-gathering-pill">
            <span className="mood-gathering-spin" aria-hidden />
            {coming ? `${gathering} ${coming.label}…` : `${gathering}…`}
          </span>
        </div>
      ) : null}
      <div className="mood-results-body" aria-busy={loading || undefined}>
        {children}
      </div>
    </div>
  );
}

/**
 * The switcher: every mood as a chip, stuck under the header for as long as
 * the shelf is on screen, so a shopper deep in the cards can change moods
 * without scrolling back to the list. The chosen chip is centred in the rail
 * whenever the choice changes, so on a phone it is never off the edge.
 */
export function MoodSwitcher({
  label,
  back,
}: {
  /** Names the rail for assistive tech. */
  label: string;
  /** The chip back up to the list. */
  back: string;
}) {
  const { moods, chosenKey, choose } = useMoodShop();
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rail.current;
    const chip = el?.querySelector<HTMLElement>("[aria-current]");
    if (!el || !chip) return;
    el.scrollTo({
      left: chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [chosenKey]);

  return (
    <nav aria-label={label} className="mood-switcher">
      <div ref={rail} className="mood-switcher-rail" data-lenis-prevent-horizontal="">
        <a href="#moods" className="mood-chip mood-chip-back">
          <ArrowUpRight className="h-3.5 w-3.5 -rotate-45" />
          {back}
        </a>
        {moods
          .filter((mood) => mood.count > 0)
          .map((mood) => {
            const on = mood.key === chosenKey;
            return (
              <Link
                key={mood.key}
                href={mood.href}
                scroll={false}
                prefetch={false}
                aria-current={on ? "true" : undefined}
                className={clsx("mood-chip", on && "is-on")}
                onClick={(event) => choose(event, mood.key, "now")}
              >
                {on ? (
                  <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                ) : null}
                {mood.label}
                <span className="mood-chip-count tabular-nums">{mood.count}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}

/** The clear control in the results masthead. */
export function MoodClear({ href, label }: { href: string; label: string }) {
  const { clear } = useMoodShop();

  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      className="mood-clear"
      onClick={clear}
    >
      <XMarkIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {label}
    </Link>
  );
}

/**
 * The end of the shelf: the next live mood as a wide photographic card, so a
 * shopper who has seen everything here is handed straight on rather than
 * left at a dead end.
 */
export function MoodNext({
  mood,
  eyebrow,
}: {
  mood: {
    key: string;
    label: string;
    description: string;
    count: number;
    href: string;
    image: { url: string; altText?: string } | null;
  };
  /** "Next mood". */
  eyebrow: string;
}) {
  const { choose } = useMoodShop();

  return (
    <Link
      href={mood.href}
      scroll={false}
      prefetch={false}
      className="mood-next group"
      onClick={(event) => choose(event, mood.key, "now")}
    >
      <Plate
        src={mood.image?.url}
        alt={mood.image?.altText ?? ""}
        placeholderText={mood.label}
        aspect={null}
        className="h-full"
        sizes="(min-width: 1024px) 90vw, 100vw"
      />
      <span aria-hidden className="mood-next-scrim" />
      <span className="mood-next-copy">
        <span className="mood-next-eyebrow">{eyebrow}</span>
        <span className="mood-next-title display-face">{mood.label}</span>
        {mood.description ? (
          <span className="mood-next-desc">{mood.description}</span>
        ) : null}
      </span>
      <span className="mood-next-arrow" aria-hidden>
        <ArrowUpRight className="h-5 w-5 rotate-45" />
      </span>
    </Link>
  );
}
