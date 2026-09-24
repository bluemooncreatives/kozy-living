import { SHOPIFY_GRAPHQL_API_ENDPOINT } from "../constants";
import { ensureStartWith } from "../utils";

/**
 * Shopify **Admin** GraphQL client.
 *
 * Separate from `shopifyFetch` in `./index.ts` on purpose. That one talks to
 * the Storefront API with a public token that ships to the browser; this one
 * carries an Admin-scoped token with write scopes, which must never leave the
 * server. Keeping them in different modules - and different env vars - means a
 * stray import into a client component fails loudly at build time rather than
 * quietly leaking a token that can read every customer in the store.
 *
 * The Storefront API is read-mostly and has no mutation for "record an enquiry"
 * of any kind, which is why the contact form needs this path at all.
 *
 * Two ways to authenticate, tried in this order:
 *
 * 1. `SHOPIFY_ADMIN_ACCESS_TOKEN` - a permanent `shpat_...` token. This is
 *    what Shopify's classic "Develop apps" custom-app screen used to hand out.
 * 2. `SHOPIFY_ADMIN_CLIENT_ID` + `SHOPIFY_ADMIN_CLIENT_SECRET` - since Shopify
 *    stopped issuing permanent tokens for apps created from the Dev Dashboard
 *    (Jan 2026), this is what a Dev Dashboard app gives you instead. There is
 *    no static token to copy anywhere; the server exchanges these for a token
 *    itself via the client-credentials grant, and that token is only good for
 *    ~24h (`expires_in`, currently 86399s) - so it's cached and refreshed
 *    below, never stored in `.env`.
 */

const domain = process.env.SHOPIFY_STORE_DOMAIN
  ? ensureStartWith(process.env.SHOPIFY_STORE_DOMAIN, "https://")
  : "";

// `/api/2026-07/graphql.json` → `/admin/api/2026-07/graphql.json`. Derived from
// the storefront constant so a version bump moves both endpoints together.
const endpoint = `${domain}/admin${SHOPIFY_GRAPHQL_API_ENDPOINT}`;

const staticToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

const clientId = process.env.SHOPIFY_ADMIN_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;

/** Thrown when neither Admin credential path is configured - a deploy problem, not a user one. */
export class ShopifyAdminNotConfiguredError extends Error {
  constructor() {
    super(
      "Shopify Admin is not configured: set SHOPIFY_STORE_DOMAIN, and either " +
        "SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET."
    );
    this.name = "ShopifyAdminNotConfiguredError";
  }
}

export function isShopifyAdminConfigured(): boolean {
  return Boolean(domain && (staticToken || (clientId && clientSecret)));
}

// Module-scope cache: this server process reuses one token across requests
// instead of exchanging credentials on every call. `pendingExchange` collapses
// concurrent callers that all miss the cache at once into a single HTTP
// round trip rather than each minting its own token.
let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;
let pendingExchange: Promise<string> | null = null;

async function exchangeClientCredentialsForToken(): Promise<string> {
  const response = await fetch(`${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId as string,
      client_secret: clientSecret as string,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Shopify token exchange responded ${response.status}: ${detail.slice(0, 500)}`
    );
  }

  const { access_token, expires_in } = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = access_token;
  // Refresh a minute early so an in-flight request never races the real expiry.
  cachedTokenExpiresAt = Date.now() + expires_in * 1000 - 60_000;
  return access_token;
}

async function getAdminAccessToken(): Promise<string> {
  if (staticToken) return staticToken;
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  if (!pendingExchange) {
    pendingExchange = exchangeClientCredentialsForToken().finally(() => {
      pendingExchange = null;
    });
  }
  return pendingExchange;
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

  const token = await getAdminAccessToken();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
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
