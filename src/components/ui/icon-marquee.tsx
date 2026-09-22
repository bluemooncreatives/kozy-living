import Image from "next/image";
import clsx from "clsx";
import { brandIcons, type BrandIcon } from "@/components/ui/brand-icons";

/**
 * Scrolling band of house glyphs. Like the text `Marquee`, the run is rendered
 * twice so the -50% translation in `.marquee-track` loops without a seam, and
 * the duplicate is hidden from assistive tech.
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
      {icons.map((icon, i) => (
        <div key={`${icon.alt}-${i}`} className="px-7 md:px-10">
          <Image
            src={icon.src}
            alt={ariaHidden ? "" : icon.alt}
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
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
    >
      <div className={reverse ? "marquee-track-reverse" : "marquee-track"}>
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}

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
