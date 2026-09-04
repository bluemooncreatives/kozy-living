"use client";

import { createUrl } from "@/lib/utils";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  useRef,
  useState,
  useEffect,
  KeyboardEvent,
} from "react";
import clsx from "clsx";
import { brewFormats } from "@/lib/site";
import { useInstantSearch } from "@/hooks/use-instant-search";
import SearchResults from "./search-results";

// ---------------------------------------------------------------------------
// Shared form-submit handler (Enter key → /search?q=)
// ---------------------------------------------------------------------------
function useSearchSubmit(onDone?: () => void) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const search = form.search as HTMLInputElement;
    const newParams = new URLSearchParams(searchParams.toString());
    const query = search.value.trim().replace(/\s+/g, " ");

    newParams.delete("collection");

    if (query) {
      newParams.set("q", query);
    } else {
      newParams.delete("q");
    }

    onDone?.();
    router.push(createUrl("/search", newParams));
  };
}

// ---------------------------------------------------------------------------
// SearchBar - inline bar used in the mobile sidebar.
// Results render inline (no floating box) so they flow inside the drawer.
// ---------------------------------------------------------------------------
export function SearchBar({
  autoFocus = false,
  className,
}: {
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onSubmit = useSearchSubmit();

  const [query, setQuery] = useState(searchParams?.get("q") || "");
  const { results, hasResults, isLoading } = useInstantSearch(query);
  const showResults = !!query.trim() && (hasResults || isLoading);

  function handleSelect(href: string) {
    setQuery("");
    router.push(href);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setQuery("");
  }

  return (
    <div className={clsx("w-full", className)}>
      {/* Input */}
      <form onSubmit={onSubmit} className="relative w-full">
        <label htmlFor="site-search" className="sr-only">
          Search
        </label>
        <input
          id="site-search"
          key={searchParams?.get("q")}
          type="text"
          name="search"
          autoFocus={autoFocus}
          placeholder="Search the studio…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="serif w-full rounded-plate border border-ink/15 bg-card px-5 py-4 pr-12 text-display-sm focus-visible:border-ink focus-visible:ring-0"
        />
        <MagnifyingGlassIcon
          aria-hidden
          className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
        />
      </form>

      {/* Inline results - flows naturally inside the drawer, no box-in-box */}
      {showResults && (
        <SearchResults
          query={query}
          results={results}
          isLoading={isLoading}
          onSelect={handleSelect}
          variant="inline"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchTrigger - navbar affordance; opens the full-width overlay
// ---------------------------------------------------------------------------
export default function SearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-card transition-colors hover:bg-ink hover:text-paper"
      >
        <MagnifyingGlassIcon aria-hidden className="h-4 w-4" />
      </button>

      <Transition show={isOpen}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-[1000]">
          {/* Backdrop */}
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
              aria-hidden
            />
          </TransitionChild>

          {/* Panel */}
          <TransitionChild
            as={Fragment}
            enter="transition-transform ease-editorial duration-500"
            enterFrom="-translate-y-full"
            enterTo="translate-y-0"
            leave="transition-transform ease-in duration-200"
            leaveFrom="translate-y-0"
            leaveTo="-translate-y-full"
          >
            <DialogPanel
              data-lenis-prevent
              className="rule-b fixed inset-x-0 top-0 max-h-[100dvh] overflow-y-auto bg-paper pb-12 pt-8"
            >
              <div className="shell">
                {/* Header row */}
                <div className="flex items-start justify-between gap-8">
                  <p className="eyebrow pt-2">Search</p>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close search"
                    className="transition-opacity hover:opacity-60"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Overlay search form + inline results */}
                <div className="mt-6">
                  <SearchOverlayForm onDone={() => setIsOpen(false)} />
                </div>

                {/* Browse by brew pills - only shown when there is no query */}
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}

// ---------------------------------------------------------------------------
// SearchOverlayForm - large controlled input inside the overlay dialog.
// Results are rendered inline below the input (NO floating card).
// The "Browse by brew" pills are shown only when the input is empty.
// ---------------------------------------------------------------------------
function SearchOverlayForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onSubmit = useSearchSubmit(onDone);

  const [query, setQuery] = useState(searchParams?.get("q") || "");
  const { results, hasResults, isLoading } = useInstantSearch(query);
  const showResults = !!query.trim() && (hasResults || isLoading);
  const showBrowse = !query.trim();

  function handleSelect(href: string) {
    setQuery("");
    onDone();
    router.push(href);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query) {
        setQuery("");
      } else {
        onDone();
      }
    }
  }

  return (
    <>
      {/* Input row */}
      <form onSubmit={onSubmit} className="relative w-full">
        <label htmlFor="overlay-search" className="sr-only">
          Search
        </label>
        <input
          id="overlay-search"
          type="text"
          name="search"
          autoFocus
          placeholder="Search objects, spaces, materials…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="serif w-full rounded-plate border border-ink/15 bg-card px-6 py-6 pr-14 text-display-md focus-visible:border-ink focus-visible:ring-0"
        />
        <MagnifyingGlassIcon
          aria-hidden
          className="pointer-events-none absolute right-6 top-1/2 h-6 w-6 -translate-y-1/2 text-muted"
        />
      </form>

      {/* Inline results - no card, no shadow, part of the overlay content */}
      {showResults && (
        <SearchResults
          query={query}
          results={results}
          isLoading={isLoading}
          onSelect={handleSelect}
          variant="inline"
        />
      )}

      {/* Browse-by-space pills - visible only when input is empty */}
      {showBrowse && (
        <div className="mt-10">
          <p className="eyebrow mb-4 text-muted">Browse by space &amp; category</p>
          <ul className="flex flex-wrap gap-2">
            {brewFormats.map((format) => (
              <li key={format.handle}>
                <a
                  href={`/search/${format.handle}`}
                  onClick={() => onDone()}
                  className="pill"
                >
                  {format.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// SearchSkeleton - used in Suspense fallbacks
// ---------------------------------------------------------------------------
export function SearchSkeleton() {
  return (
    <div className="relative w-full">
      <div className="h-14 w-full animate-pulse rounded-plate bg-wash" />
    </div>
  );
}
