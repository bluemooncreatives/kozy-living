import type { Image as ShopifyImage, Product } from "@/lib/shopify/types";

/**
 * One photograph's identity, whatever URL it arrived under. The image
 * fragment's transform rewrites the FILE NAME, not just the query -
 * `IMG_1695.png` comes back as `IMG_1695_2048x.png.webp` - so a curated still
 * pasted from Admin and the same file borrowed from a product never compare
 * equal as URLs, or even as paths.
 */
export function imageKey(url: string): string {
  return (url.split("?")[0].split("/").pop() ?? url)
    .replace(/_\d*x\d*(?=(\.\w+)+$)/, "")
    .replace(/(\.\w+)\.webp$/, "$1");
}

/**
 * A collection's photography, borrowed from its products: lead shots first,
 * then alternates - one image per product before anyone's second, so four
 * frames show four Kompanions rather than four angles of the first one.
 */
export function galleryFor(products: Product[], limit = 4): ShopifyImage[] {
  const ordered = [
    ...products.map((product) => product.featuredImage),
    ...products.flatMap((product) => product.images ?? []),
  ];
  const seen = new Set<string>();
  const gallery: ShopifyImage[] = [];

  for (const image of ordered) {
    if (!image?.url || seen.has(image.url)) continue;
    seen.add(image.url);
    gallery.push(image);
    if (gallery.length >= limit) break;
  }

  return gallery;
}
