"use client";

import { Menu } from "@/lib/shopify/types";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import {
  ArrowUpRightIcon,
  Bars3Icon,
  ChevronDownIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useId, useState } from "react";
import { SearchBar } from "./search";
import { navDrawer, site } from "@/lib/site";
import LogoSquare from "@/components/logo-square";

/** `/search/pillows/` and `/search/pillows?sort=x` are the same place. */
const clean = (path: string) => path.split(/[?#]/)[0]!.replace(/(.)\/$/, "$1");

const isHere = (path: string, pathname: string) =>
  clean(path) === clean(pathname);

/** A section is "here" when the page is the section itself or one of its children. */
const holdsHere = (item: Menu, pathname: string) =>
  isHere(item.path, pathname) ||
  (item.items ?? []).some((child) => isHere(child.path, pathname));

/**
 * The phone navigation drawer.
 *
 * AN ACCORDION, NOT A SITEMAP. It used to print every section fully open:
 * seven headings and ~25 links, two screens of scrolling, with Bathrobes,
 * Slippers, Pillows and Ritual Kits repeated three times over because the
 * Shopify menu nests them under Shop, Krafted by Kozy AND Kessentials. Now
 * one section opens at a time, and the section holding the current page opens
 * on its own, so the drawer arrives showing where you are.
 *
 * A heading with children is a TOGGLE, not a link: on a phone the whole row
 * is the obvious thing to tap, and a row that navigated when you meant to
 * expand it (or the reverse) is the classic drawer mistake. The section's own
 * page is the first thing inside it, as "Explore …", so nothing is lost.
 *
 * Every tap target is at least 44px, where the sub-links were ~24px of text.
 *
 * CLOSES ON NAVIGATION, whatever caused it. The open state is the pathname
 * it was opened on, so any route change - a link here, a search result,
 * the back button - closes the drawer without an effect. Previously picking
 * a search result navigated underneath a drawer that stayed open.
 *
 * The menu itself is Shopify's (see CLAUDE.md §4) - there is deliberately no
 * hard-coded list here.
 */
export default function MobileMenu({ menu }: { menu: Menu[] }) {
  const pathname = usePathname() ?? "/";
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isOpen = openOn === pathname;
  const close = () => setOpenOn(null);
  const baseId = useId();

  const open = () => {
    // Arrive with the current page's section already open.
    setExpanded(menu.find((item) => item.items?.length && holdsHere(item, pathname))?.title ?? null);
    setOpenOn(pathname);
  };

  return (
    <>
      <button
        onClick={open}
        aria-label={navDrawer.open}
        aria-expanded={isOpen}
        className="-ml-2 flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-60 lg:hidden"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      <Transition show={isOpen}>
        <Dialog onClose={close} className="relative z-[1000]">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-indigo/55" aria-hidden />
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="transition-transform ease-editorial duration-500"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <DialogPanel
              data-lenis-prevent
              className="drawer fixed inset-y-0 left-0 flex w-full max-w-md flex-col overflow-y-auto overscroll-contain bg-paper"
            >
              {/* Sticky, so closing never means scrolling back up first. */}
              <div className="drawer-head">
                <Link
                  href="/"
                  onClick={close}
                  aria-label={`${site.name} home`}
                  className="flex h-11 items-center"
                >
                  <LogoSquare size="sm" />
                </Link>
                <button
                  onClick={close}
                  aria-label={navDrawer.close}
                  className="drawer-icon-btn"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 pb-2 pt-5">
                <SearchBar />
              </div>

              <nav aria-label="Main" className="px-5 pt-3">
                <ul className="flex flex-col">
                  {menu.map((item, i) => {
                    const children = item.items ?? [];
                    const here = holdsHere(item, pathname);
                    const style = { "--i": i } as React.CSSProperties;

                    if (!children.length) {
                      return (
                        <li key={item.title} className="drawer-item" style={style}>
                          <Link
                            href={item.path}
                            onClick={close}
                            aria-current={isHere(item.path, pathname) ? "page" : undefined}
                            className="drawer-row"
                          >
                            <span className={clsx("drawer-title", here && "is-here")}>
                              {item.title}
                            </span>
                            <ArrowUpRightIcon aria-hidden className="drawer-row-icon" />
                          </Link>
                        </li>
                      );
                    }

                    const isExpanded = expanded === item.title;
                    const panelId = `${baseId}-${i}`;

                    return (
                      <li key={item.title} className="drawer-item" style={style}>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={panelId}
                          onClick={() => setExpanded(isExpanded ? null : item.title)}
                          className="drawer-row"
                        >
                          <span className={clsx("drawer-title", here && "is-here")}>
                            {item.title}
                            <span className="drawer-count" aria-hidden>
                              {children.length}
                            </span>
                          </span>
                          <span
                            aria-hidden
                            className={clsx("drawer-chevron", isExpanded && "is-open")}
                          >
                            <ChevronDownIcon className="h-4 w-4" />
                          </span>
                        </button>

                        {/* Height animates on grid rows (0fr -> 1fr), which
                            needs no measuring and stays correct when the
                            text wraps. `inert` while closed keeps the hidden
                            links out of the tab order. */}
                        <div
                          id={panelId}
                          className={clsx("drawer-panel", isExpanded && "is-open")}
                          inert={!isExpanded}
                        >
                          <div className="drawer-panel-inner">
                            <Link
                              href={item.path}
                              onClick={close}
                              aria-current={isHere(item.path, pathname) ? "page" : undefined}
                              className="drawer-all"
                            >
                              {navDrawer.explore} {item.title}
                              <ArrowUpRightIcon aria-hidden className="h-4 w-4" />
                            </Link>
                            <ul className="drawer-grid">
                              {children.map((child) => (
                                <li key={`${child.title}-${child.path}`}>
                                  <Link
                                    href={child.path}
                                    onClick={close}
                                    aria-current={isHere(child.path, pathname) ? "page" : undefined}
                                    className="drawer-tile"
                                  >
                                    {child.title}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Account and the one confirmed channel, as tap-sized pills.
                  Only Instagram: it is the brand's only verified contact
                  (CLAUDE.md §2) - the Pinterest and YouTube entries this used
                  to list pointed at those sites' home pages. */}
              <div className="drawer-foot">
                <div className="flex flex-wrap gap-2.5">
                  <Link href="/account" onClick={close} className="drawer-pill">
                    <UserIcon aria-hidden className="h-4 w-4" />
                    {navDrawer.account}
                  </Link>
                  <a
                    href={site.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drawer-pill"
                  >
                    Instagram {site.instagram}
                  </a>
                </div>
                <p className="eyebrow mt-6 text-muted">{site.tagline}</p>
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}
