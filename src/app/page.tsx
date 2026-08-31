import clsx from "clsx";
import Link from "next/link";
import { Suspense } from "react";
import { getArticles, getCollectionProducts, getProducts } from "@/lib/shopify";
import { Product } from "@/lib/shopify/types";
import ProductCard from "@/components/product-card";
import ArticleCard from "@/components/blog/article-card";
import Price from "@/components/price";
import Marquee from "@/components/ui/marquee";
import Carousel from "@/components/ui/carousel";
import HeroVideo from "@/components/ui/hero-video";
import PromoTile from "@/components/ui/promo-tile";
import ProductTable from "@/components/ui/product-table";
import CollectionPillRail from "@/components/ui/collection-pill-rail";
import EstateReel from "@/components/ui/estate-reel";
import { Eyebrow, Headline, SectionHead } from "@/components/ui/section";
import {
  aboutCards,
  aboutStatement,
  estatePhilosophy,
  estateReel,
  featureBand,
  guidesFeature,
  heroPhrases,
  journalPosts,
  promoTiles,
  site,
} from "@/lib/site";
import Image from "next/image";

export const metadata = {
  title: `${site.name} - ${site.tagline}`,
  description: site.description,
  openGraph: { type: "website" },
};

/**
 * Homepage. Section order:
 * hero → category filters → living philosophy & reel → bestsellers →
 * promo pair → curated edits → about → studio catalog table → design of the month →
 * accents → design guides → journal dispatch.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <CollectionFilters />

      <Philosophy />

      <Suspense fallback={<RailFallback />}>
        <Bestsellers />
      </Suspense>

      <PromoPair />

      <Suspense fallback={null}>
        <LatestBlends />
      </Suspense>

      <About />

      <Suspense fallback={null}>
        <SingleOrigin />
      </Suspense>

      <Suspense fallback={null}>
        <BrewOfTheMonth />
      </Suspense>

      <Suspense fallback={null}>
        <Merch />
      </Suspense>

      <Guides />

      <Suspense fallback={null}>
        <Journal />
      </Suspense>
    </>
  );
}

/* ----------------------------------------------------------------- helpers */

/** Collection first, all products as the fallback for an unconfigured store. */
async function productsFrom(
  collection: string,
  fallbackSort?: { sortKey: string; reverse?: boolean }
): Promise<Product[]> {
  try {
    const fromCollection = await getCollectionProducts({ collection });
    if (fromCollection.length) return fromCollection;
  } catch {
    // Collection does not exist on this store - fall through.
  }

  try {
    return await getProducts(fallbackSort ?? {});
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="shell pt-3">
      <div className="plate relative aspect-[4/5] w-full overflow-hidden bg-coal sm:aspect-[16/10] lg:aspect-[16/8]">
        <HeroVideo
          clips={[
            { src: "/Coffee.mp4" },
            {
              src: "/vecteezy_slow-motion-of-raw-coffee-beans-fall-to-the-ground_1620174.mp4",
            },
            { src: "/209419_small.mp4" },
            { src: "/45358-443057031.mp4" },
          ]}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-coal/70 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 sm:bottom-2 md:bottom-4">
          <Marquee
            phrases={heroPhrases}
            size="hero"
            separator=""
            duration={50}
            className="text-amber"
          />
        </div>
      </div>
      <h1 className="sr-only">
        {site.name} - {site.tagline}
      </h1>
    </section>
  );
}

/* --------------------------------------------------------------- filters */

function CollectionFilters() {
  return (
    <section aria-label="Browse spaces and categories" className="py-10 md:py-12">
      <CollectionPillRail />
    </section>
  );
}

/* --------------------------------------------------------------- rails */

async function Bestsellers() {
  const products = (
    await productsFrom("popular", { sortKey: "BEST_SELLING" })
  ).slice(0, 12);

  if (!products.length) return null;

  return (
    <section aria-labelledby="bestsellers">
      <SectionHead
        eyebrow="Bestsellers"
        title={<span id="bestsellers">Curated Favorites</span>}
        count={products.length}
        action="View all"
        actionHref="/search"
      />
      <Carousel label="Bestselling objects">
        {products.map((product, index) => (
          <ProductCard
            key={product.handle}
            product={product}
            priority={index < 3}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
          />
        ))}
      </Carousel>
    </section>
  );
}

