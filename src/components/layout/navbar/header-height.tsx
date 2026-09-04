"use client";

import { useEffect } from "react";

/**
 * Publishes the real header height to `--header-h`.
 *
 * Three things depend on that number being right: the hero, which is sized to
 * exactly the viewport minus the header; the sticky filter bar on the browse
 * pages; and the sticky buy panel on a product page. It used to be a
 * hard-coded 5.5rem, which was a few pixels short on desktop and badly short
 * on a phone, where the announcement line wraps to two rows and the header is
 * nearer 6.9rem.
 *
 * The CSS keeps per-breakpoint defaults so the first paint is close; this
 * corrects it to the measured pixel and keeps it correct as the announcement
 * rewraps on rotation or resize.
 */
export default function HeaderHeight() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    if (!header) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${Math.round(header.getBoundingClientRect().height)}px`
      );
    };

    publish();

    const observer = new ResizeObserver(publish);
    observer.observe(header);

    // Fonts land after first paint and can change the announcement's line
    // count; the observer catches the resulting resize, but this makes the
    // dependency explicit rather than incidental.
    document.fonts?.ready.then(publish).catch(() => undefined);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--header-h");
    };
  }, []);

  return null;
}
