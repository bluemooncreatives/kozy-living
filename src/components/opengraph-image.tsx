import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import fs from "fs";
import path from "path";

export type Props = {
  title?: string;
};

/**
 * Social card in the brand's paper-and-terracotta palette.
 */
export default async function OpengraphImage(
  props?: Props
): Promise<ImageResponse> {
  const { title } = {
    ...{ title: process.env.SITE_NAME || site.name },
    ...props,
  };

  let logoDataUrl = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "logo", "Kozy Logo.png");
    const logoBuffer = fs.readFileSync(logoPath);
    logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    // Fallback if logo not found
  }

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full flex-col justify-between p-20"
        style={{ backgroundColor: "#2A221E" }}
      >
        <div tw="flex items-center">
          {logoDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoDataUrl}
              alt=""
              height={70}
              style={{ objectFit: "contain" }}
            />
          ) : null}
          <p
            tw="ml-5 text-2xl"
            style={{ color: "#E9B973", letterSpacing: "0.14em" }}
          >
            {site.origin.toUpperCase()} · EST. {site.since}
          </p>
        </div>

        <p
          tw="text-8xl"
          style={{ color: "#FAF8F5", fontFamily: "serif", lineHeight: 1.05 }}
        >
          {title}
        </p>

        <p
          tw="text-2xl"
          style={{ color: "#FAF8F5", opacity: 0.75, letterSpacing: "0.14em" }}
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
