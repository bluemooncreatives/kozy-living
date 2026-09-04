import clsx from "clsx";
import Link from "next/link";
import { ArrowUpRight } from "./arrow-badge";

/**
 * Section scaffolding.
 *
 * Every content section repeats one structure: a small tracked-out caps
 * eyebrow, a heavy display heading carrying its collection size as a
 * superscript, and a quiet "view all" link with a corner arrow. These
 * primitives encode that so sections stay in rhythm without each page
 * re-deciding the spacing.
 */

export function Eyebrow({
  children,
  align = "center",
  className,
}: {
  children: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <p
      className={clsx(
        "eyebrow flex items-center gap-2",
        align === "center" ? "justify-center" : "justify-start",
        className
      )}
    >
      <span aria-hidden className="text-[1.1em] leading-none text-yellow">
        &#9679;
      </span>
      {children}
    </p>
  );
}

/**
 * Display heading. `count` renders as the superscript numeral marking how many
 * products sit in the section below - a signature of this system.
 */
export function Headline({
  children,
  count,
  as: Tag = "h2",
  size = "xl",
  id,
  className,
}: {
  children: React.ReactNode;
  count?: number;
  as?: "h1" | "h2" | "h3" | "p";
  size?: "xl" | "lg" | "md" | "sm";
  id?: string;
  className?: string;
}) {
  return (
    <Tag
      id={id}
      className={clsx(
        "serif text-balance",
        {
          "text-display-xl": size === "xl",
          "text-display-lg": size === "lg",
          "text-display-md": size === "md",
          "text-display-sm": size === "sm",
        },
        className
      )}
    >
      {children}
      {count ? (
        <sup className="count-sup" aria-hidden>
          {count}
        </sup>
      ) : null}
    </Tag>
  );
}

/**
 * The head that opens most sections: eyebrow and heading on the left, the
 * "view all" link pushed to the right edge on wide screens. Left-aligned
 * rather than centred - the reference sets every section head flush left and
 * lets the photography carry the symmetry.
 */
export function SectionHead({
  eyebrow,
  title,
  count,
  action,
  actionHref,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  count?: number;
  action?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "shell flex flex-col gap-5 py-10 md:flex-row md:items-end md:justify-between md:py-14",
        className
      )}
    >
      <div>
        <Eyebrow align="left">{eyebrow}</Eyebrow>
        <Headline count={count} size="lg" className="mt-3">
          {title}
        </Headline>
      </div>
      {action && actionHref ? (
        <Link href={actionHref} className="link-arrow shrink-0">
          {action}
          <span className="arrow-btn h-8 w-8 border border-ink/15">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ) : null}
    </div>
  );
}

/** Product status flag rendered over a plate. */
export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}
