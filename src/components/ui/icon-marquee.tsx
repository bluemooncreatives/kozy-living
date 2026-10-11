import Image from "next/image";
import clsx from "clsx";
import { brandIcons, type BrandIcon } from "@/components/ui/brand-icons";

/**
 * Scrolling band of house glyphs. Like the text `Marquee`, the run is rendered
 * twice so the -50% translation in `.marquee-track` loops without a seam, and
 * the duplicate is hidden from assistive tech.
 *
 * Each half carries the glyphs three times over (`COPIES`). One pass of seven
 * glyphs is narrower than a wide screen, and a half narrower than the viewport
 * leaves the band empty at the edge as it loops. The duration is multiplied
 * by the same factor so the speed does not change.
 *
 * Each glyph carries its own scale from `brandIcons` - the artwork is not
 * drawn to a shared optical size, so one box alone would not hold them level.
 */
export default function IconMarquee({
  icons = DEFAULT_RUN,
  reverse = false,
  duration = 42,
  className,
}: {
  icons?: readonly BrandIcon[];
  reverse?: boolean;
  /** Seconds for one full pass. */
  duration?: number;
  className?: string;
}) {
  const run = (ariaHidden: boolean) => (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={ariaHidden || undefined}
    >
      {Array.from({ length: COPIES }, () => icons).flat().map((icon, i) => (
        <div key={`${icon.alt}-${i}`} className="px-7 md:px-10">
          <Image
            src={icon.src}
            alt={ariaHidden || i >= icons.length ? "" : icon.alt}
            className={clsx(
              "h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16 md:h-20 md:w-20",
              icon.scale
            )}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={clsx("overflow-hidden", className)}
      style={{ "--marquee-duration": `${duration * COPIES}s` } as React.CSSProperties}
    >
      <div className={reverse ? "marquee-track-reverse" : "marquee-track"}>
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}

const COPIES = 3;

/** Ordered so no two glyphs of similar shape sit next to each other. */
const DEFAULT_RUN = [
  brandIcons.krafted,
  brandIcons.eco,
  brandIcons.comfy,
  brandIcons.pet,
  brandIcons.cook,
  brandIcons.petParent,
  brandIcons.car,
] as const;
