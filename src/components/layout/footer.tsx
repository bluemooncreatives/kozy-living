import {
  getCollections,
  getFooterMenu,
  getShopPolicyNames,
  isFrameworkControlFlowError,
} from "@/lib/shopify";
import type { Menu } from "@/lib/shopify/types";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import BackToTop from "@/components/ui/back-to-top";
import WordmarkBand from "@/components/ui/wordmark-band";
import { footer, site } from "@/lib/site";

/**
 * The footer, on the page's cream ground, read top to bottom in the order a
 * visitor needs it. The newsletter is NOT in here - it stands above the footer as its
 * own indigo card (`NewsletterBand`), so the footer does one job: navigation.
 *
 *   main      the brand block (tagline, a line of voice, Instagram) beside
 *             the menu as plain columns
 *   wordmark  "kozy living" with the textile O as an endless full-bleed
 *             ticker, shown whole
 *   legal     copyright, the shop policies, the origin flag, back to top
 *
 * EVERY LINK IS SHOPIFY'S. The columns are the `kozy-living-footer` menu
 * (`getFooterMenu`), with no fallback list in this repo: an item WITH
 * children is a column headed by its own title; items WITHOUT children (Home,
 * Contact Us) are gathered into one last column under the brand name. The
 * legal row is whichever policies the merchant has written.
 *
 * Plain headings and sentence-case links, on purpose: an earlier version
 * headed each column with a pill and set the links in small tracked caps,
 * and the pills read as buttons while the caps read slowly. The standalone
 * items were CTA pills under the seal, which looked like a second menu.
 */
