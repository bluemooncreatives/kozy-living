"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll-snap rail (DESIGN.md §5). Cells are hairline-divided and sized so the
 * next one peeks past the right edge, which is what signals the rail is
 * scrollable without any overlay chrome. Dots sit bottom-left, arrows
 * bottom-right.
 *
 * Native scrolling does the work - no transform tracking - so touch, trackpad,
 * keyboard and scrollbar all behave correctly for free.
 */
export default function Carousel({
  children,
  label,
  /** Cells visible at the largest breakpoint. The rail always peeks the next. */
  perView = 3,
  className,
}: {
  children: React.ReactNode[];
  label: string;
  perView?: 2 | 3;
  className?: string;
}) {
  const railRef = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const { scrollLeft, scrollWidth, clientWidth } = rail;
    const maxScroll = scrollWidth - clientWidth;
    // One "page" is a viewport of the rail; the last page is usually partial.
    const pages = clientWidth > 0 ? Math.ceil(scrollWidth / clientWidth) : 1;

    setPageCount(Math.max(1, pages));
    setPage(
      maxScroll <= 1
        ? 0
        : Math.round((scrollLeft / maxScroll) * (Math.max(1, pages) - 1))
    );
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [measure, children.length]);

  const scrollByPage = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  const goToPage = (index: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    rail.scrollTo({
      left: pageCount > 1 ? (maxScroll * index) / (pageCount - 1) : 0,
      behavior: "smooth",
    });
  };

  const cellWidth =
    perView === 2
      ? "w-[85%] sm:w-1/2 lg:w-1/2"
      : "w-[85%] sm:w-1/2 lg:w-1/3";

  return (
    <div className={className}>
      <ul
        ref={railRef}
        data-lenis-prevent-horizontal
        onScroll={measure}
        aria-label={label}
        className="rail rule-y border-y border-rule"
      >
        {children.map((cell, index) => (
          <li
            key={index}
            className={clsx(
              "shrink-0 snap-start border-r border-rule",
              cellWidth
            )}
          >
            {cell}
          </li>
        ))}
      </ul>

      {pageCount > 1 ? (
        <div className="shell flex items-center justify-between py-4">
          <ul className="flex items-center gap-2">
            {Array.from({ length: pageCount }).map((_, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => goToPage(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === page}
                  className={clsx(
                    "block h-2 w-2 rounded-full border border-oxblood transition-colors",
                    index === page ? "bg-oxblood" : "bg-transparent"
                  )}
                />
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label="Previous"
              className="text-2xl leading-none transition-opacity hover:opacity-60"
            >
              <span aria-hidden>&larr;</span>
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label="Next"
              className="text-2xl leading-none transition-opacity hover:opacity-60"
            >
              <span aria-hidden>&rarr;</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
