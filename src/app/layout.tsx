import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "lenis/dist/lenis.css";
import { Navbar } from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { CartProvider } from "@/components/cart/cart-context";
import SmoothScrollProvider from "@/components/providers/smooth-scroll-provider";
import MotionProvider from "@/components/motion/motion-provider";
import { cookies } from "next/headers";
import { getCart } from "@/lib/shopify";
import { site } from "@/lib/site";

/**
 * Franxurter - the display face, self-hosted so it never flashes or shifts.
 *
 * It ships in ONE weight, so it is declared at 400 and must never be given a
 * bold utility: asking for 700 makes the browser synthesise it, and a faked
 * bold on a display face at hero scale is immediately visible. Weight in this
 * system comes from the face you choose, not from a number.
 */
const franxurter = localFont({
  src: "../../public/font/Franxurter.ttf",
  variable: "--font-franxurter",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
});

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const logoUrl = new URL("/logo/Kozy Logo.png", baseUrl).toString();

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: baseUrl,
  logo: {
    "@type": "ImageObject",
    url: logoUrl,
    width: 3836,
    height: 2160,
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
    icon: [{ url: "/logo/Kozy Logo.png", type: "image/png" }],
    shortcut: ["/logo/Kozy Logo.png"],
    apple: [{ url: "/logo/Kozy Logo.png", type: "image/png" }],
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
    <html lang="en" className={franxurter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {/* The failure catch for the motion layer. Reveal targets are hidden
            by CSS; if the layer has not reported in within two seconds, this
            forces them all visible again. It touches no attribute on <html>,
            because React reconciles those and a script-added class there is a
            hydration mismatch. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{setTimeout(function(){if(window.__motionReady)return;var s=document.createElement('style');s.textContent='[data-reveal]{opacity:1!important;transform:none!important}';document.head.appendChild(s)},2000)}catch(e){}})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Plus Jakarta Sans is the UI face: navigation, labels, body copy and
            every heading below display-lg. The display face is Franxurter,
            self-hosted via next/font in this file. 800 is no longer requested -
            nothing uses it since the wordmark moved to the display face. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-paper text-ink antialiased">
        <SmoothScrollProvider>
          <MotionProvider />
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
