import Link from "next/link";

/**
 * The hairline trail that opens a standalone editorial page - `HOME - ABOUT US`
 * centred in a full-bleed band, ruled top and bottom.
 *
 * It carries the same weight as an announcement strip rather than a nav: the
 * separator is decorative and hidden from assistive tech, and only the
 * ancestors are links. The current page is marked `aria-current` and is not
 * clickable, so a screen reader announces where it is instead of offering a
 * link back to the page it is already on.
 */
export default function Breadcrumb({
  trail,
  current,
}: {
  /** Ancestors, root first. Rendered as links. */
  trail?: { title: string; href: string }[];
  /** The page itself. Rendered as plain text. */
  current: string;
}) {
  const ancestors = trail ?? [{ title: "Home", href: "/" }];

  return (
    <nav aria-label="Breadcrumb" className="rule-y">
      <ol className="shell flex flex-wrap items-center justify-center gap-2 py-3">
        {ancestors.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-2">
            <Link
              href={crumb.href}
              className="ui-mono text-oxblood transition-opacity hover:opacity-60"
            >
              {crumb.title}
            </Link>
            <span aria-hidden className="ui-mono text-oxblood">
              &mdash;
            </span>
          </li>
        ))}
        <li>
          <span aria-current="page" className="ui-mono text-oxblood">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
