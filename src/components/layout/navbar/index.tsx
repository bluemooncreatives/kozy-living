import { getMenu } from "@/lib/shopify";
import { Menu } from "@/lib/shopify/types";
import MobileMenu from "./mobile-menu";
import DesktopMenu from "./desktop-menu";
import SearchTrigger from "./search";
import LogoSquare from "@/components/logo-square";
import CartModal from "@/components/cart/modal";
import { getCustomerSession } from "@/lib/customer-account";
import { announcement, primaryNav, site } from "@/lib/site";
import Link from "next/link";
import { UserIcon } from "@heroicons/react/24/outline";

/**
 * Header: one quiet centred announcement line over a three-part nav - menu
 * left, wordmark optically centred, utilities right.
 *
 * Deliberately low-contrast and short. The reference gives its header almost
 * no weight so that the hero frame directly beneath it lands as the first real
 * thing on the page; a loud header would compete with the wordmark.
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
    <header className="sticky top-0 z-[999] bg-paper/95 backdrop-blur-md">
      {/* A single static line, centred. No ticker - at this size motion in
          the header only pulls the eye away from the hero. */}
      <div className="shell py-2 text-center">
        <p className="text-spec text-muted">{announcement}</p>
      </div>

      <nav className="rule-t rule-b">
        <div className="shell relative flex h-14 items-center justify-between gap-4">
          {/* Left rail */}
          <div className="flex items-center gap-6">
            <MobileMenu menu={menu} />
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
          <div className="flex items-center gap-3 md:gap-4">
            <SearchTrigger />
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
