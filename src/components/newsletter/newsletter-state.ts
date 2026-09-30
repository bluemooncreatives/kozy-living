"use client";

import { useSyncExternalStore } from "react";

/**
 * One source of truth for "has this visitor been asked, and what did they say".
 *
 * Three surfaces read it - the arrival popup, the corner teaser it collapses
 * into, and the footer form - and they have to agree. They used not to: the
 * footer stored a subscribed customer in Shopify without ever touching this
 * record, so someone who signed up in the footer still got the card fifteen
 * seconds later asking for the address they had just given.
 *
 * Two stores, because the two answers do not have the same shelf life:
 *
 *   localStorage    the answer to the offer. `subscribed` is terminal;
 *                   `dismissed` snoozes the card for a month.
 *   sessionStorage  closing the corner teaser. "Not while I am reading this"
 *                   is a smaller statement than "not this month", so it lapses
 *                   when the tab does and the tab is back on the next visit.
 *
 * Every accessor is wrapped: private browsing, blocked site data and a full
 * quota all *throw* on access rather than returning empty, and a newsletter
 * must never be the thing that takes the page down.
 */

/** Kept at the old key so a visitor who already dismissed stays dismissed. */
const STORAGE_KEY = "kozy:newsletter";
const TEASER_KEY = "kozy:newsletter-teaser";

/**
 * Same-tab fan-out. `storage` only fires in the *other* tabs, so a footer
 * signup would not silence the popup mounted beside it without this.
 */
const CHANGE_EVENT = "kozy:newsletter-change";

/** How long a dismissal holds before the card may ask again. */
export const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

export type NewsletterAnswer = "subscribed" | "dismissed";

export type NewsletterRecord = { state: NewsletterAnswer; at: number };

export function readRecord(): NewsletterRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NewsletterRecord>;
    // Hand-edited or half-written values are treated as "never asked" rather
    // than trusted - a bad `at` here would snooze the card until 1970.
    if (parsed?.state !== "subscribed" && parsed?.state !== "dismissed") {
      return null;
    }
    return { state: parsed.state, at: Number(parsed.at) || 0 };
  } catch {
    return null;
  }
}

export function writeRecord(state: NewsletterAnswer) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state, at: Date.now() } satisfies NewsletterRecord),
    );
  } catch {
    // The visitor sees the card again next session, which is a far smaller
    // problem than a thrown error here.
  }
  announce();
}

export function readTeaserClosed(): boolean {
  try {
    return window.sessionStorage.getItem(TEASER_KEY) === "1";
  } catch {
    return false;
  }
}

export function closeTeaser() {
  try {
    window.sessionStorage.setItem(TEASER_KEY, "1");
  } catch {
    /* see writeRecord */
  }
  announce();
}

function announce() {
  invalidate();
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* pre-DOM, or a browser without CustomEvent - nothing to sync to yet */
  }
}

/** True when no surface should ask again: subscribed, or inside the snooze. */
export function suppressed(record = readRecord()): boolean {
  if (!record) return false;
  if (record.state === "subscribed") return true;
  return Date.now() - record.at < SNOOZE_MS;
}

type Snapshot = {
  record: NewsletterRecord | null;
  teaserClosed: boolean;
  /**
   * False on the server and through hydration. Neither store is readable
   * there, so every surface has to render its "never asked" shape first or the
   * markup will not match what hydration produces.
   */
  ready: boolean;
};

const BLANK: Snapshot = { record: null, teaserClosed: false, ready: false };

/**
 * `getSnapshot` is called on every render and must return the *same object*
 * until something actually changes - a fresh read each time is a new reference,
 * which React reads as a new value and re-renders over, forever. So the read is
 * cached here and thrown away only when a write or another tab says so.
 */
let cache: Snapshot | null = null;

function invalidate() {
  cache = null;
}

function getSnapshot(): Snapshot {
  cache ??= {
    record: readRecord(),
    teaserClosed: readTeaserClosed(),
    ready: true,
  };
  return cache;
}

function getServerSnapshot(): Snapshot {
  return BLANK;
}

function subscribe(onChange: () => void) {
  const handle = () => {
    invalidate();
    onChange();
  };

  const onStorage = (event: StorageEvent) => {
    // `key` is null when the whole store is cleared, which is also a change.
    if (event.key === null || event.key === STORAGE_KEY) handle();
  };

  window.addEventListener(CHANGE_EVENT, handle);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handle);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The record, kept live. Re-reads on any change from this tab (CHANGE_EVENT)
 * or another one (`storage`), so subscribing anywhere silences everywhere.
 *
 * `useSyncExternalStore` rather than an effect that seeds state: localStorage
 * IS an external store, and this is the hook that exists for reading one
 * without a render-then-correct pass on arrival.
 */
export function useNewsletterState(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
