"use server";

import { z } from "zod";
import {
  ShopifyAdminNotConfiguredError,
  shopifyAdminFetch,
  type ShopifyUserError,
} from "@/lib/shopify/admin";
import { createContactMessageMutation } from "@/lib/shopify/mutations/contact";
import { contact } from "@/lib/site";
import { clientKey, rateLimited } from "@/lib/rate-limit";

/**
 * Contact form submission.
 *
 * A server action rather than a route handler: the Admin token stays on the
 * server either way, but an action has no publicly documented URL to point a
 * script at, and it gives progressive enhancement for free - the form posts and
 * works with JavaScript disabled.
 */

export type ContactFieldName = "name" | "email" | "phone" | "message";

export type ContactState = {
  ok: boolean;
  message: string;
  /** Per-field messages, rendered under the offending input. */
  fieldErrors?: Partial<Record<ContactFieldName, string>>;
} | null;

const ContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please tell us your name.")
    .max(80, "That name is longer than we can store."),
  email: z
    .string()
    .trim()
    .email("That does not look like an email address.")
    .max(200, "That address is longer than we can store."),
  // Optional because someone writing from abroad may not want to give one, and
  // deliberately loose: number formats vary enough that a strict pattern
  // rejects more real numbers than fake ones.
  phone: z
    .string()
    .trim()
    .max(32, "That number is longer than we can store.")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "A little more detail will help us answer properly.")
    .max(4000, "Please keep it under 4000 characters."),
});

const GENERIC_FAILURE = `Something went wrong on our end. Please email us at ${contact.email} and we'll pick it up from there.`;

export async function submitContactMessage(
  _previous: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot. A real person never sees this field, so anything in it is a bot.
  // Answer with the success state rather than an error: an error teaches the
  // script what to avoid next time.
  if ((formData.get("company") as string)?.trim()) {
    return { ok: true, message: "Thank you - we'll be in touch shortly." };
  }

  if (rateLimited("contact", await clientKey())) {
    return {
      ok: false,
      message: `That's a few messages in a row - give it a few minutes, or email us at ${contact.email}.`,
    };
  }

  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactFieldName, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactFieldName;
      // First issue per field only - a stack of messages under one input is
      // noise, and the first is always the one to fix.
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const { name, email, phone, message } = parsed.data;

  try {
    const data = await shopifyAdminFetch<{
      metaobjectCreate: {
        metaobject: { id: string; handle: string } | null;
        userErrors: ShopifyUserError[];
      };
    }>({
      query: createContactMessageMutation,
      variables: {
        metaobject: {
          type: "contact_message",
          fields: [
            { key: "name", value: name },
            { key: "email", value: email },
            { key: "phone", value: phone || "" },
            { key: "message", value: message },
            { key: "source", value: "storefront-contact-form" },
            { key: "received_at", value: new Date().toISOString() },
          ],
        },
      },
    });

    const errors = data.metaobjectCreate.userErrors;
    if (errors.length || !data.metaobjectCreate.metaobject) {
      // Almost always a missing or renamed field on the metaobject definition.
      // The visitor cannot act on that, so they get the generic line and the
      // detail goes to the server log.
      console.error("Contact metaobject rejected by Shopify", errors);
      return { ok: false, message: GENERIC_FAILURE };
    }
  } catch (error) {
    if (error instanceof ShopifyAdminNotConfiguredError) {
      console.error(error.message);
    } else {
      console.error("Contact form submission failed", error);
    }
    // Never report success for a message that was not stored - the whole point
    // of the form is that someone will read it.
    return { ok: false, message: GENERIC_FAILURE };
  }

  return {
    ok: true,
    message: "Thank you - your message is with us. We usually reply within one business day.",
  };
}
