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
      {/* `flex-nowrap` + `overflow-x-auto` rather than `flex-wrap`: a wrapped
          trail stranded the current page alone on a second row, which read as
          a font-size jump (indigo `aria-current` beside muted-gray ancestors)
          rather than as what it was - a line break. A scrolling single line
          keeps every crumb on the one baseline at any width, including a
          three-deep trail on a narrow phone. */}
      <ol className="shell flex flex-nowrap items-center gap-2 overflow-x-auto py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ancestors.map((crumb) => (
          <li key={crumb.href} className="flex shrink-0 items-center gap-2">
            <Link
              href={crumb.href}
              className="micro-mono whitespace-nowrap text-muted transition-opacity hover:opacity-60"
            >
              {crumb.title}
            </Link>
            <span aria-hidden className="micro-mono text-muted">
              /
            </span>
          </li>
        ))}
        {/* `flex items-center`, matching every ancestor `<li>` above - not a
            plain block. Both sat in the same flex row under `ol`'s own
            `items-center`, but a block box and a flex box compute slightly
            different heights for the same one line of text, and the ol then
            centred each on its own mismatched height: 2px of drift, visible
            as the current page sitting off the ancestors' baseline. */}
        <li className="flex shrink-0 items-center">
          <span aria-current="page" className="micro-mono whitespace-nowrap">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
