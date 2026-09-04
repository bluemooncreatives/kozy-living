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
      {/* sage-deep, not sage: flat sage measures 1.81 on ivory and the
          bullet simply would not be there. */}
      <span aria-hidden className="text-[1.1em] leading-none text-sage-deep">
        &#9679;
      </span>
      {children}
    </p>
  );
}

/**
 * The display face, as a class list.
 *
 * Franxurter is single-weight, and the `text-display-*` size utilities carry
 * the grotesk's weight and track - so the face has to be paired with
 * `font-normal` and a gentler letter-spacing as utilities, which beat the size
 * utility by source order. Exported so the handful of major headings written
 * outside `Headline` stay identical to the ones inside it.
 */
export const displayFace =
  "display-face font-normal tracking-[-0.015em] text-ink";

/**
 * Display heading. `count` renders as the superscript numeral marking how many
 * products sit in the section below - a signature of this system.
 *
 * The size decides the face: xl and lg are major section headings and get
 * Franxurter; md and sm are subheads and cards, and stay on the UI grotesk,
 * where a poster face would only cost legibility.
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
  const isDisplay = size === "xl" || size === "lg";

  return (
    <Tag
      id={id}
      className={clsx(
        "text-balance",
        isDisplay ? displayFace : "serif",
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