function RailFallback() {
  return (
    <div className="py-16">
      <div className="shell mx-auto h-10 w-64 animate-pulse rounded-full bg-wash" />
      <div className="rule-y mt-12 grid grid-cols-1 divide-x divide-rule sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="plate aspect-square w-full animate-pulse" />
            <div className="mt-4 h-4 w-2/3 animate-pulse rounded-full bg-wash" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- promo */

function PromoPair() {
  return (
    <section
      aria-label="Shop by curated atmosphere"
      className="rule-b grid grid-cols-1 gap-3 px-[var(--gutter)] py-3 md:grid-cols-2"
    >
      {promoTiles.map((tile) => (
        <PromoTile
          key={tile.handle}
          title={tile.title}
          href={`/search/${tile.handle}`}
          src={tile.image}
          labelPosition={tile.labelPosition}
          className="aspect-[4/3] md:aspect-square"
        />
      ))}
    </section>
  );
}

/* ----------------------------------------------------------- philosophy */

function Philosophy() {
  return (
    <section aria-labelledby="philosophy">
      <div className="shell flex flex-col items-center py-12 text-center md:py-16">
        <Eyebrow>{estatePhilosophy.eyebrow}</Eyebrow>
        <Headline id="philosophy" className="mt-5">
          {estatePhilosophy.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </Headline>
        <div className="mt-6 max-w-4xl space-y-5">
          {estatePhilosophy.body.map((paragraph, index) => (
            <p
              key={paragraph}
              className={clsx(
                "body-mono text-pretty tracking-normal",
                index === 0 ? "text-ui" : "text-ink"
              )}
            >
              {paragraph}
            </p>
          ))}
        </div>
        <Link href={estatePhilosophy.href} className="link-arrow mt-8">
          {estatePhilosophy.cta} <span aria-hidden>&rarr;</span>
        </Link>
      </div>

      <div className="pb-12 md:pb-16">
        <EstateReel items={estateReel} label="Life in the sanctuary" />
      </div>
    </section>
  );
}

async function LatestBlends() {
  const products = (
    await productsFrom("blend", { sortKey: "CREATED_AT", reverse: true })
  ).slice(0, 9);

  if (!products.length) return null;

  return (
    <section aria-labelledby="curated-edits">
      <SectionHead
        eyebrow="Curated Edits"
        title={<span id="curated-edits">Warmth & Texture</span>}
        count={products.length}
        action="View all"
        actionHref="/search"
      />
      <ul className="rule-y grid grid-cols-1 divide-y divide-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
        {products.slice(0, 3).map((product) => (
          <li key={product.handle}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- about */

function About() {
  return (
    <section aria-labelledby="about" className="rule-b">
      <div className="shell py-12 text-center md:py-16">
        <Eyebrow>About us</Eyebrow>
        <Headline
          id="about"
          size="lg"
          className="mx-auto mt-5 max-w-5xl text-pretty"
        >
          {aboutStatement}
        </Headline>
      </div>

      <Carousel label="About Kozy Living" perView={2}>
        {aboutCards.flatMap((copy, index) => [
          <div key={`copy-${index}`} className="h-full p-6">
            <p className="body-mono">{copy}</p>
          </div>,
          <div key={`image-${index}`} className="h-full p-3">
            <div className="plate aspect-[4/3] w-full">
              <Image
                src={
                  index % 2 === 0
                    ? "/cozy-living-room.jpg"
                    : "/cozy-ceramics.jpg"
                }
                alt="Kozy Living craftsmanship"
                fill
                sizes="(min-width: 640px) 50vw, 85vw"
                className="object-cover"
              />
            </div>
          </div>,
        ])}
      </Carousel>
    </section>
  );
}

/* --------------------------------------------------------- single origin / catalog */

async function SingleOrigin() {
  const products = (
    await productsFrom("single-origin", { sortKey: "RELEVANCE" })
  ).slice(0, 16);

  if (!products.length) return null;

  return (
    <section aria-labelledby="catalog">
      <SectionHead
        eyebrow="Studio Catalog"
        title={<span id="catalog">Objects by Space & Material</span>}
        count={products.length}
      />
      <ProductTable products={products} />
    </section>
  );
}

/* ------------------------------------------------------ spotlight */

async function BrewOfTheMonth() {
  let product: Product | undefined;
  try {
    const [first] = await getProducts({ sortKey: "BEST_SELLING" });
    product = first;
  } catch {
    return null;
  }

  if (!product) return null;

  const price = product.priceRange.minVariantPrice;
  const band = Array.from({ length: 8 }, () => featureBand.label);

  return (
    <section aria-labelledby="feature" className="rule-t">
      <div className="rule-b py-2">
        <Marquee
          phrases={band}
          size="display"
          separator="↓↓↓↓"
          duration={45}
          className="text-oxblood"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-3">
          <div className="plate aspect-square w-full">
            {product.featuredImage?.url ? (
              <Image
                src={product.featuredImage.url}
                alt={product.featuredImage.altText || product.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain p-10"
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-center border-rule p-6 lg:border-l lg:p-10">
          <Eyebrow align="left">{featureBand.eyebrow}</Eyebrow>
          <Headline id="feature" className="mt-4">
            {product.title}
          </Headline>
          <p className="ui-mono mt-4">
            <Price amount={price.amount} currencyCode={price.currencyCode} />
          </p>
          {product.description ? (
            <p className="body-mono mt-6 max-w-measure">
              {product.description.slice(0, 260)}
              {product.description.length > 260 ? "…" : ""}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/product/${product.handle}`}
              className="btn-outline"
            >
              View piece <span aria-hidden>&rarr;</span>
            </Link>
            <Link href="/search" className="link-arrow self-center">
              All objects <span aria-hidden>&rarr;</span>
            </Link>
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
    </section>
  );
}

/* ---------------------------------------------------------------- accents */

async function Merch() {
  const products = (await productsFrom("merch")).slice(0, 3);
  if (!products.length) return null;

  return (
    <section aria-labelledby="accents">
      <SectionHead
        eyebrow="Accents"
        title={<span id="accents">Textiles & Accents</span>}
        count={products.length}
      />
      <ul className="rule-y grid grid-cols-1 divide-y divide-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.handle}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- guides */

function Guides() {
  return (
    <section
      aria-labelledby="guides"
      className="rule-b grid grid-cols-1 items-center lg:grid-cols-2"
    >
      <div className="p-6 text-center lg:p-16">
        <Eyebrow>{guidesFeature.eyebrow}</Eyebrow>
        <Headline id="guides" className="mt-4">
          {guidesFeature.title}
        </Headline>
        <p className="body-mono mx-auto mt-5 max-w-measure text-balance">
          {guidesFeature.body}
        </p>
        <Link href={guidesFeature.href} className="btn-outline mt-8">
          {guidesFeature.cta} <span aria-hidden>&rarr;</span>
        </Link>
      </div>
      <div className="p-3">
        <div className="plate aspect-[4/3] w-full">
          <Image
            src="/cozy-living-room.jpg"
            alt="Interior design styling"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- journal */

async function Journal() {
  const articles = await getArticles(3).catch(() => []);

  return (
    <section aria-labelledby="journal">
      <SectionHead
        eyebrow="Dispatch"
        title={<span id="journal">From the Living Journal</span>}
        action="More entries"
        actionHref="/blogs"
      />
      <ul className="rule-y grid grid-cols-1 divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0">
        {articles.length
          ? articles.map((article, index) => (
              <li key={article.id} className="p-3">
                <ArticleCard article={article} index={index} />
              </li>
            ))
          : journalPosts.map((post, index) => (
              <li key={post.slug} className="p-3">
                <article>
                  <div className="plate aspect-[4/3] w-full">
                    <Image
                      src={
                        [
                          "/cozy-living-room.jpg",
                          "/cozy-ceramics.jpg",
                          "/cozy-living-room.jpg",
                        ][index] ??
                        "/cozy-ceramics.jpg"
                      }
                      alt={post.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <h3 className="serif mt-4 text-display-sm">{post.title}</h3>
                  <p className="body-mono mt-3">{post.excerpt}</p>
                  <Link href="/blogs" className="link-arrow mt-4">
                    Read more <span aria-hidden>&rarr;</span>
                  </Link>
                </article>
              </li>
            ))}
      </ul>
    </section>
  );
}
