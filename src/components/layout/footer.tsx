import { getMenu, isFrameworkControlFlowError } from "@/lib/shopify";
import { Menu } from "@/lib/shopify/types";
import Link from "next/link";
import LogoSquare from "@/components/logo-square";
import Newsletter from "@/components/ui/newsletter";
import BackToTop from "@/components/ui/back-to-top";
import { displayFace } from "@/components/ui/section";
import clsx from "clsx";
import { footerColumns, legalLinks, site } from "@/lib/site";

/**
 * Footer: the newsletter line, four tracked-out link columns with the rotating
 * seal parked at the right edge as the back-to-top control, then a thin legal
 * rule - logo left, copyright centred, policies right.
 *
 * No giant closing wordmark here: the homepage's "shop now" band already plays
 * that card immediately above, and repeating it would blunt both.
 */
export default async function Footer() {
  // Shopify owns the legal/policy links; the rest of the footer is editorial.
  const legalMenu: Menu[] = await getMenu("next-js-footer-menu").catch(
    (error) => {
      if (isFrameworkControlFlowError(error)) throw error;
      return [];
    }
  );
  const links = legalMenu.length ? legalMenu : legalLinks;
  const year = new Date().getFullYear();

  return (
    <footer className="rule-t mt-6">
      {/* Newsletter */}
      <div className="shell rule-b flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between md:py-14">
        <div>
          <h2 className={clsx(displayFace, "text-display-lg")}>
            Join the inner circle
          </h2>
          <p className="body-mono mt-3 max-w-measure">
            Styling notes from the studio and first look at every new piece.
          </p>
        </div>
        <Newsletter className="md:max-w-md" />
      </div>

      {/* Link columns + the seal */}
      <div className="shell relative grid grid-cols-2 gap-x-8 gap-y-10 py-10 md:grid-cols-4 md:py-14 lg:pr-40">
        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="eyebrow text-muted">{column.title}</p>
            <ul className="mt-5 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.path}
                    className="micro-mono transition-opacity hover:opacity-55"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="absolute bottom-10 right-4 hidden lg:block">
          <BackToTop />
        </div>
      </div>

      {/* Legal rule */}
      <div className="shell rule-t flex flex-col items-center gap-4 py-6 md:flex-row md:justify-between">
        <Link href="/" aria-label={`${site.name} home`}>
          <LogoSquare size="sm" />
        </Link>

        <p className="micro-mono text-muted">
          &copy;{year} {site.name}. All rights reserved.
        </p>

        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <li key={link.title}>
              <Link
                href={link.path}
                className="micro-mono transition-opacity hover:opacity-55"
              >
                {link.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
