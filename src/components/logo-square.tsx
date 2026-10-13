import clsx from "clsx";
import { site } from "@/lib/site";
import Image from "@/components/ui/shop-image";

/**
 * Kozy Living core brand logo, in the header and the phone drawer.
 *
 * The artwork is Shopify's (`site.logo`), cropped to its ink box at the CDN,
 * so the height set here is the height of the mark - the previous local
 * file carried ~40% padding and its "40px" logo drew 25px of mark. The mark
 * now includes the "Rooted in Rituals" line, so it is taller for its width
 * and is set taller (52px at lg, in the 72px row) to keep KOZY readable. Height is
 * set and width follows the aspect ratio, so a re-exported file with a new
 * shape cannot squash.
 */
export default function LogoSquare({
  size,
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  const dimensions =
    size === "sm"
      ? "h-8 sm:h-9"
      : size === "lg"
        ? "h-12 md:h-16"
        : "h-9 md:h-11 lg:h-[3.25rem]";

  return (
    <span className={clsx("inline-flex items-center leading-none", className)}>
      <Image
        src={site.logo.url}
        alt={site.name}
        width={site.logo.width}
        height={site.logo.height}
        // The widest render is the default size at lg: 52px tall, ~114px
        // wide (twice that on a 2x screen) - not the 1774px file.
        sizes={size === "lg" ? "140px" : "114px"}
        priority={size !== "sm"}
        className={clsx("w-auto object-contain", dimensions)}
      />
    </span>
  );
}
