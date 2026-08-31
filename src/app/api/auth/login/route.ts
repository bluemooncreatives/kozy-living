import {
  CUSTOMER_COOKIES,
  customerClientId,
  customerCookieOptions,
  getOpenIdConfiguration,
  getSiteUrl,
  safeReturnTo,
} from "@/lib/customer-account";
import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const state = randomBytes(24).toString("base64url");
    const nonce = randomBytes(24).toString("base64url");
    const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
    const redirectUri = `${getSiteUrl(request.url)}/api/auth/callback`;
    const { authorization_endpoint } = await getOpenIdConfiguration();
    const authorizationUrl = new URL(authorization_endpoint);

    authorizationUrl.searchParams.set(
      "scope",
      "openid email customer-account-api:full"
    );
    authorizationUrl.searchParams.set("client_id", customerClientId());
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(authorizationUrl);
    const temporary = { ...customerCookieOptions, maxAge: 600 };
    response.cookies.set(CUSTOMER_COOKIES.verifier, verifier, temporary);
    response.cookies.set(CUSTOMER_COOKIES.state, state, temporary);
    response.cookies.set(CUSTOMER_COOKIES.returnTo, returnTo, temporary);
    return response;
  } catch (error) {
    console.error("Customer login failed", error);
    return NextResponse.redirect(new URL("/account?error=login_unavailable", request.url));
  }
}
