const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').config} */

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Roles are assigned by measured contrast, not by taste. See
        // DESIGN.md §1 for the ratio table and the two hard rules.
        paper: "#FFFFFF",
        // The ink. Body, nav, UI, prices, table cells. 16.5:1 on paper.
        ink: "#341706",
        // The brand voice: display headings, links, buttons, active states,
        // and — since Light Brown was retired — secondary/meta text and the
        // hairline hue as well. 10.6:1 on paper.
        oxblood: "#7B1526",
        // Fill-only accent. NEVER text on paper (1.5:1) — see DESIGN.md §1.
        amber: "#FFCF71",
        // Oxblood at 8% over paper: the product-image tile ground.
        tint: "#F4ECEE",
        rule: "rgba(123, 21, 38, 0.22)",
        wash: "rgba(123, 21, 38, 0.06)",
        // Dark ground. Takes paper or amber text only.
        coal: "#341706",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        // Nothing in this system is set in a sans — alias it to the mono so a
        // stray `font-sans` cannot silently introduce a third typeface.
        sans: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-hero": [
          "clamp(3.5rem, 11vw, 11rem)",
          { lineHeight: "0.92", letterSpacing: "-0.015em" },
        ],
        "display-xl": [
          "clamp(2.5rem, 5.5vw, 4.5rem)",
          { lineHeight: "1.02", letterSpacing: "-0.01em" },
        ],
        "display-lg": [
          "clamp(2rem, 4vw, 3.5rem)",
          { lineHeight: "1.08", letterSpacing: "-0.01em" },
        ],
        "display-md": [
          "clamp(1.5rem, 2.4vw, 2.5rem)",
          { lineHeight: "1.1", letterSpacing: "0" },
        ],
        "display-sm": [
          "clamp(1.375rem, 1rem + 1.5vw, 1.625rem)",
          { lineHeight: "1.15" },
        ],
        eyebrow: [
          "clamp(0.8125rem, 0.75rem + 0.4vw, 0.9rem)",
          { lineHeight: "1.2", fontWeight: "500", letterSpacing: "0em" },
        ],
        ui: [
          "clamp(0.8125rem, 0.75rem + 0.4vw, 0.9rem)",
          { lineHeight: "1.3", letterSpacing: "0em" },
        ],
        body: [
          "clamp(0.8125rem, 0.75rem + 0.4vw, 0.875rem)",
          { lineHeight: "1.6", letterSpacing: "0" },
        ],
        spec: [
          "clamp(0.6875rem, 0.65rem + 0.3vw, 0.75rem)",
          { lineHeight: "1.4", letterSpacing: "0.06em" },
        ],
        micro: [
          "clamp(0.625rem, 0.6rem + 0.25vw, 0.6875rem)",
          { lineHeight: "1.2", letterSpacing: "0.1em" },
        ],
      },
      letterSpacing: {
        ui: "0em",
        eyebrow: "0em",
        micro: "0.1em",
      },
      borderRadius: {
        // Every photograph in the system shares this radius.
        plate: "0.75rem",
      },
      borderColor: {
        DEFAULT: "rgba(123, 21, 38, 0.22)",
      },
      maxWidth: {
        measure: "38rem",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        blink: {
          "0%": { opacity: 0.2 },
          "20%": { opacity: 1 },
          "100%": { opacity: 0.2 },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        marqueeReverse: {
          from: { transform: "translateX(-50%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
        blink: "blink 1.4s both infinite",
        marquee: "marquee var(--marquee-duration, 40s) linear infinite",
        marqueeReverse:
          "marqueeReverse var(--marquee-duration, 40s) linear infinite",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/container-queries"),
    plugin(({ matchUtilities, theme }) => {
      matchUtilities(
        { "animation-delay": (value) => ({ "animation-delay": value }) },
        { values: theme("transitionDelay") }
      );
    }),
  ],
};
