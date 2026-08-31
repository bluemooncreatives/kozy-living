import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export type Props = {
  title?: string;
};

/**
 * Social card in the brand's paper-and-oxblood palette. Satori has no access
 * to the site stylesheet, so the palette values are repeated literally here.
 */
export default async function OpengraphImage(
  props?: Props
): Promise<ImageResponse> {
  const { title } = {
    ...{ title: process.env.SITE_NAME || site.name },
    ...props,
  };
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  const logoUrl = new URL("/logo.png", baseUrl).toString();

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full flex-col justify-between p-20"
        style={{ backgroundColor: "#1C1210" }}
      >
        <div tw="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            width={96}
            height={96}
            style={{ borderRadius: "9999px" }}
          />
          <p
            tw="ml-5 text-2xl"
            style={{ color: "#C08A4E", letterSpacing: "0.14em" }}
          >
            {site.origin.toUpperCase()} · EST. {site.since}
          </p>
        </div>

        <p
          tw="text-8xl"
          style={{ color: "#FBF4E6", fontFamily: "serif", lineHeight: 1.05 }}
        >
          {title}
        </p>

        <p
          tw="text-2xl"
          style={{ color: "#FBF4E6", opacity: 0.65, letterSpacing: "0.14em" }}
        >
          {site.tagline.toUpperCase()}
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
