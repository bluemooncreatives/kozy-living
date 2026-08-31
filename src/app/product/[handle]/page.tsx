import Gallery from "@/components/product/gallery";
import { ProductProvider } from "@/components/product/product-context";
import { ProductDescription } from "@/components/product/product-description";
import ProductCard from "@/components/product-card";
import Marquee from "@/components/ui/marquee";
import Carousel from "@/components/ui/carousel";
import { SectionHead } from "@/components/ui/section";
import { HIDDEN_PRODUCT_TAG } from "@/lib/constants";
import { getProduct, getProductRecommendations } from "@/lib/shopify";
import { Image } from "@/lib/shopify/types";
import { featureBand, site } from "@/lib/site";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) return notFound();

  const { url, width, height, altText: alt } = product.featuredImage || {};
  const indexable = !product.tags.includes(HIDDEN_PRODUCT_TAG);

  return {
    title: product.seo.title || product.title,
    description: product.seo.description || product.description,
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: { index: indexable, follow: indexable },
    },
    openGraph: url ? { images: [{ url, width, height, alt }] } : null,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return notFound();

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.featuredImage?.url,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "AggregateOffer",
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: product.priceRange.minVariantPrice.currencyCode,
      lowPrice: product.priceRange.minVariantPrice.amount,
      highPrice: product.priceRange.maxVariantPrice.amount,
    },
  };

  const band = Array.from({ length: 8 }, () => featureBand.label);

  return (
    <ProductProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <div className="rule-b py-2">
        <Marquee phrases={band} size="display" separator="↓↓↓↓" duration={45} className="text-oxblood" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-3">
          <Suspense
            fallback={<div className="plate aspect-square w-full animate-pulse" />}
          >
            <Gallery
              images={product.images.slice(0, 6).map((image: Image) => ({
                src: image.url,
                altText: image.altText,
              }))}
            />
          </Suspense>
        </div>

        <div className="border-rule p-6 lg:border-l lg:p-10">
          {/* Sticky so the buy panel stays reachable past a tall gallery. */}
          <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <Suspense fallback={null}>
              <ProductDescription product={product} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="rule-y py-2">
        <Marquee
          phrases={band}
          size="display"
          separator="↑↑↑↑"
          duration={45}
          reverse
          className="text-oxblood"
        />
      </div>

      <Suspense fallback={null}>
        <RelatedProducts id={product.id} />
      </Suspense>

      <nav className="shell rule-t flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
        <Link href="/" className="spec-mono hover:underline">
          Home
        </Link>
        <span aria-hidden className="spec-mono opacity-50">
          /
        </span>
        <Link href="/search" className="spec-mono hover:underline">
          Shop
        </Link>
        <span aria-hidden className="spec-mono opacity-50">
          /
        </span>
        <span className="spec-mono opacity-70">{product.title}</span>
      </nav>
    </ProductProvider>
  );
}

async function RelatedProducts({ id }: { id: string }) {
  const relatedProducts = await getProductRecommendations(id);
  if (!relatedProducts?.length) return null;

  const shelf = relatedProducts.slice(0, 9);

  return (
    <section aria-labelledby="related">
      <SectionHead
        eyebrow="Also from the estate"
        title={<span id="related">You May Also Like</span>}
        count={shelf.length}
        action="View all"
        actionHref="/search"
      />
      <Carousel label="Related coffee">
        {shelf.map((product) => (
          <ProductCard key={product.handle} product={product} />
        ))}
      </Carousel>
    </section>
  );
}
