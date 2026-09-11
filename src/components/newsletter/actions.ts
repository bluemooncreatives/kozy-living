"use server";

import { z } from "zod";
import {
  ShopifyAdminNotConfiguredError,
  shopifyAdminFetch,
  type ShopifyUserError,
} from "@/lib/shopify/admin";
import {
  createNewsletterCustomerMutation,
  updateEmailMarketingConsentMutation,
} from "@/lib/shopify/mutations/newsletter";
import { getCustomerByEmailQuery } from "@/lib/shopify/queries/customer";
import { clientKey, rateLimited } from "@/lib/rate-limit";
import { contact } from "@/lib/site";

/**
 * Newsletter signup.
 *
 * A server action for the same reasons the contact form is one: the Admin
 * token never leaves the server, there is no public URL to point a script at,
 * and the form still posts without JavaScript.
 *
 * The visitor-facing contract is narrow on purpose - one field, one answer.
 * Everything interesting happens in the Shopify branch below, where an address
 * that already exists is a normal outcome rather than an error.
 */

export type NewsletterState = {
  ok: boolean;
  message: string;
  /** True when the address was already subscribed, so the card can say so. */
  already?: boolean;
} | null;

const NewsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please add an email address.")
    .email("That does not look like an email address.")
    .max(200, "That address is longer than we can store."),
});

const GENERIC_FAILURE = `We couldn't add you just now. Try again in a moment, or write to us at ${contact.email}.`;

/** Every subscriber carries these, so the list is segmentable in Shopify. */
const SUBSCRIBER_TAGS = ["newsletter", "storefront"];

type MarketingState =
  | "SUBSCRIBED"
  | "NOT_SUBSCRIBED"
  | "PENDING"
  | "UNSUBSCRIBED"
  | "REDACTED"
  | "INVALID";

/**
 * Shopify reports a duplicate address as a plain validation message on
 * `customerCreate` - there is no error code to match on, so the message is all
 * we have. Matched loosely, because a wording change upstream must not turn a
 * returning subscriber into a hard failure.
 */
function isTakenError(errors: { field?: string[] | null; message: string }[]) {
  return errors.some(
    (error) =>
      /taken|already/i.test(error.message) &&
      (!error.field || error.field.includes("email"))
  );
}

export async function subscribeToNewsletter(
  _previous: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  // Honeypot. A real person never sees this field, so anything in it is a bot.
  // Answered with the success state: an error teaches the script what to avoid.
  if ((formData.get("company") as string)?.trim()) {
    return { ok: true, message: "You're on the list." };
  }

  if (rateLimited("newsletter", await clientKey())) {
    return {
      ok: false,
      message: "That's a few tries in a row - give it a few minutes.",
    };
  }

  const parsed = NewsletterSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();
  const consent = {
    marketingState: "SUBSCRIBED",
    // SINGLE_OPT_IN, not CONFIRMED: Shopify will not send its confirmation
    // email for an API-created customer, so claiming a confirmed opt-in would
    // record a consent level that nobody ever actually confirmed.
    marketingOptInLevel: "SINGLE_OPT_IN",
    consentUpdatedAt: new Date().toISOString(),
  };

  try {
    const created = await shopifyAdminFetch<{
      customerCreate: {
        customer: { id: string } | null;
        userErrors: { field: string[] | null; message: string }[];
      };
    }>({
      query: createNewsletterCustomerMutation,
      variables: {
        input: { email, tags: SUBSCRIBER_TAGS, emailMarketingConsent: consent },
      },
    });

    const errors = created.customerCreate.userErrors;

    if (created.customerCreate.customer) {
      return { ok: true, message: "You're on the list." };
    }

    // Anything other than a duplicate is ours to fix, not the visitor's.
    if (!isTakenError(errors)) {
      console.error("Newsletter customerCreate rejected by Shopify", errors);
      return { ok: false, message: GENERIC_FAILURE };
    }

    // The address exists: a past purchaser, or someone who unsubscribed and
    // came back. Find them and set consent rather than reporting a failure.
    const found = await shopifyAdminFetch<{
      customers: {
        nodes: {
          id: string;
          emailMarketingConsent: { marketingState: MarketingState } | null;
        }[];
      };
    }>({
      query: getCustomerByEmailQuery,
      // Quoted: an address with a `+` or `-` in it is otherwise parsed as a
      // search operator and matches the wrong customer, or nobody at all.
      variables: { query: `email:"${email}"` },
    });

    const customer = found.customers.nodes[0];

    if (!customer) {
      // Shopify says the address is taken but will not show us the record -
      // almost always a missing `read_customers` scope on the Admin app.
      console.error(
        "Newsletter: address reported as taken but no customer readable. Check read_customers scope."
      );
      return { ok: false, message: GENERIC_FAILURE };
    }

    if (customer.emailMarketingConsent?.marketingState === "SUBSCRIBED") {
      return {
        ok: true,
        already: true,
        message: "You're already on the list - nothing more to do.",
      };
    }

    const updated = await shopifyAdminFetch<{
      customerEmailMarketingConsentUpdate: {
        customer: { id: string } | null;
        userErrors: ShopifyUserError[];
      };
    }>({
      query: updateEmailMarketingConsentMutation,
      variables: {
        input: { customerId: customer.id, emailMarketingConsent: consent },
      },
    });

    const consentErrors =
      updated.customerEmailMarketingConsentUpdate.userErrors;

    if (
      consentErrors.length ||
      !updated.customerEmailMarketingConsentUpdate.customer
    ) {
      console.error("Newsletter consent update rejected", consentErrors);
      return { ok: false, message: GENERIC_FAILURE };
    }

    return { ok: true, message: "You're on the list." };
  } catch (error) {
    if (error instanceof ShopifyAdminNotConfiguredError) {
      console.error(error.message);
    } else {
      console.error("Newsletter signup failed", error);
    }
    // Never claim success for an address that was not stored.
    return { ok: false, message: GENERIC_FAILURE };
  }
}
