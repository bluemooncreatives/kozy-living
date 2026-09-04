const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ------------------------------------------------------------------
           Kozy Living - street-editorial system.

           Three values carry the whole site: a near-black ink, a single
           saturated yellow, and a soft off-white ground. Everything else is
           an alpha of the ink.

           The legacy token names (paper / ink / oxblood / amber / tint /
           coal) are kept and repointed rather than renamed, so every surface
           already written against them inherits the new look untouched.
        ------------------------------------------------------------------ */

        // Page ground. Soft off-white, a hair warm so photography sits in it.
        paper: "#F2F1ED",
        // Card / panel ground. The one true white in the system.
        card: "#FFFFFF",
        // The ink. Headings, body, nav, dark panels. Near-black, never #000.
        ink: "#131313",
        // Repointed: headings and links used to be terracotta, now they are
        // the ink. Keeping the name means no page has to be rewritten.
        oxblood: "#131313",
        // The single accent. Wordmarks, badges, fills, the rotating seal.
        amber: "#FFC803",
        yellow: "#FFC803",
        // Deeper yellow, used only for pressed/hover states on yellow fills.
        "yellow-deep": "#E8B400",
        // Image-plate ground, visible only while media loads.
        tint: "#E4E2DC",
        // Muted body copy, captions, meta.
        muted: "#8A8880",
        rule: "rgba(19, 19, 19, 0.10)",
        wash: "rgba(19, 19, 19, 0.04)",
        // Dark ground. Takes paper or yellow text.
        coal: "#131313",
      },
      fontFamily: {
        // One family does every job. `display` is the same face at heavy
        // weight and tight tracking; `mono` / `sans` are kept as aliases so
        // existing markup keeps working.
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-ui)", "Inter", "system-ui", "sans-serif"],
        sans: ["var(--font-ui)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // The full-bleed wordmark ("kozy living", "shop now"). Sized in vw so
        // it always spans the frame edge to edge.
        "display-hero": [
          "clamp(3.25rem, 16.5vw, 16rem)",
          { lineHeight: "0.82", letterSpacing: "-0.045em", fontWeight: "800" },
        ],
        "display-xl": [
          "clamp(2.25rem, 6.4vw, 5rem)",
          { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "700" },
        ],
        "display-lg": [
          "clamp(1.75rem, 4vw, 3.25rem)",
          { lineHeight: "1.06", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        "display-md": [
          "clamp(1.375rem, 2.2vw, 2rem)",
          { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "display-sm": [
          "clamp(1.0625rem, 0.9rem + 0.7vw, 1.3125rem)",
          { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "700" },
        ],
        eyebrow: [
          "0.6875rem",
          { lineHeight: "1.2", fontWeight: "600", letterSpacing: "0.16em" },
        ],
        ui: [
          "clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)",
          { lineHeight: "1.35", letterSpacing: "-0.005em", fontWeight: "500" },
        ],
        body: [
          "clamp(0.8125rem, 0.78rem + 0.2vw, 0.9375rem)",
          { lineHeight: "1.62", letterSpacing: "-0.005em", fontWeight: "400" },
        ],
        spec: [
          "0.75rem",
          { lineHeight: "1.5", letterSpacing: "0.01em", fontWeight: "400" },
        ],
        micro: [
          "0.625rem",
          { lineHeight: "1.2", letterSpacing: "0.18em", fontWeight: "600" },
        ],
      },
      letterSpacing: {
        ui: "-0.005em",
        eyebrow: "0.16em",
        micro: "0.18em",
        tightest: "-0.045em",
      },
      borderRadius: {
        // The system radius. Every card, plate and panel uses it.
        plate: "1.5rem",
        chip: "999px",
      },
      borderColor: {
        DEFAULT: "rgba(19, 19, 19, 0.10)",
      },
      maxWidth: {
        measure: "34rem",
        shell: "96rem",
      },
      boxShadow: {
        lift: "0 18px 50px -20px rgba(19, 19, 19, 0.28)",
        chip: "0 6px 18px -6px rgba(19, 19, 19, 0.25)",
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
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
        blink: "blink 1.4s both infinite",
        marquee: "marquee var(--marquee-duration, 40s) linear infinite",
        marqueeReverse:
          "marqueeReverse var(--marquee-duration, 40s) linear infinite",
        spinSlow: "spinSlow var(--spin-duration, 18s) linear infinite",
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
