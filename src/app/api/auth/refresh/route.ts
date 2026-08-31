import {
  CUSTOMER_COOKIES,
  CustomerTokenResponse,
  customerClientId,
  customerCookieOptions,
  getOpenIdConfiguration,
  safeReturnTo,
  tokenExpiry,
} from "@/lib/customer-account";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const refreshToken = request.cookies.get(CUSTOMER_COOKIES.refreshToken)?.value;
  if (!refreshToken) {
    return NextResponse.redirect(new URL(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  try {
    const { token_endpoint } = await getOpenIdConfiguration();
    const tokenResponse = await fetch(token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: customerClientId(),
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error("Refresh token rejected");
    const tokens = (await tokenResponse.json()) as CustomerTokenResponse;
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set(CUSTOMER_COOKIES.accessToken, tokens.access_token, {
      ...customerCookieOptions,
      maxAge: tokens.expires_in,
    });
    response.cookies.set(CUSTOMER_COOKIES.expiresAt, String(tokenExpiry(tokens.expires_in)), {
      ...customerCookieOptions,
      maxAge: tokens.expires_in,
    });
    if (tokens.refresh_token) {
      response.cookies.set(CUSTOMER_COOKIES.refreshToken, tokens.refresh_token, {
        ...customerCookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error) {
    console.error("Customer token refresh failed", error);
    const response = NextResponse.redirect(new URL("/api/auth/login?returnTo=/account", request.url));
    response.cookies.delete(CUSTOMER_COOKIES.accessToken);
    response.cookies.delete(CUSTOMER_COOKIES.refreshToken);
    response.cookies.delete(CUSTOMER_COOKIES.expiresAt);
    return response;
  }
}
