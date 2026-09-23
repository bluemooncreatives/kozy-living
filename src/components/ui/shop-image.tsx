"use client";

import NextImage, { type ImageLoaderProps, type ImageProps } from "next/image";

/**
 * `next/image`, with Shopify's own CDN doing the resizing for Shopify files.
 *
 * WHY. Next's optimiser has to download the whole original before it can
 * resize it, once per width variant, and time out at 7s. On this store that
 * was the "`/_next/image` 500s everywhere" problem - see *Image sizing* in
 * CLAUDE.md. Shopify's CDN resizes at its edge instead, negotiates WebP from
 * the browser's own `Accept` header (it sends `Vary: Accept`), and caches for
 * a year: a 384px card variant measured 42 KB against the optimiser pulling a
 * 2.5 MB PNG to make it. It also takes a hop off every image request - the
 * browser fetches from the CDN directly rather than through this server.
 *
 * WHY A WRAPPER AND NOT `images.loaderFile`. A global loader switches the
 * `/_next/image` route off entirely (next-server renders a 404 for it when
 * `loader !== "default"`), and every local asset - the logo, the icons, the
 * GI mark - still needs it. A loader is a function, so it cannot be handed
 * down from a server component either; it lives here, in a client module, and
 * the server components just render this in place of `next/image`.
 *
 * Anything that is not a Shopify file falls straight through to the default
 * loader, untouched.
 */

const SHOPIFY_FILE = /^https:\/\/cdn\.shopify\.com\/s\/files\//;

/**
 * URLs from the Storefront API's `transform` (see `fragments/image.ts`) carry
 * their size in the FILENAME - `IMG_4114_2048x.png.webp` - and Shopify ignores
 * a `width` query on those, silently serving the 2048 every time. So the
 * suffix is rewritten where there is one, and `width` is only the fallback for
 * raw file URLs, such as the stills hard-coded in `site.ts`.
 */
const SIZE_SUFFIX = /_(\d+)x(\d+)?(?=\.[a-z0-9]+(?:\.webp)?$)/i;

/**
 * Matches the fragment's own cap. Past this the bytes grow much faster than
 * anything a screen can show - and a few originals here are 3375px PNGs.
 */
const MAX_WIDTH = 2048;

function shopifyLoader({ src, width }: ImageLoaderProps) {
  const url = new URL(src);
  const w = Math.min(width, MAX_WIDTH);
  if (SIZE_SUFFIX.test(url.pathname)) {
    url.pathname = url.pathname.replace(SIZE_SUFFIX, `_${w}x`);
  } else {
    url.searchParams.set("width", String(w));
  }
  return url.toString();
}

export default function ShopImage(props: ImageProps) {
  const shopify = typeof props.src === "string" && SHOPIFY_FILE.test(props.src);
  // Next 16's `priority` preloads the image but no longer raises its fetch
  // priority; the docs now pair it with `fetchPriority="high"` by hand. Done
  // once here so every priority plate gets it without each caller knowing.
  const urgent = props.priority || props.preload;
  return (
    <NextImage
      {...props}
      fetchPriority={props.fetchPriority ?? (urgent ? "high" : undefined)}
      loader={shopify ? shopifyLoader : props.loader}
    />
  );
}
