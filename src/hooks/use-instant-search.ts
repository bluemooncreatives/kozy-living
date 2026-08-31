"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/app/api/search/route";

const EMPTY: SearchResult = { products: [], collections: [], pages: [] };

function hasResults(r: SearchResult) {
  return r.products.length > 0 || r.collections.length > 0 || r.pages.length > 0;
}

export type InstantSearchState = {
  results: SearchResult;
  hasResults: boolean;
  isLoading: boolean;
};

/**
 * Debounced, abort-safe hook that fetches /api/search whenever `query` changes.
 * Starts fetching from the very first character.
 */
export function useInstantSearch(query: string, debounceMs = 180): InstantSearchState {
  const [results, setResults] = useState<SearchResult>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch_ = useCallback((q: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<SearchResult>)
      .then((data) => {
        setResults(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setResults(EMPTY);
          setIsLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!trimmed) {
      abortRef.current?.abort();
      setResults(EMPTY);
      setIsLoading(false);
      return;
    }

    timerRef.current = setTimeout(() => fetch_(trimmed), debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, fetch_]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { results, hasResults: hasResults(results), isLoading };
}
