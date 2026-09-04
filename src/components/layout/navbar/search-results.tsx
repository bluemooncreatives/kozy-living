"use client";

import type { SearchResult } from "@/app/api/search/route";
import Price from "@/components/price";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { createUrl } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useRef, KeyboardEvent } from "react";

type Props = {
  query: string;
  results: SearchResult;
  isLoading: boolean;
  onSelect: (href: string) => void;
  /**
   * "inline"  - results flow as part of the document (inside modals/drawers).
   *             No floating box, no shadow, no absolute positioning.
   * "dropdown" - floating card anchored below the input (future use for an
   *              always-visible page-level search bar).
   */
  variant?: "inline" | "dropdown";
};

export default function SearchResults({
  query,
  results,
  isLoading,
  onSelect,
  variant = "inline",
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeIndex = useRef(-1);

  useEffect(() => {
    activeIndex.current = -1;
  }, [results]);

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (!listRef.current) return;
    const els = Array.from(
      listRef.current.querySelectorAll<HTMLElement>("[data-sr-item]")
    );
    if (!els.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex.current = Math.min(activeIndex.current + 1, els.length - 1);
      els[activeIndex.current]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex.current = Math.max(activeIndex.current - 1, 0);
      els[activeIndex.current]?.focus();
    }
  }

  const isEmpty =
    results.products.length === 0 &&
    results.collections.length === 0 &&
    results.pages.length === 0;

  const allUrl = createUrl("/search", new URLSearchParams({ q: query }));

  const wrapperClass =
    variant === "dropdown"
      ? "absolute left-0 right-0 top-full z-50 mt-2 rounded-plate border border-rule bg-paper shadow-[0_8px_40px_rgba(52,23,6,0.14)]"
      : "w-full"; // inline: no box, flows naturally

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className={wrapperClass} onKeyDown={handleKeyDown}>
      {/* Loading state */}
      {isLoading && isEmpty && (
        <div className="flex items-center gap-3 py-6">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-transparent" />
          <span className="eyebrow">Searching…</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && isEmpty && (
        <div className="py-8">
          <p className="body-mono">No results found for &ldquo;{query}&rdquo;</p>
          <button
            data-sr-item
            onClick={() => onSelect(allUrl)}
            className="btn-outline mt-5"
          >
            Browse all products
          </button>
        </div>
      )}

      {/* Results list */}
      {!isEmpty && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className={variant === "dropdown" ? "max-h-[70vh] overflow-y-auto py-2" : "mt-6"}
        >
          {/* ── Products ─────────────────────────────────────────── */}
          {results.products.length > 0 && (
            <>
              <li className="pb-2">
                <span className="eyebrow">Products</span>
              </li>
              {results.products.map((product) => (
                <li
                  key={`product-${product.handle}`}
                  role="option"
                  aria-selected="false"
                  className="rule-b last:border-b-0"
                >
                  <button
                    data-sr-item
                    tabIndex={0}
                    onClick={() => onSelect(`/product/${product.handle}`)}
                    className="flex w-full items-center gap-4 py-3 text-left transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    {/* Thumbnail */}
                    <span className="plate relative h-12 w-12 flex-none">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.altText}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <MagnifyingGlassIcon className="h-5 w-5 text-muted" />
                        </span>
                      )}
                    </span>

                    {/* Title + price */}
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                      <span className="body-mono truncate w-full">{product.title}</span>
                      <Price
                        amount={product.price}
                        currencyCode={product.currencyCode}
                        className="spec-mono"
                      />
                    </span>
                  </button>
                </li>
              ))}
            </>
          )}

          {/* ── Collections ──────────────────────────────────────── */}
          {results.collections.length > 0 && (
            <>
              <li className={results.products.length > 0 ? "pb-2 pt-6" : "pb-2"}>
                <span className="eyebrow">Collections</span>
              </li>
              {results.collections.map((col) => (
                <li
                  key={`col-${col.handle}`}
                  role="option"
                  aria-selected="false"
                  className="rule-b last:border-b-0"
                >
                  <button
                    data-sr-item
                    tabIndex={0}
                    onClick={() => onSelect(`/search/${col.handle}`)}
                    className="flex w-full items-center justify-between gap-4 py-3 text-left transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <span className="body-mono">{col.title}</span>
                    <span className="spec-mono shrink-0 text-muted">Collection →</span>
                  </button>
                </li>
              ))}
            </>
          )}

          {/* ── Pages ────────────────────────────────────────────── */}
          {results.pages.length > 0 && (
            <>
              <li
                className={
                  results.products.length > 0 || results.collections.length > 0
                    ? "pb-2 pt-6"
                    : "pb-2"
                }
              >
                <span className="eyebrow">Pages</span>
              </li>
              {results.pages.map((pg) => (
                <li
                  key={`page-${pg.handle}`}
                  role="option"
                  aria-selected="false"
                  className="rule-b last:border-b-0"
                >
                  <button
                    data-sr-item
                    tabIndex={0}
                    onClick={() => onSelect(`/${pg.handle}`)}
                    className="flex w-full items-center justify-between gap-4 py-3 text-left transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <span className="body-mono">{pg.title}</span>
                    <span className="spec-mono shrink-0 text-muted">Page →</span>
                  </button>
                </li>
              ))}
            </>
          )}

          {/* ── See all footer ───────────────────────────────────── */}
          <li className="pt-6" role="option" aria-selected="false">
            <button
              data-sr-item
              tabIndex={0}
              onClick={() => onSelect(allUrl)}
              className="link-arrow"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              See all results for &ldquo;{query}&rdquo;
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
