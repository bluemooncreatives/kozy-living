import Link from "next/link";
import { collectionPills } from "@/lib/site";

/**
 * Category pills. A plain wrapped row of outlined chips - the reference keeps
 * its navigation flat and quiet so the photography and the wordmarks carry the
 * page.
 *
 * This used to mount a mouse-following video preview; that motif belonged to
 * the previous system and has been dropped rather than restyled, which also
 * takes a GSAP timeline and four preloaded videos off the homepage.
 */
export default function CollectionPillRail() {
  return (
    <ul className="flex flex-wrap items-center gap-2 md:gap-2.5">
      {collectionPills.map((pill) => (
        <li key={pill.title}>
          <Link
            href={pill.handle ? `/search/${pill.handle}` : "/search"}
            prefetch={false}
            className="pill"
          >
            {pill.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
