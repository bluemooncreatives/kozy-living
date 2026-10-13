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
 * either side of a centred logo, so on desktop the logo leads the row and the
 * MENU is what is centred, between the logo and the utilities (see the grid
 * on the row). Phones keep the centred mark, where it fits and reads best.
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
          <p className="text-spec text-paper/85">{announcement}</p>
        </div>
      </div>

      <nav className="rule-t rule-b" aria-label="Primary">
        {/* lg and up: logo | menu | utilities on a three-column grid whose
            side columns grow EQUALLY (minmax(max-content, 1fr)), so the menu
            sits at the true centre of the row whenever there is room. Where
            there is not - seven items at 1024px - the sides shrink to their
            content and the menu slides over rather than overlapping either
            neighbour. Absolute centring overlapped the logo there. */}
        <div className="shell relative flex h-16 items-center gap-4 lg:grid lg:h-[4.5rem] lg:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] lg:gap-8">
          {/* Below lg this is the only nav affordance; from lg it disappears
              and DesktopMenu takes over. */}
          <MobileMenu menu={menu} />

          <Link
            href="/"
            prefetch
            aria-label={`${site.name} home`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0 lg:justify-self-start"
          >
            <LogoSquare />
          </Link>

          <DesktopMenu menu={menu} />

          <div className="ml-auto flex items-center gap-2 sm:gap-3 md:gap-4">
            <SearchTrigger menu={menu} />
            <CartModal />
            <Link
              href={
                customerSession.isAuthenticated
                  ? "/account"
                  : "/api/auth/login?returnTo=/account"
              }
              // Never prefetched. Signed out, this is a route handler that
              // mints a fresh PKCE verifier + state cookie and redirects to
              // Shopify - so a prefetch on every page view ran the login flow
              // for every visitor, failed CORS on the cross-origin redirect,
              // and could overwrite the verifier of a sign-in already in
              // progress in another tab, breaking its callback.
              prefetch={false}
              aria-label={
                customerSession.isAuthenticated ? "Account" : "Sign in"
              }
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-ink/15 bg-card transition-colors hover:bg-ink hover:text-paper"
            >
              <UserIcon aria-hidden className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

export type { Menu };
