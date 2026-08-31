import { getMenu } from "@/lib/shopify";
import { Menu } from "@/lib/shopify/types";
import Link from "next/link";
import LogoSquare from "@/components/logo-square";
import Newsletter from "@/components/ui/newsletter";
import Marquee from "@/components/ui/marquee";
import { footerColumns, shippingTicker, site, socialLinks } from "@/lib/site";

/**
 * Footer (DESIGN.md §5): a shipping ticker, the newsletter line, hairline
 * columns, a legal row with payment marks, and then the brand statement set at
 * hero scale and clipped by the viewport - the closing gesture of the page.
 */
export default async function Footer() {
  // Shopify owns the legal/policy links; the rest of the footer is editorial.
  const legalMenu: Menu[] = await getMenu("next-js-footer-menu");
  const year = new Date().getFullYear();

  return (
    <footer className="rule-t">
      <div className="rule-b py-2">
        <Marquee
          phrases={Array.from({ length: 6 }, () => shippingTicker)}
          size="ui"
          duration={55}
          className="text-oxblood"
        />
      </div>

      {/* Newsletter line */}
      <div className="shell rule-b flex flex-col gap-6 py-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="serif text-display-lg">Join the inner circle</h2>
          <p className="body-mono mt-2 max-w-measure">
            Receive curated interior styling notes and early access to new releases.
          </p>
        </div>
        <Newsletter className="md:max-w-sm" />
      </div>

      {/* Hairline columns */}
      <div className="rule-b grid grid-cols-1 divide-y divide-rule md:grid-cols-4 md:divide-x md:divide-y-0">
        <div className="flex items-center justify-center px-5 py-8 md:justify-start">
          <Link href="/" aria-label={`${site.name} home`}>
            <LogoSquare size="lg" />
          </Link>
        </div>

        <div className="px-5 py-8">
          <p className="body-mono">
            Thoughtfully designed and handcrafted in {site.origin}. Mindful living since{" "}
            {site.since}.
          </p>
        </div>

        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="px-5 py-8">
            <ul className="space-y-1.5">
              {column.links.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.path}
                    className="ui-mono transition-opacity hover:opacity-60"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Legal + social */}
      <div className="shell rule-b flex flex-col gap-5 py-6 md:flex-row md:items-center md:justify-between">
        <div className="micro-mono space-y-1">
          <p>
            &copy; {year} {site.name}
          </p>
          {legalMenu.length ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {legalMenu.map((item) => (
                <li key={item.title}>
                  <Link href={item.path} className="hover:opacity-60">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>Powered by Shopify</p>
          )}
        </div>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {socialLinks.map((social) => (
            <li key={social.title}>
              <a
                href={social.href}
                rel="noreferrer noopener"
                target="_blank"
                className="micro-mono transition-opacity hover:opacity-60"
              >
                {social.title}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Closing statement - clipped by the viewport, as in the reference. */}
      <div className="overflow-hidden py-6">
        <p aria-hidden className="serif select-none whitespace-nowrap text-center text-display-hero leading-none">
          {site.statement}
        </p>
      </div>
    </footer>
  );
}
