import clsx from "clsx";
import { site } from "@/lib/site";
import Image from "next/image";

/**
 * Estate seal used as the header lockup. The source image is square, so fixed
 * dimensions keep it crisp and prevent layout shift in both header contexts.
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
      ? "h-10 w-10"
      : size === "lg"
        ? "h-24 w-24"
        : "h-11 w-11";

  return (
    <span className={clsx("block leading-none", className)}>
      <Image
        src="/logo.png"
        alt={site.name}
        width={571}
        height={571}
        priority={size !== "sm"}
        className={clsx("object-contain", dimensions)}
      />
    </span>
  );
}
