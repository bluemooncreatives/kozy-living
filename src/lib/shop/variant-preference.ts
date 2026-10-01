import type { ProductVariant } from "@/lib/shopify/types";
import { useSyncExternalStore } from "react";
import { optionScore } from "./variant-match";

/**
 * Which variant a card's one-tap Buy now / Add should reach for.
 *
 * A card has no picker, so it chooses on the shopper's behalf - the owner's
 * call, made for speed - and the drawer is where that choice is shown and can
 * be changed. The order it chooses in:
 *
 *   1. the variant last picked for THIS product (product page or drawer);
 *   2. the variant matching the options last picked ANYWHERE - someone who
 *      chose "M" on one shirt most likely wants "M" on the next;
 *   3. the first variant in stock.
 *
 * Browser-only and best-effort: every access is guarded, because private
 * windows and blocked site data throw rather than return empty. The server
 * re-resolves against live stock (`addPreferredItem`), so a stale preference
 * costs nothing but a different, available size.
 */

const KEY = "kozy:variant-pref";
/** Same-tab fan-out; the `storage` event only reaches OTHER tabs. */
const CHANGE_EVENT = "kozy:variant-pref-change";
/** Enough for a long browse; the oldest products fall off first. */
const MAX_PRODUCTS = 60;

export type VariantPreference = {
  /** The whole variant, so a card that only fetched two can still show it. */
  products: Record<string, ProductVariant & { at: number }>;
  /** Option name (lowercase) -> last value picked, across all products. */
  options: Record<string, string>;
};

function empty(): VariantPreference {
  return { products: {}, options: {} };
}

/**
 * Read straight from storage. Components use `useVariantPreference` instead,
 * which caches this - see the note there.
 */
export function readVariantPreference(): VariantPreference {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<VariantPreference>;
    return {
      products:
        parsed.products && typeof parsed.products === "object"
          ? parsed.products
          : {},
      options:
        parsed.options && typeof parsed.options === "object"
          ? parsed.options
          : {},
    };
  } catch {
    return empty();
  }
}

/** Records a deliberate choice. Never call it for a card's own guess. */
export function rememberVariant(handle: string, variant: ProductVariant) {
  try {
    const current = readVariantPreference();
    current.products[handle] = {
      id: variant.id,
      title: variant.title,
      availableForSale: variant.availableForSale,
      selectedOptions: variant.selectedOptions,
      price: variant.price,
      at: Date.now(),
    };
    for (const option of variant.selectedOptions) {
      current.options[option.name.toLowerCase()] = option.value;
    }

    const handles = Object.keys(current.products);
    if (handles.length > MAX_PRODUCTS) {
      handles
        .sort((a, b) => current.products[a]!.at - current.products[b]!.at)
        .slice(0, handles.length - MAX_PRODUCTS)
        .forEach((stale) => delete current.products[stale]);
    }

    window.localStorage.setItem(KEY, JSON.stringify(current));
    cached = undefined;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage unavailable: the card falls back to the first in-stock variant.
  }
}

/**
 * The variant a card would add, from what the card knows. `variants` may be
 * a truncated list (the listing fragment fetches two), which is why the
 * remembered variant is stored whole and the server has the final word.
 */
export function guessVariant(
  handle: string,
  variants: ProductVariant[],
  preference: VariantPreference
): ProductVariant | undefined {
  const remembered = preference.products[handle];
  if (remembered) {
    const live = variants.find((variant) => variant.id === remembered.id);
    if (live?.availableForSale) return live;
    // Not in the truncated list: trust the stored copy, the server re-checks.
    if (!live && remembered.availableForSale) return remembered;
  }

  const available = variants.filter((variant) => variant.availableForSale);
  if (!available.length) return undefined;

  let best = available[0]!;
  let bestScore = optionScore(best, preference.options);
  for (const variant of available.slice(1)) {
    const score = optionScore(variant, preference.options);
    if (score > bestScore) {
      best = variant;
      bestScore = score;
    }
  }
  return best;
}

/* ----------------------------------------------------------- React hook */

// `getSnapshot` runs on every render and must return the SAME object until
// something changes, or React re-renders forever - so the parsed read is
// cached here and dropped only on a write.
let cached: VariantPreference | undefined;

function subscribe(onChange: () => void) {
  const handler = () => {
    cached = undefined;
    onChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}

function getSnapshot(): VariantPreference {
  cached ??= readVariantPreference();
  return cached;
}

/**
 * The stored preference, or `null` on the server and through hydration -
 * localStorage does not exist there, and the first paint must agree with it.
 */
export function useVariantPreference(): VariantPreference | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
