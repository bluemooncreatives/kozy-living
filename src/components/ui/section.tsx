import clsx from "clsx";
import Link from "next/link";

/**
 * Section scaffolding for the flame system (DESIGN.md §5).
 *
 * Every content section repeats one structure: a bulleted mono eyebrow, a
 * centred serif heading carrying its collection size as a superscript, and an
 * underlined "VIEW ALL →" link. These primitives encode that so sections stay
 * in rhythm without each page re-deciding the spacing.
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
      <span aria-hidden className="text-[0.5em] leading-none text-oxblood">
        &#9679;
      </span>
      {children}
    </p>
  );
}

/**
 * Display heading. `count` renders as the superscript numeral that marks how
 * many products sit in the section below - a signature of this system.
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

/** Centred eyebrow → heading → link stack that opens most sections. */
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
    <div className={clsx("shell py-12 text-center md:py-16", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Headline count={count} className="mt-4">
        {title}
      </Headline>
      {action && actionHref ? (
        <Link href={actionHref} className="link-arrow mt-6">
          {action} <span aria-hidden>&rarr;</span>
        </Link>
      ) : null}
    </div>
  );
}

/** Product status flag rendered over a plate. */
export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}
