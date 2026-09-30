"use client";

import { EnvelopeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCart } from "@/components/cart/cart-context";
import { newsletter } from "@/lib/site";

/**
 * What the ritual card collapses into when it is closed unanswered.
 *
 * The arrival popup gets one showing. Without this, closing it is final for a
 * month - including for the visitor who closed it because they were mid-scroll
 * and meant "later", which is most of them. The teaser is the standard answer
 * (Klaviyo ships the same three-step popup/success/teaser shape): the offer
 * stops interrupting and becomes a standing affordance parked out of the way,
 * so coming back to it is one tap rather than a page reload.
 *
 * It is deliberately NOT the rotating seal. That mark appears over the hero
 * wordmark, over the closing CTA and as back-to-top, and nowhere else - a
 * fourth one stuck in a corner is what turns a stamp into decoration. This
 * borrows `.cat-pill`'s silhouette instead: label, then a circular icon well
 * socketed into the end, in the pill's own hover colours (indigo ground, sage
 * well, oat label at 9.30).
 *
 * The close control is a sibling parked on the corner, matching the card's
 * own - and closing it only quiets it for this browsing session, because
 * "not while I am reading this" is a smaller statement than the month-long
 * snooze that dismissing the card itself records.
 */
export default function NewsletterTeaser({
  onOpen,
  onClose,
}: {
  onOpen: () => void;
  onClose: () => void;
}) {
  const { cart } = useCart();

  // The mobile cart bar is fixed to the same edge, full width, and taller than
  // this tab - so with anything in the cart the tab would simply be behind it.
  const aboveCartBar = (cart?.totalQuantity ?? 0) > 0;

  return (
    <div
      className="newsletter-teaser"
      data-above-cart-bar={aboveCartBar ? "" : undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        className="newsletter-teaser-tab"
        aria-label={newsletter.teaser.open}
      >
        <span className="newsletter-teaser-label">
          {newsletter.teaser.label}
        </span>
        <span className="newsletter-teaser-icon" aria-hidden="true">
          <EnvelopeIcon className="h-4 w-4" />
        </span>
      </button>

      <button
        type="button"
        onClick={onClose}
        className="newsletter-teaser-close"
        aria-label={newsletter.teaser.close}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