export default async function Footer() {
  const degrade =
    <T,>(fallback: T) =>
    (error: unknown) => {
      if (isFrameworkControlFlowError(error)) throw error;
      console.error("Footer: a Shopify read failed", error);
      return fallback;
    };

  const [menu, collections, policies] = await Promise.all([
    getFooterMenu().catch(degrade<Menu[]>([])),
    getCollections().catch(degrade<{ path: string }[] | null>(null)),
    getShopPolicyNames().catch(
      degrade<{ handle: string; title: string }[] | null>(null),
    ),
  ]);

  /* Guard every collection and policy link against what actually exists.
     This storefront 404s an unknown collection, the menu is hand-maintained
     in Admin, and a footer is exactly where a dead link sits unnoticed for
     months. When a lookup itself failed the guard stands down (null) rather
     than stripping the whole footer bare. */
  const liveCollections = collections
    ? new Set(collections.map((collection) => collection.path))
    : null;
  const livePolicies = policies
    ? new Set(policies.map((policy) => `/policies/${policy.handle}`))
    : null;

  const reachable = (path: string) => {
    if (path.startsWith("/search/")) return liveCollections?.has(path) ?? true;
    if (path.startsWith("/policies/")) return livePolicies?.has(path) ?? true;
    return true;
  };

  const columns: Column[] = [];
  const leaves: Menu[] = [];

  for (const item of menu) {
    const children = (item.items ?? []).filter((child) =>
      reachable(child.path),
    );
    const parentLive = reachable(item.path);

    if (children.length) {
      columns.push({
        title: item.title,
        path: parentLive ? item.path : null,
        links: children,
      });
    } else if (parentLive) {
      leaves.push(item);
    }
  }

  // The standalone items close the index as one more column.
  if (leaves.length) {
    columns.push({ title: footer.more, path: null, links: leaves });
  }

  const year = new Date().getFullYear();
  const { brand } = footer;

  return (
    <footer className="rule-t mt-10">
      <div className="footer-panel shell">
        {/* --------------------------------------------------------- main */}
        <div className="footer-main">
          <div className="footer-brand" data-reveal>
            <p className="footer-brand-heading">{brand.heading}</p>
            <p className="spec-mono mt-3 max-w-[22rem]">{brand.body}</p>
            <a
              href={brand.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${brand.follow} on Instagram, ${brand.handle}`}
              className="footer-social"
            >
              <InstagramGlyph />
              <Roll text={brand.handle} />
            </a>
          </div>

          {columns.length ? (
            <nav aria-label="Footer" className="footer-nav">
              {/* md and up: every column open. */}
              <div
                className="footer-index"
                data-reveal-group
                style={
                  {
                    "--cols": Math.min(columns.length, 6),
                  } as React.CSSProperties
                }
              >
                {columns.map((column, index) => (
                  <div key={`${index}-${column.title}`}>
                    <ColumnHead column={column} />
                    <ul className="mt-4 space-y-2.5">
                      {column.links.map((link, linkIndex) => (
                        <li key={`${linkIndex}-${link.path}`}>
                          <FooterLink item={link} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Phones: the same columns, folded. `<details>` so it works
                  before hydration and with JS off; `name` makes them an
                  exclusive set where supported (one open at a time). */}
              <div className="footer-folds">
                {columns.map((column, index) => (
                  <details
                    key={`${index}-${column.title}`}
                    name="footer-index"
                    className="footer-fold"
                  >
                    <summary>
                      <span className="footer-col-head">{column.title}</span>
                      <span aria-hidden className="footer-fold-icon" />
                    </summary>
                    <ul className="space-y-3 pb-5">
                      {column.path ? (
                        <li>
                          <FooterLink
                            item={{
                              title: `${footer.explore} ${column.title}`,
                              path: column.path,
                            }}
                            lead
                          />
                        </li>
                      ) : null}
                      {column.links.map((link, linkIndex) => (
                        <li key={`${linkIndex}-${link.path}`}>
                          <FooterLink item={link} />
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </nav>
          ) : null}
        </div>
      </div>

      {/* ----------------------------------------------------- wordmark
          An endless ticker of the mark, full bleed and shown whole. Two
          identical runs so the -50% loop in `.marquee-track` has no seam;
          the motion layer speeds every track up with scroll velocity, and
          reduced motion stops it. Decorative - the brand name is the
          copyright line below. */}
      <div aria-hidden className="footer-wordmark">
        <div className="marquee-track">
          {[0, 1].map((run) => (
            <div key={run} className="flex shrink-0 items-center">
              {[0, 1, 2].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center">
                  {/* "top bottom": the default 92% can be out of reach this
                      close to the end of the page - see `data-split-start`. */}
                  <WordmarkBand
                    text={footer.wordmark}
                    revealStart="top bottom"
                  />
                  <span className="footer-wordmark-sep">
                    {/* The block-printed K - the same textile artwork as
                        the O, and the category rail's separator. One src
                        for all six copies, so one request. */}
                    <Image
                      src="/kozy/k.png"
                      alt=""
                      width={178}
                      height={192}
                      sizes="96px"
                      className="footer-wordmark-k"
                    />
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="shell">
        {/* -------------------------------------------------------- legal */}
        <div className="footer-legal">
          <p className="spec-mono">
            &copy;{year} {site.name}. {footer.copyright}
          </p>
          {policies?.length ? (
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {policies.map((policy) => (
                <li key={policy.handle}>
                  <FooterLink
                    item={{
                      title: policy.title,
                      path: `/policies/${policy.handle}`,
                    }}
                    small
                  />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="eyebrow">{footer.stamp}</p>
          <div className="footer-top">
            <BackToTop size="sm" />
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------------- pieces */

type Column = {
  title: string;
  /** The column's own page, or null when it has none (or it is gone). */
  path: string | null;
  links: Menu[];
};

function ColumnHead({ column }: { column: Column }) {
  return column.path ? (
    <Link href={column.path} className="footer-col-head footer-col-head-link">
      {column.title}
    </Link>
  ) : (
    <p className="footer-col-head">{column.title}</p>
  );
}

/**
 * The label roll used by every footer link: the copy slides up out of its
 * slot and an identical one rolls in beneath it - the same gesture as
 * `ActionButton`, so links and buttons answer a pointer the same way. The
 * copy beneath is generated content with empty alt text, so it is never
 * announced twice (see `.action-btn-roll`).
 */
function Roll({ text }: { text: string }) {
  return (
    <span className="footer-roll">
      <span data-text={text}>{text}</span>
    </span>
  );
}

/** A menu link: `<Link>` inside the app, a new tab for anything off-site. */
function FooterLink({
  item,
  lead = false,
  small = false,
}: {
  item: Pick<Menu, "title" | "path">;
  lead?: boolean;
  small?: boolean;
}) {
  const external = /^(https?:)?\/\//.test(item.path);
  const className = clsx(
    "footer-link",
    lead && "footer-link-lead",
    small && "footer-link-sm",
  );

  return external ? (
    <a
      href={item.path}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <Roll text={item.title} />
    </a>
  ) : (
    <Link href={item.path} className={className}>
      <Roll text={item.title} />
    </Link>
  );
}

function InstagramGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-[1.1em] w-[1.1em] flex-none"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
