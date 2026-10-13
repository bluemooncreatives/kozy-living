import clsx from "clsx";
import { site } from "@/lib/site";
import Image from "@/components/ui/shop-image";

/**
 * Kozy Living core brand logo, in the header and the phone drawer.
 *
 * The artwork is Shopify's (`site.logo`), cropped to its ink box at the CDN,
 * so the height set here is the height of the letters - the previous local
 * file carried ~40% padding and its "40px" logo drew 25px of mark. Height is
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
      ? "h-6 sm:h-7"
      : size === "lg"
        ? "h-12 md:h-16"
        : "h-6 sm:h-7 md:h-9";

  return (
    <span className={clsx("inline-flex items-center leading-none", className)}>
      <Image
        src={site.logo.url}
        alt={site.name}
        width={site.logo.width}
        height={site.logo.height}
        // The widest render is the default size at md: 36px tall, ~92px wide
        // (and twice that on a 2x screen) - not the master's 3356px.
        sizes={size === "lg" ? "164px" : "92px"}
        priority={size !== "sm"}
        className={clsx("w-auto object-contain", dimensions)}
      />
    </span>
  );
}
