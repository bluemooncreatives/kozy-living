import {
  CUSTOMER_COOKIES,
  customerClientId,
  getOpenIdConfiguration,
  getSiteUrl,
} from "@/lib/customer-account";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrl(request.url);
  const idToken = request.cookies.get(CUSTOMER_COOKIES.idToken)?.value;
  let destination = `${siteUrl}/`;

  try {
    const { end_session_endpoint } = await getOpenIdConfiguration();
    const logoutUrl = new URL(end_session_endpoint);
    logoutUrl.searchParams.set("client_id", customerClientId());
    logoutUrl.searchParams.set("post_logout_redirect_uri", destination);
    if (idToken) logoutUrl.searchParams.set("id_token_hint", idToken);
    destination = logoutUrl.toString();
  } catch (error) {
    console.error("Shopify logout discovery failed", error);
  }

  const response = NextResponse.redirect(destination);
  Object.values(CUSTOMER_COOKIES).forEach((name) => response.cookies.delete(name));
  return response;
}
