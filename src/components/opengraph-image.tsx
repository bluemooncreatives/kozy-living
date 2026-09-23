import { ImageResponse } from "next/og";
import { site, hero } from "@/lib/site";
import fs from "fs";
import path from "path";

export type Props = {
  title?: string;
};

/** Read a file out of `public`, or null if it is not there. */
function asset(...segments: string[]): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", ...segments));
  } catch {
    return null;
  }
}

/**
 * The same file, but only if the renderer can actually parse it.
 *
 * `next/og` rasterises through satori, which reads fonts with opentype and
 * does NOT handle variable fonts - handing it one fails deep inside the
 * parser with "Cannot read properties of undefined", and because the image is
 * streamed that surfaces as a 500 on the route rather than as a catchable
 * error. Plus Jakarta ships here as a variable face, so it cannot be used on
 * this card at all.
 *
 * Rather than hard-code that knowledge, this reads the sfnt table directory
 * and rejects anything carrying `fvar`, which is the table that makes a font
 * variable. Swap a static Jakarta in later and it starts working; swap
 * Franxurter for a variable cut and the card quietly falls back instead of
 * going down.
 */
function staticFont(...segments: string[]): Buffer | null {
  const buffer = asset(...segments);
  if (!buffer || buffer.length < 12) return null;

  try {
    const tableCount = buffer.readUInt16BE(4);
    for (let index = 0; index < tableCount; index += 1) {
      const start = 12 + index * 16;
      if (buffer.subarray(start, start + 4).toString("latin1") === "fvar") {
        return null;
      }
    }
    return buffer;
  } catch {
    return null;
  }
}

/**
 * The social card - the only piece of this design system that renders outside
 * a browser, and the one most people see first.
 *
 * It was still drawn in the palette the project started with: an espresso
 * ground, an amber accent and an off-white, with the title set in whatever
 * generic `serif` the renderer happened to have. None of those exist here any
 * more - and `.serif` in this codebase is the UI face at bold, not a serif,
 * which is very likely how that got in.
 *
 * It is now indigo, oat and sage, in the brand's own two faces:
 *
 *   ground   indigo  #23324B
 *   title    oat     #E8D9C4  9.30 on indigo - the pairing for headings on dark
 *   accent   sage    #A9BDAF  6.50 on indigo - where flat sage may carry type
 *
 * `next/og` has no access to the stylesheet or to `next/font`, so the face is
 * read off disk and handed to the renderer directly. Only Franxurter can go
 * on this card - see `staticFont` - so the whole thing is set in the display
 * face, which suits a poster and matches the wordmark bands on the site. If
 * the file is missing the card still draws in the renderer default.
 */
export default async function OpengraphImage(
  props?: Props,
): Promise<ImageResponse> {
  /* The tagline, not the name: the wordmark already sits top-left, and this
     card used to put "Kozy Living" in both places and the tagline in two
     more. A page passes its own title and this default never applies. */
  const { title } = { ...{ title: site.tagline }, ...props };

  const display = staticFont("font", "Franxurter.ttf");

  const fonts = (
    display
      ? [
          {
            name: "Franxurter",
            data: display,
            weight: 400 as const,
            style: "normal" as const,
          },
        ]
      : []
  ) as NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full flex-col justify-between p-20"
        style={{ backgroundColor: "#23324B", fontFamily: "Franxurter" }}
      >
        {/* The wordmark, SET rather than placed.

            It used to be `public/logo/Kozy Logo.png` - a 3.18 MB, 3836x2160
            raster read off disk and base64'd into the markup on every single
            render, for a 70px-tall mark. It is also drawn for light grounds,
            so on indigo it came out muddy. The site's own `.wordmark` is
            lowercase Franxurter and nothing else, which is exactly what this
            is: crisp at any size, correct on the palette, and free. */}
        <div tw="flex items-center">
          <p tw="text-4xl" style={{ color: "#FFF6EB", letterSpacing: "-0.02em" }}>
            {`${site.name.toLowerCase()}`}
          </p>
          <p tw="ml-6 text-2xl" style={{ color: "#A9BDAF", letterSpacing: 0 }}>
            {hero.flag.toUpperCase()}
          </p>
        </div>

        <p
          tw="text-8xl"
          style={{
            color: "#E8D9C4",
            fontFamily: "Franxurter",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </p>

        <p
          tw="text-2xl"
          style={{ color: "#FFF6EB", opacity: 0.7, letterSpacing: 0 }}
        >
          {site.instagram.toUpperCase()}
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts?.length ? { fonts } : {}),
    },
  );
}
