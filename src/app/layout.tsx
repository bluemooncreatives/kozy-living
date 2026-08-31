import type { Metadata } from "next";
import "./globals.css";
import "lenis/dist/lenis.css";
import { Navbar } from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { CartProvider } from "@/components/cart/cart-context";
import SmoothScrollProvider from "@/components/providers/smooth-scroll-provider";
import { cookies } from "next/headers";
import { getCart } from "@/lib/shopify";
import { site } from "@/lib/site";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const logoUrl = new URL("/logo.png", baseUrl).toString();

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: baseUrl,
  logo: {
    "@type": "ImageObject",
    url: logoUrl,
    width: 571,
    height: 571,
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${site.name} - ${site.tagline}`,
    template: `%s - ${site.name}`,
  },
  description: site.description,
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "571x571" }],
    shortcut: ["/logo.png"],
    apple: [{ url: "/logo.png", type: "image/png", sizes: "571x571" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} - ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    creator: process.env.TWITTER_CREATOR,
    site: process.env.TWITTER_SITE,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cartId = (await cookies()).get("cartId")?.value;
  // The promise is handed to a client component that unwraps it with `use()`,
  // so a rejection surfaces at the root and blanks the whole site. Degrade to
  // an empty cart instead - every other page still works without one.
  const cart = getCart(cartId).catch((error) => {
    console.error("Failed to load cart", error);
    return undefined;
  });
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Two families, no exceptions: Instrument Serif for display, Space
            Mono for everything else. See DESIGN.md §2. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-paper text-oxblood antialiased">
        <SmoothScrollProvider>
          <CartProvider cartPromise={cart}>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
