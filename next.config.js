/** srctype {import('next').NextConfig} */
module.exports = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/s/files/**",
      },
      // Storefront-served media. Shopify puts a shop's own uploads behind the
      // primary domain at /cdn/shop/files, which is a different host and path
      // from the /s/files CDN above — both are needed.
      {
        protocol: "https",
        hostname: "vaishnaviestate.com",
        pathname: "/cdn/shop/files/**",
      },
    ],
  },
  async redirects() {
    return [
      // The journal moved onto the Shopify blog API and now lives at the same
      // paths Shopify serves. Keep the old editorial URLs resolving.
      { source: "/journal", destination: "/blogs", permanent: true },
      { source: "/journal/:slug", destination: "/blogs", permanent: false },
      // The estate story is at /about-us. Without this, /about falls through to
      // the `[page]` catch-all and renders whatever Shopify page happens to
      // share that handle — or 404s. Redirect wins over the dynamic segment.
      { source: "/about", destination: "/about-us", permanent: true },
    ];
  },
};
