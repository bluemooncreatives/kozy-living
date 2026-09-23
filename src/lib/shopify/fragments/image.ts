/**
 * Every image URL in the app comes through here, which is the only place a
 * cap on the source size can be set once.
 *
 * THE ORIGINALS ON THIS STORE ARE ENORMOUS. A product shot measured 3375x4219
 * and **9.44 MB**, and Next's optimiser has to download the whole file before
 * it can resize it - once per width variant it generates. A product page asks
 * for a dozen of those at several widths each, and the optimiser gives up at
 * 7s, so the page filled with `/_next/image ... 500` and broken frames.
 *
 * `transform` makes Shopify's own CDN do the first resize, which it is very
 * good at: the same shot at `maxWidth: 2048` is ~0.4 MB and arrives in about a
 * second. Next then optimises from that instead of from 9.44 MB.
 *
 * 2048 is the cap rather than something smaller because the product gallery is
 * the largest frame on the site and is zoomable on a high-density screen;
 * below about 1600 it starts to soften there.
 *
 * `preferredContentType` matters as much as the cap. Capping alone left the
 * PNGs as PNGs, and a 2048px PNG of a photograph is still 6.55 MB - three of
 * them went on timing out. WEBP rather than JPG because these have alpha.
 *
 * NOTE: `width` and `height` still describe the ORIGINAL, not the transformed
 * URL. Nothing reads them today - every surface renders through `next/image`
 * with `fill` - but anything that starts to must not assume they match the
 * bytes it just fetched.
 */
const imageFragment = /* GraphQL */ `
  fragment image on Image {
    url(transform: { maxWidth: 2048, preferredContentType: WEBP })
    altText
    width
    height
  }
`;

export default imageFragment;
