import clsx from "clsx";
import { site } from "@/lib/site";
import Image from "next/image";

/**
 * Kozy Living core brand logo used across the website.
 * Proportional dimensions keep the mark crisp without distortion.
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
      ? "h-6 sm:h-7 w-auto max-w-[80px] sm:max-w-[120px]"
      : size === "lg"
        ? "h-12 md:h-16 w-auto max-w-[180px] md:max-w-[220px]"
        : "h-7 sm:h-8.5 md:h-10 w-auto max-w-[65px] sm:max-w-[120px] md:max-w-[160px]";

  return (
    <span className={clsx("inline-flex items-center leading-none", className)}>
      <Image
        src="/logo/kozy-logo-web.png"
        alt={site.name}
        width={720}
        height={405}
        priority={size !== "sm"}
        className={clsx("object-contain", dimensions)}
      />
    </span>
  );
}

