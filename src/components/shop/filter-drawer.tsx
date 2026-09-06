"use client";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { AdjustmentsHorizontalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";

/**
 * The sidebar, on a phone.
 *
 * It renders the very same panel: the filters are a server-rendered subtree
 * handed in as `children`, so there is exactly one implementation of a filter
 * row and no chance of the two surfaces drifting apart.
 */

type DrawerProps = {
  activeCount: number;
  /** Live count, so the drawer says what applying the filters just did. */
  resultLabel: string;
  children: React.ReactNode;
};

function Drawer({ activeCount, resultLabel, children }: DrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="ui-mono flex items-center gap-2 rounded-chip border border-ink/15 bg-card px-4 py-2 transition-colors hover:border-ink lg:hidden"
      >
        <AdjustmentsHorizontalIcon aria-hidden className="h-4 w-4" />
        <span className="font-semibold">Filters</span>
        {activeCount ? (
          <span className="badge bg-ink text-paper">{activeCount}</span>
        ) : null}
      </button>

      <Transition show={isOpen}>
        <Dialog
          onClose={() => setIsOpen(false)}
          className="relative z-[1000] lg:hidden"
        >
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
              className="fixed inset-y-0 left-0 flex w-full max-w-sm flex-col bg-paper"
            >
              <div className="rule-b flex items-center justify-between px-5 py-4">
                <DialogTitle className="eyebrow">Filter</DialogTitle>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close filters"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8">{children}</div>

              <div className="rule-t px-5 py-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-solid w-full"
                >
                  Show {resultLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}

/**
 * Filtering navigates, and an open drawer would then sit over the result the
 * shopper just asked for. Keying the drawer on the URL discards its open state
 * the moment the URL changes, which is the same thing an effect would do
 * without the extra render pass - and it cannot fall out of step, because
 * "which URL is this drawer for" is the key itself.
 */
export default function FilterDrawer(props: DrawerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return <Drawer key={`${pathname}?${searchParams}`} {...props} />;
}
