"use client";

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import NewsletterPostcard from "./newsletter-postcard";

/**
 * The newsletter postcard, as an arrival popup.
 *
 * Fifteen seconds after the visitor lands - long enough that the curtain has
 * lifted and they have chosen to stay, short enough that they are still on the
 * page they arrived on.
 *
 * What stops it being a nuisance:
 *   - it asks once. Subscribing silences it permanently, dismissing it silences
 *     it for a month;
 *   - it waits for a visible tab, so a link opened in the background does not
 *     spend its one showing on nobody;
 *   - it does not appear where an interruption would be actively unhelpful -
 *     mid-enquiry, or inside an account.
 *
 * Headless UI's `Dialog` supplies the parts a popup must not get wrong: focus
 * moves into the card and is trapped there, Escape closes, the rest of the page
 * is inert and hidden from assistive tech, and focus returns on close.
 */

const DELAY_MS = 15_000;

const STORAGE_KEY = "kozy:newsletter";

/** How long a dismissal holds before the card may ask again. */
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Pages where the popup stays shut. Someone writing an enquiry or signed into
 * their account is mid-task, and a card over that is an obstacle rather than an
 * offer. Prefix-matched, so nested routes are covered too.
 */
const QUIET_PATHS = ["/contact", "/account"];

type Record_ = { state: "subscribed" | "dismissed"; at: number };

/**
 * localStorage, defensively. Private browsing, blocked site data and a full
 * quota all throw on access rather than returning empty, and a popup must
 * never be the thing that takes the page down.
 */
function readRecord(): Record_ | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record_) : null;
  } catch {
    return null;
  }
}

function writeRecord(state: Record_["state"]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state, at: Date.now() } satisfies Record_)
    );
  } catch {
    // Nothing to do. The visitor sees the card again next session, which is a
    // far smaller problem than a thrown error here.
  }
}

function suppressed(): boolean {
  const record = readRecord();
  if (!record) return false;
  if (record.state === "subscribed") return true;
  return Date.now() - record.at < SNOOZE_MS;
}

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const quiet = QUIET_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  useEffect(() => {
    if (quiet || suppressed()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const open = () => {
      // Re-checked at fire time: fifteen seconds is long enough for the visitor
      // to have subscribed from the footer form in another tab.
      if (!suppressed()) setIsOpen(true);
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

    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
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

  return (
    <Transition show={isOpen}>
      <Dialog onClose={dismiss} className="relative z-[1100]">
        <TransitionChild
          as={Fragment}
          enter="transition-opacity ease-editorial duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-editorial duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" aria-hidden />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto p-4">
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
              <DialogPanel className="relative w-full max-w-[34rem]">
                <NewsletterPostcard onSubscribed={subscribed} />

                {/* Parked on the envelope's corner rather than inside the card:
                    the card is the note, and a close control printed on a note
                    is not a thing that exists. */}
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Close"
                  className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-chip bg-cream text-ink shadow-chip transition-transform hover:scale-105"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
