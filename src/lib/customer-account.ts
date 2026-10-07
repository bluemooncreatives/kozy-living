import { cookies } from "next/headers";

export const CUSTOMER_COOKIES = {
  accessToken: "customer_access_token",
  refreshToken: "customer_refresh_token",
  idToken: "customer_id_token",
  expiresAt: "customer_token_expires_at",
  verifier: "customer_pkce_verifier",
  state: "customer_oauth_state",
  returnTo: "customer_return_to",
} as const;

export type OpenIdConfiguration = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
};

export type CustomerApiConfiguration = {
  graphql_api: string;
};

export type CustomerTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
};

export type CustomerAccount = {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: { emailAddress: string } | null;
  phoneNumber?: { phoneNumber: string } | null;
  addresses: {
    nodes: Array<{ id: string; formatted: string[] }>;
  };
  orders: {
    nodes: Array<{
      id: string;
      name: string;
      processedAt: string;
      financialStatus?: string | null;
      fulfillmentStatus?: string | null;
      statusPageUrl?: string | null;
      totalPrice: { amount: string; currencyCode: string };
    }>;
  };
};

const CUSTOMER_QUERY = /* GraphQL */ `
  query CustomerAccount {
    customer {
      id
      displayName
      firstName
      lastName
      emailAddress { emailAddress }
      phoneNumber { phoneNumber }
      addresses(first: 10) {
        nodes { id formatted }
      }
      orders(first: 20, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          statusPageUrl
          totalPrice { amount currencyCode }
        }
      }
    }
  }
`;

function shopDomain() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, "");
  if (!domain) throw new Error("SHOPIFY_STORE_DOMAIN is not configured");
  return domain;
}

export function customerClientId() {
  const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID;
  if (!clientId) {
    throw new Error("SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID is not configured");
  }
  return clientId;
}

export async function getOpenIdConfiguration(): Promise<OpenIdConfiguration> {
  const response = await fetch(
    `https://${shopDomain()}/.well-known/openid-configuration`,
    { next: { revalidate: 3600 } }
  );
  if (!response.ok) throw new Error("Unable to discover Shopify login endpoints");
  return response.json();
}

async function getCustomerApiConfiguration(): Promise<CustomerApiConfiguration> {
  const response = await fetch(
    `https://${shopDomain()}/.well-known/customer-account-api`,
    { next: { revalidate: 3600 } }
  );
  if (!response.ok) throw new Error("Unable to discover Customer Account API");
  return response.json();
}

export function getSiteUrl(requestUrl?: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (requestUrl) return new URL(requestUrl).origin;
  throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
}

export function safeReturnTo(value: string | null, fallback = "/account") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(CUSTOMER_COOKIES.accessToken)?.value;
  const expiresAt = Number(
    cookieStore.get(CUSTOMER_COOKIES.expiresAt)?.value || 0
  );
  return {
    accessToken,
    expiresAt,
    isAuthenticated: Boolean(accessToken),
    isExpired: !expiresAt || expiresAt <= Date.now() + 30_000,
  };
}

export async function fetchCustomerAccount(accessToken: string) {
  const { graphql_api } = await getCustomerApiConfiguration();
  const response = await fetch(graphql_api, {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: CUSTOMER_QUERY }),
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Unable to load your Shopify account");
  const payload = (await response.json()) as {
    data?: { customer: CustomerAccount };
    errors?: Array<{ message: string }>;
  };
  if (payload.errors?.length || !payload.data?.customer) {
    throw new Error(payload.errors?.[0]?.message || "Customer account unavailable");
  }
  return payload.data.customer;
}

export type OrderLineItem = {
  id: string;
  name: string;
  variantTitle?: string | null;
  quantity: number;
  image?: { url: string; altText?: string | null } | null;
  customAttributes: { key: string; value?: string | null }[];
  totalPrice?: { amount: string; currencyCode: string } | null;
};

const ORDER_LINES_QUERY = /* GraphQL */ `
  query CustomerOrderLines {
    customer {
      orders(first: 20, reverse: true) {
        nodes {
          id
          lineItems(first: 30) {
            nodes {
              id
              name
              variantTitle
              quantity
              image { url altText }
              customAttributes { key value }
              totalPrice { amount currencyCode }
            }
          }
        }
      }
    }
  }
`;

/**
 * What each order contained, by order id - for showing a custom kit (and
 * everything else) in the account's order history.
 *
 * A separate query from `fetchCustomerAccount` on purpose, and it never
 * throws: that one takes the page down on any error, and a field this one
 * asks for being refused should cost the list of items, not the account.
 */
export async function fetchOrderLineItems(
  accessToken: string
): Promise<Record<string, OrderLineItem[]>> {
  try {
    const { graphql_api } = await getCustomerApiConfiguration();
    const response = await fetch(graphql_api, {
      method: "POST",
      headers: { Authorization: accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query: ORDER_LINES_QUERY }),
      cache: "no-store",
    });
    if (!response.ok) return {};
    const payload = (await response.json()) as {
      data?: {
        customer?: {
          orders: { nodes: { id: string; lineItems: { nodes: OrderLineItem[] } }[] };
        };
      };
      errors?: Array<{ message: string }>;
    };
    if (payload.errors?.length) {
      console.warn("Order line items unavailable:", payload.errors[0]?.message);
    }
    return Object.fromEntries(
      (payload.data?.customer?.orders.nodes ?? []).map((order) => [
        order.id,
        order.lineItems?.nodes ?? [],
      ])
    );
  } catch (error) {
    console.warn("Order line items unavailable:", error);
    return {};
  }
}

export const customerCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function tokenExpiry(expiresIn: number) {
  return Date.now() + Math.max(expiresIn - 60, 0) * 1000;
}
