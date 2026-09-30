"use server";

import { z } from "zod";
import {
  ShopifyAdminNotConfiguredError,
  shopifyAdminFetch,
  type ShopifyUserError,
} from "@/lib/shopify/admin";
import { createContactMessageMutation } from "@/lib/shopify/mutations/contact";
import { b2bEnquiry, contact } from "@/lib/site";
import { clientKey, rateLimited } from "@/lib/rate-limit";

/**
 * B2B enquiry submission.
 *
 * Deliberately the contact form's write path (`components/contact/actions.ts`)
 * and not a new one: the same server action shape, the same honeypot and
 * throttle, and the same `contact_message` metaobject. The team already reads
 * that list in Admin → Content → Metaobjects, so a trade brief lands in the
 * inbox they check rather than in a second one they have to know about.
 * `source: storefront-b2b-form` is what tells the two apart there.
 *
 * The trade fields (company, business type, products, quantity) have no
 * columns of their own on that definition, so they are written into `message`
 * as labelled lines, first, where a skim of the list reads them. Giving them
 * real fields means a `b2b_enquiry` definition in Admin and the type below -
 * not a wider `contact_message`, which the contact form would then have to
 * satisfy too.
 */

export type B2BFieldName =
  | "name"
  | "company"
  | "email"
  | "phone"
  | "businessType"
  | "products"
  | "quantity"
  | "customQuantity"
  | "message";

export type B2BValues = Partial<Record<B2BFieldName, string>>;

export type B2BState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<B2BFieldName, string>>;
  /** Echoed back on failure. React 19 resets a form after its action runs,
      and a trade brief is too long to make someone type twice. */
  values?: B2BValues;
} | null;

const { businessTypes, quantities, custom } = b2bEnquiry.form;

/** "2,500" / "2 500" / "2500" -> 2500. Anything else, including decimals, is
    NaN: a quantity is whole units. */
const parseUnits = (value: string) =>
  /^\d[\d,\s]*$/.test(value) ? Number(value.replace(/[,\s]/g, "")) : NaN;

const B2BSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please tell us your name.")
    .max(80, "That name is longer than we can store."),
  company: z
    .string()
    .trim()
    .min(2, "Please tell us the business you are writing for.")
    .max(120, "That name is longer than we can store."),
  email: z
    .string()
    .trim()
    .email("That does not look like an email address.")
    .max(200, "That address is longer than we can store."),
  // Required here, unlike on the contact form: a trade enquiry is usually
  // followed up on WhatsApp. Still loose on format - counting digits accepts
  // "+91 84949 07007", "084949-07007" and "(+91) 8494 907 007" alike, where a
  // pattern would reject more real numbers than fake ones.
  phone: z
    .string()
    .trim()
    .max(32, "That number is longer than we can store.")
    .refine((value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    }, "Please add a number we can reach you on, with the country code if outside India."),
  businessType: z.enum(businessTypes, {
    errorMap: () => ({ message: "Please choose the closest match." }),
  }),
  products: z
    .string()
    .trim()
    .min(3, "Tell us which Kompanions you have in mind.")
    .max(500, "Please keep this under 500 characters - the message below has room for more."),
  quantity: z.enum(quantities, {
    errorMap: () => ({ message: "Please choose a rough volume - it helps us quote." }),
  }),
  // Only read when `quantity` is the custom option - see the refinement below.
  customQuantity: z.string().trim(),
  message: z
    .string()
    .trim()
    .max(4000, "Please keep it under 4000 characters."),
}).superRefine((data, ctx) => {
  // The field is only on screen once "Customised" is picked, so it is only
  // required then. Checked here as well as by the browser's `required`,
  // which a script or a no-JS post never meets.
  if (data.quantity !== custom.option) return;
  const units = parseUnits(data.customQuantity);
  if (!Number.isInteger(units) || units < 1 || units > 10_000_000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customQuantity"],
      message: "Please enter the number of units, e.g. 2500.",
    });
  }
});

const GENERIC_FAILURE = `Something went wrong on our end. Please email us at ${contact.email} and we'll pick it up from there.`;

const FIELDS: B2BFieldName[] = [
  "name",
  "company",
  "email",
  "phone",
  "businessType",
  "products",
  "quantity",
  "customQuantity",
  "message",
];

export async function submitB2BEnquiry(
  _previous: B2BState,
  formData: FormData
): Promise<B2BState> {
  // Honeypot. Named `website`, not `company` like the contact form's: that
  // name is a real, required field here.
  if ((formData.get("website") as string)?.trim()) {
    return { ok: true, message: b2bEnquiry.form.thanks };
  }

  const raw = Object.fromEntries(
    FIELDS.map((field) => [field, (formData.get(field) as string | null) ?? ""])
  ) as Record<B2BFieldName, string>;

  if (rateLimited("b2b", await clientKey())) {
    return {
      ok: false,
      message: `That's a few enquiries in a row - give it a few minutes, or email us at ${contact.email}.`,
      values: raw,
    };
  }

  const parsed = B2BSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<B2BFieldName, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as B2BFieldName;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors,
      values: raw,
    };
  }

  const {
    name,
    company,
    email,
    phone,
    businessType,
    products,
    quantity,
    customQuantity,
    message,
  } = parsed.data;

  const { quantityUnit } = b2bEnquiry.form;
  // "Customised - 2,500 units" keeps both the choice and the figure, so the
  // team can tell a stated custom volume from a picked band.
  const volume =
    quantity === custom.option
      ? `${quantity} - ${parseUnits(customQuantity).toLocaleString("en-IN")} ${quantityUnit}`
      : `${quantity}${/\d/.test(quantity) ? ` ${quantityUnit}` : ""}`;

  const body = [
    "B2B ENQUIRY",
    `Company: ${company}`,
    `Business type: ${businessType}`,
    `Products: ${products}`,
    `Estimated quantity: ${volume}`,
    "",
    "Requirements:",
    message || "(none given)",
  ].join("\n");

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
            { key: "phone", value: phone },
            { key: "message", value: body },
            { key: "source", value: "storefront-b2b-form" },
            { key: "received_at", value: new Date().toISOString() },
          ],
        },
      },
    });

    const errors = data.metaobjectCreate.userErrors;
    if (errors.length || !data.metaobjectCreate.metaobject) {
      console.error("B2B enquiry metaobject rejected by Shopify", errors);
      return { ok: false, message: GENERIC_FAILURE, values: raw };
    }
  } catch (error) {
    if (error instanceof ShopifyAdminNotConfiguredError) {
      console.error(error.message);
    } else {
      console.error("B2B enquiry submission failed", error);
    }
    // Never report success for a brief that was not stored.
    return { ok: false, message: GENERIC_FAILURE, values: raw };
  }

  return { ok: true, message: b2bEnquiry.form.thanks };
}
