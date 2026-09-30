"use client";

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useId, useState } from "react";
import NewsletterPostcard from "./newsletter-postcard";
import NewsletterTeaser from "./newsletter-teaser";
import {
  closeTeaser,
  suppressed,
  useNewsletterState,
  writeRecord,
} from "./newsletter-state";

/**
 * The newsletter postcard, as an arrival popup - and the corner teaser it
 * collapses into once it has been closed.
 *
 * The card asks once. Fifteen seconds after the visitor lands, or the moment
 * they steer for the tab bar, whichever comes first - long enough that the
 * curtain has lifted and they have chosen to stay, short enough that they are
 * still on the page they arrived on.
 *
 * What stops it being a nuisance:
 *   - it asks once. Subscribing silences it permanently, dismissing it silences
 *     it for a month;
 *   - it waits for a visible tab, so a link opened in the background does not
 *     spend its one showing on nobody;
 *   - it does not appear where an interruption would be actively unhelpful -
 *     mid-enquiry, or inside an account;
 *   - closing it leaves the offer on the page as a corner tab rather than
 *     taking it away for a month. Most people who close a card that landed
 *     mid-scroll mean "later", and until this there was no later.
 *
 * Headless UI's `Dialog` supplies the parts a popup must not get wrong: focus
 * moves into the card and is trapped there, Escape closes, the rest of the page
 * is inert and hidden from assistive tech, and focus returns on close.
 *
 * State lives in `newsletter-state.ts`, shared with the footer form - see the
 * header there for why all three surfaces have to read the same record.
 */

const DELAY_MS = 15_000;

/**
 * How far up the cursor has to leave before it counts as leaving the page.
 * A pointer crossing the top edge is heading for the tab strip, the address bar
 * or the close button; one leaving through a side or the bottom is reaching for
 * a scrollbar or another window, and is not a departure.
 */
const EXIT_INTENT_CEILING = 0;

/**
 * Pages where the popup stays shut. Someone writing an enquiry or signed into
 * their account is mid-task, and a card over that is an obstacle rather than an
 * offer. Prefix-matched, so nested routes are covered too.
 */
const QUIET_PATHS = ["/contact", "/account"];

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const headingId = useId();
  const pathname = usePathname();
  const { record, teaserClosed, ready } = useNewsletterState();

  const quiet = QUIET_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    if (quiet || suppressed()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let spent = false;

    const open = () => {
      if (spent) return;
      // Re-checked at fire time: fifteen seconds is long enough for the visitor
      // to have subscribed from the footer form in another tab.
      if (suppressed()) return;
      spent = true;
      setIsOpen(true);
    };

    const schedule = () => {
      if (document.hidden) return;
      timer = setTimeout(open, DELAY_MS);
    };

    // A tab opened in the background gets its countdown when it is first
    // looked at, not while it sits unseen behind another one.
    const onVisibility = () => {
      if (document.hidden) {
        clearTimeout(timer);
        timer = undefined;
      } else if (!timer) {
        schedule();
      }
    };

    // Exit intent, on a fine pointer only. A touch screen has no hover, so
    // mouseout there fires on taps and would spring the card on the first one.
    // Bound to the document: a null relatedTarget is what distinguishes the
    // pointer leaving the document from it crossing between two elements.
    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget) return;
      if (event.clientY > EXIT_INTENT_CEILING) return;
      clearTimeout(timer);
      timer = undefined;
      open();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (fine.matches) document.addEventListener("mouseout", onMouseOut);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("mouseout", onMouseOut);
    };
    // Deliberately keyed on `quiet` alone: the countdown belongs to the visit,
    // not to the page, so browsing around does not restart it.
  }, [quiet]);

  const dismiss = useCallback(() => {
    writeRecord("dismissed");
    setIsOpen(false);
  }, []);

  const subscribed = useCallback(() => {
    writeRecord("subscribed");
    // Held open briefly so the "posted." confirmation is actually read - a card
    // that vanishes the instant the button is pressed reads as a failure.
    setTimeout(() => setIsOpen(false), 2600);
  }, []);

  /**
   * The teaser stands in for the card exactly while the card is quiet but the
   * offer is still open: dismissed rather than answered, inside the snooze, not
   * waved off for this session, and not on a page that wants no interruption.
   *
   * `ready` gates it because neither store is readable on the server. Without
   * it the first paint would carry a tab the client then has to remove.
   */
  const showTeaser =
    ready &&
    !quiet &&
    !isOpen &&
    !teaserClosed &&
    record?.state === "dismissed" &&
    suppressed(record);

  return (
    <>
      <Transition show={isOpen}>
        <Dialog
          onClose={dismiss}
          aria-labelledby={headingId}
          className="relative z-[1100]"
        >
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-editorial duration-500"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-editorial duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
              aria-hidden
            />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto p-6">
            <div className="flex min-h-full items-center justify-center">
              <TransitionChild
                as={Fragment}
                enter="transition duration-500 ease-editorial"
                enterFrom="opacity-0 translate-y-6 scale-[0.97]"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="transition duration-300 ease-editorial"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-4 scale-[0.98]"
              >
                <DialogPanel
                  className="newsletter-popup-panel relative w-full"
                  data-lenis-prevent
                >
                  <div className="newsletter-popup-content">
                    <NewsletterPostcard
                      onSubscribed={subscribed}
                      headingId={headingId}
                    />
                  </div>

                  {/* Parked on the envelope's corner rather than inside the card:
                      the card is the note, and a close control printed on a note
                      is not a thing that exists. */}
                  <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Close"
                    className="absolute -right-2 -top-2 grid h-11 w-11 place-items-center rounded-full bg-[#fffaf1] text-[#163e79] shadow-chip transition-transform hover:scale-105 motion-reduce:transition-none"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {showTeaser ? (
        <NewsletterTeaser onOpen={() => setIsOpen(true)} onClose={closeTeaser} />
      ) : null}
    </>
  );
}
