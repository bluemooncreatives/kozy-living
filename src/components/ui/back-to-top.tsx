"use client";

import Seal from "./seal";

/**
 * The footer's back-to-top control: the same rotating seal used over the hero,
 * with an arrow in place of the asterisk. Reusing the mark rather than adding
 * a separate button is what makes it read as part of the system.
 */
export default function BackToTop() {
  return (
    <Seal
      size="md"
      text="back to top · back to top · "
      glyph="↑"
      label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
    />
  );
}
