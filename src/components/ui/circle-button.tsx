import clsx from "clsx";
import Link from "next/link";

/**
 * The circular mark that sits directly on a photograph - the "shop now" disc
 * in the reference. A hairline ring over a blurred translucent disc, so it
 * reads on any frame without a scrim underneath it.
 *
 * `data-magnetic` hands it to the motion layer, which leans it toward the
 * cursor; the pull is set low here because the button sits over an image and
 * a large excursion would drag it off the subject.
 */
export default function CircleButton({
  label,
  href,
  className,
}: {
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      data-magnetic="0.18"
      className={clsx("circle-btn group", className)}
    >
      <span className="flex flex-col items-center gap-1 leading-none">
        {label}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 transition-transform duration-300 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </span>
    </Link>
  );
}
