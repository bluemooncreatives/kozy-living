import Link from "next/link";

/**
 * The trail that opens a standalone editorial page - `Home / About us`, set
 * flush left in the shell at meta scale.
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
    <nav aria-label="Breadcrumb">
      <ol className="shell flex flex-wrap items-center gap-2 py-5">
        {ancestors.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-2">
            <Link
              href={crumb.href}
              className="micro-mono text-muted transition-opacity hover:opacity-60"
            >
              {crumb.title}
            </Link>
            <span aria-hidden className="micro-mono text-muted">
              /
            </span>
          </li>
        ))}
        <li>
          <span aria-current="page" className="micro-mono">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
