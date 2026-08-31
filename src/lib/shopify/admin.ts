import { SHOPIFY_GRAPHQL_API_ENDPOINT } from "../constants";
import { ensureStartWith } from "../utils";

/**
 * Shopify **Admin** GraphQL client.
 *
 * Separate from `shopifyFetch` in `./index.ts` on purpose. That one talks to
 * the Storefront API with a public token that ships to the browser; this one
 * carries an Admin access token with write scopes, which must never leave the
 * server. Keeping them in different modules - and different env vars - means a
 * stray import into a client component fails loudly at build time rather than
 * quietly leaking a token that can read every customer in the store.
 *
 * The Storefront API is read-mostly and has no mutation for "record an enquiry"
 * of any kind, which is why the contact form needs this path at all.
 */

const domain = process.env.SHOPIFY_STORE_DOMAIN
  ? ensureStartWith(process.env.SHOPIFY_STORE_DOMAIN, "https://")
  : "";

// `/api/2026-07/graphql.json` → `/admin/api/2026-07/graphql.json`. Derived from
// the storefront constant so a version bump moves both endpoints together.
const endpoint = `${domain}/admin${SHOPIFY_GRAPHQL_API_ENDPOINT}`;

const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

/** Thrown when the Admin credentials are absent - a deploy problem, not a user one. */
export class ShopifyAdminNotConfiguredError extends Error {
  constructor() {
    super(
      "Shopify Admin is not configured: set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN."
    );
    this.name = "ShopifyAdminNotConfiguredError";
  }
}

export function isShopifyAdminConfigured(): boolean {
  return Boolean(domain && token);
}

export type ShopifyUserError = {
  field: string[] | null;
  message: string;
  code?: string | null;
};

/**
 * POST a GraphQL document to the Admin API.
 *
 * Always uncached: every caller here mutates. Transport errors and top-level
 * GraphQL `errors` both throw; per-mutation `userErrors` are data and are left
 * for the caller to interpret, since a validation complaint about an email
 * address is a different thing from the store being unreachable.
 */
export async function shopifyAdminFetch<T>({
  query,
  variables,
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  if (!isShopifyAdminConfigured()) throw new ShopifyAdminNotConfiguredError();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token as string,
    },
    body: JSON.stringify({ query, ...(variables && { variables }) }),
    cache: "no-store",
  });

  // A non-2xx from Admin is usually a scope or token problem, and the body
  // explains which - worth surfacing in the server log rather than a bare code.
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Shopify Admin API responded ${response.status}: ${detail.slice(0, 500)}`
    );
  }

  const body = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (body.errors?.length) throw new Error(body.errors[0].message);
  if (!body.data) throw new Error("Shopify Admin API returned no data.");

  return body.data;
}
