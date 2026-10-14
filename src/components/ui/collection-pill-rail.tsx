import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import type { IconType } from "react-icons";
import { GiPawPrint, GiSparkles } from "react-icons/gi";
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
/**
 * The brand's own illustrated icons (`public/icons/categories/`), picked by
 * matching the menu item's title AND path, so a pill keeps its picture when
 * the merchant renames it but not when it is pointed somewhere else.
 *
 * They are cut from the Shopify uploads (`bathrobes.png` and the rest):
 * trimmed to the ink box, because the originals carry up to 80% transparent
 * margin and the well is only 36px; and capped at 128px, because the
 * originals are ~2 MB each for a 36px paint. `slippers.png` was delivered
 * with a grey checkerboard painted INTO its pixels (no alpha at all) - it was
 * flood-filled out from the edges here. Re-cutting any of these means going
 * back to the Shopify file.
 *
 * Order matters: "Ritual Kits" also says "ritual", and the kit bag (which
 * reads "Kustom & Kits") is the picture for every kit. An item nothing
 * matches gets a react-icons glyph in the same transparent well.
 */
type CategoryIcon =
  | { src: string; width: number; height: number; scale?: number }
  | { glyph: IconType };

/* `scale` is optical, not geometric. Drawn to the same box, a solid disc
   (the spiral) and a solid square (the pillow) weigh far more than the
   open line art of the kit bag, so the two heavy ones are drawn smaller to
   read the same size along the rail. */
const ICONS = {
  all: { src: "/icons/categories/all.png", width: 128, height: 104 },
  bathrobes: {
    src: "/icons/categories/bathrobes.png",
    width: 101,
    height: 128,
  },
  kit: { src: "/icons/categories/kit.png", width: 128, height: 107 },
  pillows: {
    src: "/icons/categories/pillows.png",
    width: 128,
    height: 116,
    scale: 0.92,
  },
  colour: {
    src: "/icons/categories/colour.png",
    width: 124,
    height: 128,
    scale: 0.86,
  },
  mood: { src: "/icons/categories/mood.png", width: 128, height: 109 },
  slippers: { src: "/icons/categories/slippers.png", width: 128, height: 106 },
} satisfies Record<string, CategoryIcon>;

function categoryIcon(
  title: string,
  path: string,
  lead: boolean,
): CategoryIcon {
  if (lead) return ICONS.all;

  const category = `${title} ${path}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => category.includes(w));

  if (has("kit")) return ICONS.kit;
  if (has("robe")) return ICONS.bathrobes;
  if (has("pillow")) return ICONS.pillows;
  if (has("slipper")) return ICONS.slippers;
  if (has("colour", "color", "kolour")) return ICONS.colour;
  if (has("mood")) return ICONS.mood;
  if (has("pet", "karrier", "carrier")) return { glyph: GiPawPrint };

  return { glyph: GiSparkles };
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
            const icon = categoryIcon(pill.title, pill.path, pill.lead);

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
                    {"src" in icon ? (
                      // Unoptimized: the files are already 17-43 KB at
                      // 128px, and the optimiser's srcset for a 32px paint
                      // was serving the 40px variant to 2x screens - the
                      // drawings came out soft.
                      <Image
                        src={icon.src}
                        alt=""
                        width={icon.width}
                        height={icon.height}
                        unoptimized
                        className="cat-pill-art"
                        style={
                          "scale" in icon && icon.scale
                            ? ({
                                "--art-scale": icon.scale,
                              } as React.CSSProperties)
                            : undefined
                        }
                      />
                    ) : (
                      <icon.glyph className="cat-pill-glyph" />
                    )}
                  </span>
                </Link>
                <span aria-hidden className="cat-pill-sep">
                  {/* The block-printed K, the same textile artwork the
                      wordmark's O is cut from. One src for every separator on
                      the rail, so the ~40 repeats are one request. Trimmed
                      178x192 - see the note on the asset in CLAUDE.md. */}
                  <Image
                    src="/kozy/k.png"
                    alt=""
                    width={178}
                    height={192}
                    sizes="28px"
                    className="cat-pill-sep-mark"
                  />
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
