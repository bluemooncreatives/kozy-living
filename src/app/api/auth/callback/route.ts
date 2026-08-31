import {
  CUSTOMER_COOKIES,
  CustomerTokenResponse,
  customerClientId,
  customerCookieOptions,
  getOpenIdConfiguration,
  getSiteUrl,
  safeReturnTo,
  tokenExpiry,
} from "@/lib/customer-account";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const state = request.cookies.get(CUSTOMER_COOKIES.state)?.value;
  const verifier = request.cookies.get(CUSTOMER_COOKIES.verifier)?.value;
  const returnTo = safeReturnTo(
    request.cookies.get(CUSTOMER_COOKIES.returnTo)?.value || null
  );

  if (!code || !state || returnedState !== state || !verifier) {
    return NextResponse.redirect(new URL("/account?error=invalid_callback", request.url));
  }

  try {
    const { token_endpoint } = await getOpenIdConfiguration();
    const tokenResponse = await fetch(token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: customerClientId(),
        code,
        redirect_uri: `${getSiteUrl(request.url)}/api/auth/callback`,
        code_verifier: verifier,
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) throw new Error("Shopify rejected the authorization code");
    const tokens = (await tokenResponse.json()) as CustomerTokenResponse;
    const response = NextResponse.redirect(new URL(returnTo, getSiteUrl(request.url)));
    response.cookies.set(CUSTOMER_COOKIES.accessToken, tokens.access_token, {
      ...customerCookieOptions,
      maxAge: tokens.expires_in,
    });
    response.cookies.set(
      CUSTOMER_COOKIES.expiresAt,
      String(tokenExpiry(tokens.expires_in)),
      { ...customerCookieOptions, maxAge: tokens.expires_in }
    );
    if (tokens.refresh_token) {
      response.cookies.set(CUSTOMER_COOKIES.refreshToken, tokens.refresh_token, {
        ...customerCookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (tokens.id_token) {
      response.cookies.set(CUSTOMER_COOKIES.idToken, tokens.id_token, {
        ...customerCookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    response.cookies.delete(CUSTOMER_COOKIES.verifier);
    response.cookies.delete(CUSTOMER_COOKIES.state);
    response.cookies.delete(CUSTOMER_COOKIES.returnTo);
    return response;
  } catch (error) {
    console.error("Customer callback failed", error);
    return NextResponse.redirect(new URL("/account?error=token_exchange", request.url));
  }
}
