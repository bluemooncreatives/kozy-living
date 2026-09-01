import { getMenu } from "@/lib/shopify";
import { Menu } from "@/lib/shopify/types";
import MobileMenu from "./mobile-menu";
import DesktopMenu from "./desktop-menu";
import SearchTrigger from "./search";
import LogoSquare from "@/components/logo-square";
import CartModal from "@/components/cart/modal";
import Marquee from "@/components/ui/marquee";
import { getCustomerSession } from "@/lib/customer-account";
import { announcement, primaryNav, site } from "@/lib/site";
import Link from "next/link";

/**
 * Header (DESIGN.md §5): a scrolling announcement strip over a three-part nav -
 * menu left, logo optically centred, utilities right. Hairline bottom, sticky
 * as one unit so `--header-h` stays the single offset for sticky children.
 */
export async function Navbar() {
  const shopifyMenu = await getMenu("kozy-living-menu")
    .catch(() => getMenu("main-menu"))
    .catch((error) => {
      console.error("Failed to load the Shopify navigation", error);
      return [] as Menu[];
    });
  const customerSession = await getCustomerSession();

  // Shopify owns the menu when it is configured; the site config is the
  // fallback so the nav is never empty on a fresh store.
  const menu: Menu[] = shopifyMenu.length ? shopifyMenu : primaryNav;

  return (
    <header className="sticky top-0 z-[999] bg-paper">
      {/* Inverted from the rest of the header: oxblood fill, paper text - the
          announcement strip is meant to read as a banner, not body copy. */}
      <div className="on-dark border-b border-ink/30 bg-ink py-2">
        <Marquee
          phrases={Array.from({ length: 6 }, () => announcement)}
          size="ui"
          separator=""
          duration={60}
          className="text-paper"
        />
      </div>

      <nav className="rule-b bg-paper/95 backdrop-blur-md">
        <div className="shell relative flex h-16 items-center justify-between gap-4">
          {/* Left rail */}
          <div className="flex items-center gap-6">
            <div className="md:hidden">
              <MobileMenu menu={menu} />
            </div>
            <DesktopMenu menu={menu} />
          </div>

          {/* Optically centred mark, independent of the rails' widths. */}
          <Link
            href="/"
            prefetch
            aria-label={`${site.name} home`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <LogoSquare />
          </Link>

          {/* Right rail */}
          <div className="flex items-center gap-6">
            <SearchTrigger />
            <Link
              href={
                customerSession.isAuthenticated
                  ? "/account"
                  : "/api/auth/login?returnTo=/account"
              }
              className="ui-mono hidden transition-opacity hover:opacity-60 lg:block"
            >
              {customerSession.isAuthenticated ? "Account" : "Sign in"}
            </Link>
            <CartModal />
          </div>
        </div>
      </nav>
    </header>
  );
}
