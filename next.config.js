/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/s/files/**",
      },
      {
        protocol: "https",
        hostname: "burst.shopifycdn.com",
        pathname: "/photos/**",
      },
      {
        protocol: "https",
        hostname: "**.myshopify.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "kozyliving.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vaishnaviestate.com",
        pathname: "/cdn/shop/files/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/journal", destination: "/blogs", permanent: true },
      { source: "/journal/:slug", destination: "/blogs", permanent: false },
      { source: "/about", destination: "/about-us", permanent: true },
    ];
  },
};
