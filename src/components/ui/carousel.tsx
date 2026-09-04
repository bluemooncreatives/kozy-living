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
      ? "w-[82%] sm:w-[48%] lg:w-[49%]"
      : "w-[78%] sm:w-[46%] lg:w-[31.5%]";

  return (
    <div className={className}>
      <ul
        ref={railRef}
        data-lenis-prevent-horizontal
        onScroll={measure}
        aria-label={label}
        className="rail shell gap-3 pb-1"
      >
        {children.map((cell, index) => (
          <li key={index} className={clsx("shrink-0 snap-start", cellWidth)}>
            {cell}
          </li>
        ))}
      </ul>

      {pageCount > 1 ? (
        <div className="shell flex items-center justify-between pt-6">
          <ul className="flex items-center gap-2">
            {Array.from({ length: pageCount }).map((_, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => goToPage(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === page}
                  className={clsx(
                    "block h-1.5 rounded-full transition-all duration-300",
                    index === page ? "w-6 bg-ink" : "w-1.5 bg-ink/25"
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
              className="arrow-btn h-10 w-10 border border-ink/15"
            >
              <span aria-hidden className="text-lg leading-none">
                &larr;
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label="Next"
              className="arrow-btn h-10 w-10 border border-ink/15"
            >
              <span aria-hidden className="text-lg leading-none">
                &rarr;
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
