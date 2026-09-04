import { getPrimaryMenu } from "@/lib/shopify";
import { Menu } from "@/lib/shopify/types";
import MobileMenu from "./mobile-menu";
import DesktopMenu from "./desktop-menu";
import SearchTrigger from "./search";
import LogoSquare from "@/components/logo-square";
import CartModal from "@/components/cart/modal";
import { getCustomerSession } from "@/lib/customer-account";
import { announcement, site } from "@/lib/site";
import Link from "next/link";
import { UserIcon } from "@heroicons/react/24/outline";
import HeaderHeight from "./header-height";

/**
 * Header: a quiet announcement line over the navigation.
 *
 * Every link comes from the Shopify menu - there is no hard-coded fallback
 * list. If the menu cannot be read the nav renders empty rather than showing
 * links to routes the store may not have.
 *
 * LAYOUT NOTE: the mark is optically centred below `lg` and moves to the left
 * rail at `lg` and up. A seven-item menu with two flyouts simply does not fit
 * either side of a centred logo - at 1440px the items alone measure wider than
 * the space between the logo and the utilities - so on desktop the logo leads
 * the row and the menu runs from it. Phones keep the centred mark, where it
 * fits and reads best.
 */
export async function Navbar() {
  const [menu, customerSession] = await Promise.all([
    getPrimaryMenu(),
    getCustomerSession(),
  ]);

  return (
    <header
      data-site-header
      className="sticky top-0 z-[999] bg-paper/95 backdrop-blur-md"
    >
      <HeaderHeight />
      {/* Full-bleed indigo, so the strip reads as a band rather than as a
          line of muted copy floating above the nav. Ivory on indigo is 11.73. */}
      <div className="bg-indigo">
        <div className="shell py-2 text-center">
          <p className="text-spec text-ivory/85">{announcement}</p>
        </div>
      </div>

      <nav className="rule-t rule-b" aria-label="Primary">
        <div className="shell relative flex h-14 items-center gap-4">
          {/* Below lg this is the only nav affordance; from lg it disappears
              and DesktopMenu takes over. */}
          <MobileMenu menu={menu} />

          <Link
            href="/"
            prefetch
            aria-label={`${site.name} home`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0"
          >
            <LogoSquare />
          </Link>

          <DesktopMenu menu={menu} />

          <div className="ml-auto flex items-center gap-3 md:gap-4">
            <SearchTrigger menu={menu} />
            <CartModal />
            <Link
              href={
                customerSession.isAuthenticated
                  ? "/account"
                  : "/api/auth/login?returnTo=/account"
              }
              aria-label={
                customerSession.isAuthenticated ? "Account" : "Sign in"
              }
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-card transition-colors hover:bg-ink hover:text-paper"
            >
              <UserIcon aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

export type { Menu };
