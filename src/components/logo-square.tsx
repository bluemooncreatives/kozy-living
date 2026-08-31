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
      ? "h-8 w-auto max-w-[130px]"
      : size === "lg"
        ? "h-14 md:h-16 w-auto max-w-[220px]"
        : "h-9 md:h-11 w-auto max-w-[180px]";

  return (
    <span className={clsx("inline-flex items-center leading-none", className)}>
      <Image
        src="/logo/Kozy Logo.png"
        alt={site.name}
        width={3836}
        height={2160}
        priority={size !== "sm"}
        className={clsx("object-contain", dimensions)}
      />
    </span>
  );
}

