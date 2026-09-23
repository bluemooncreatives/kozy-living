import clsx from "clsx";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
  GiHearts,
  GiIncense,
  GiPalette,
  GiPawPrint,
  GiPillow,
  GiRobe,
  GiSlippers,
  GiSparkles,
} from "react-icons/gi";
import type { Menu } from "@/lib/shopify/types";

/**
 * Category pills, as an endless ticker under the hero.
 *
 * Items come from the Shopify menu, passed in by the server component that
 * renders the rail. Nothing here is hard-coded, so a category added in Admin
 * shows up in the nav, the drawer, the search overlay and this rail at once.
 *
 * WHY THE RUN IS REPEATED. The loop is the shared `.marquee-track`: two
 * identical halves, translated by -50%. That is only seamless if one half is
 * wider than the screen - seven pills measure ~1,300px, so on a 1440px screen
 * a single copy per half left a blank band sliding in at the right edge. Each
 * half therefore carries the menu `copies` times, sized from the labels to
 * clear a 2560px screen.
 *
 * Only the very first copy is exposed: every repeat is `aria-hidden` and out
 * of the tab order, so a screen reader hears the menu once and Tab walks it
 * once. The ticker pauses on hover and while a pill holds focus, so a pill is
 * never carried out from under the pointer or the keyboard. With reduced
 * motion it stops, drops the repeats and becomes a plain swipeable row.
 *
 * Pure CSS on purpose - the pill borrows `ActionButton`'s shape (label plus a
 * socketed icon well) but not its GSAP hover: ~40 instances each binding
 * their own tweens is a poor trade for a strip, and CSS keeps it working
 * before hydration.
 */
function categoryIcon(title: string, path: string, lead: boolean): IconType {
  if (lead) return GiHearts;

  const category = `${title} ${path}`.toLowerCase();

  if (category.includes("robe")) return GiRobe;
  if (category.includes("pillow")) return GiPillow;
  if (category.includes("slipper")) return GiSlippers;
  if (category.includes("ritual")) return GiIncense;
  if (category.includes("colour") || category.includes("color")) {
    return GiPalette;
  }
  if (
    category.includes("pet") ||
    category.includes("karrier") ||
    category.includes("carrier")
  ) {
    return GiPawPrint;
  }

  return GiSparkles;
}

export default function CollectionPillRail({
  items,
  allLabel = "All Kompanions",
}: {
  items: Menu[];
  /** Leading pill linking to the unfiltered catalogue. Pass "" to omit it. */
  allLabel?: string;
}) {
  if (!items.length) return null;

  const pills = [
    ...(allLabel ? [{ title: allLabel, path: "/search", lead: true }] : []),
    ...items.map((item) => ({ ...item, lead: false })),
  ];

  // ~8.5px a character at `text-ui` semibold, plus padding, the arrow well
  // and the separator. The 3400 target is deliberately well past 2560: the
  // phone pill is tighter than this estimate (a 2800 target measured 2544px
  // of real half - a seam on a 2560 screen). Overshooting costs a few more
  // off-screen nodes; undershooting costs a visible gap.
  const runWidth = pills.reduce(
    (sum, pill) => sum + pill.title.length * 8.5 + 110,
    0,
  );
  const copies = Math.max(2, Math.ceil(3400 / runWidth));
  // A steady ~45px a second, whatever the menu's length.
  const duration = Math.round((runWidth * copies) / 45);

  const half = (exposed: boolean) =>
    Array.from({ length: copies }, (_, copy) => {
      const live = exposed && copy === 0;
      return (
        <ul
          key={copy}
          className="flex shrink-0 items-center"
          aria-hidden={live ? undefined : true}
          data-dup={live ? undefined : ""}
        >
          {pills.map((pill, index) => {
            const Icon = categoryIcon(pill.title, pill.path, pill.lead);

            return (
              <li
                key={`${pill.title}-${index}`}
                className="flex shrink-0 items-center"
              >
                <Link
                  href={pill.path}
                  prefetch={false}
                  tabIndex={live ? undefined : -1}
                  className={clsx("cat-pill", pill.lead && "cat-pill-lead")}
                >
                  <span className="cat-pill-label">{pill.title}</span>
                  <span aria-hidden className="cat-pill-icon">
                    <Icon className="cat-pill-glyph" />
                  </span>
                </Link>
                <span aria-hidden className="cat-pill-sep">
                  ✳
                </span>
              </li>
            );
          })}
        </ul>
      );
    });

  return (
    <div
      className="pill-marquee"
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
    >
      <div className="marquee-track">
        {half(true)}
        {half(false)}
      </div>
    </div>
  );
}
