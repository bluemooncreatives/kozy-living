import clsx from "clsx";
import Link from "next/link";
import { Suspense } from "react";
import {
  getArticles,
  getCollectionProducts,
  getPrimaryMenu,
  getProducts,
} from "@/lib/shopify";
import { shopCategories } from "@/lib/menu";
import { Product } from "@/lib/shopify/types";
import ProductCard from "@/components/product-card";
import ArticleCard from "@/components/blog/article-card";
import Price from "@/components/price";
import Marquee from "@/components/ui/marquee";
import Carousel from "@/components/ui/carousel";
import Plate from "@/components/ui/plate";
import Seal from "@/components/ui/seal";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import CollectionPillRail from "@/components/ui/collection-pill-rail";
import {
  displayFace,
  Eyebrow,
  Headline,
  SectionHead,
} from "@/components/ui/section";
import {
  boldStatement,
  brandPartners,
  ctaBand,
  restTicker,
  experienceBand,
  featureBand,
  guidesFeature,
  hero,
  lookbook,
  journalPosts,
  site,
  testimonial,
} from "@/lib/site";

export const metadata = {
  title: `${site.name} - ${site.tagline}`,
  description: site.description,
  openGraph: { type: "website" },
};

/**
 * Homepage. Section order follows the reference layout top to bottom:
 * hero frame + wordmark → meta rule → bold statement + staggered lookbook →
 * category pills → bestsellers → experience band → material strip →
 * testimonial → rest ticker → new arrivals → spotlight → journal →
 * closing "shop now" band.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <BoldStatement />

      <Suspense fallback={null}>
        <CollectionFilters />
      </Suspense>

      <Suspense fallback={<RailFallback />}>
        <Bestsellers />
      </Suspense>

      <ExperienceBand />
      <MaterialStrip />
      <Testimonial />
      <RestTicker />

      <Suspense fallback={null}>
        <CuratedEdits />
      </Suspense>

      <Suspense fallback={null}>
        <Spotlight />
      </Suspense>

      <Guides />

      <Suspense fallback={null}>
        <Journal />
      </Suspense>

      <ClosingBand />
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

/**
 * One photographic frame with everything laid over it: the origin flag and
 * blurb top-left, the CTA pill top-right, and the wordmark crossing the
 * frame's bottom edge so it reads as ink on both the photograph and the page.
 */
function Hero() {
  return (
    <section className="shell pt-[var(--hero-gap)]">
      <Plate
        aspect={null}
        priority
        tone={2}
        placeholderText="kozy"
        className="hero-frame w-full"
        sizes="100vw"
        alt="A floor lounge set with waffle weave and slub cotton Kompanions in warm daylight."
      >
        {/* One row at md and up, a stack below it. Absolutely positioning the
            flag and the pill in opposite corners collided on a phone the
            moment the CTA label grew. */}
        <div className="absolute inset-x-3 top-3 z-20 flex flex-col items-start gap-3 md:inset-x-5 md:top-5 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="glass md:max-w-[19rem]">
            <p className="flex items-center gap-1.5 text-ui font-semibold text-paper">
              <span aria-hidden className="text-sage">
                ✳
              </span>
              {hero.flag}
            </p>
            <p className="mt-2 text-spec leading-relaxed text-paper/90">
              {hero.blurb}
            </p>
          </div>

          <Link href={hero.ctaHref} className="btn-solid shrink-0">
            {hero.cta}
          </Link>
        </div>

        {/* The wordmark now sits inside the frame rather than straddling its
            bottom edge. Indigo type needs a light base to land on, so the
            bottom of the photograph is lifted towards ivory rather than
            darkened - darkening would fight the colour the wordmark is set in. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-[5] h-1/3 bg-gradient-to-t from-ivory/75 via-ivory/25 to-transparent"
        />

        <p
          aria-hidden
          className="wordmark pointer-events-none absolute inset-x-0 bottom-2 z-10 select-none whitespace-nowrap px-2 text-center leading-[0.9] text-ink md:bottom-4"
        >
          {hero.wordmark}
        </p>

        <div className="absolute bottom-4 left-4 z-20 hidden md:block lg:left-8">
          <Seal text={hero.seal} size="md" />
        </div>
      </Plate>

      {/* Meta rule under the frame. */}
      <div className="flex items-center justify-between pb-10 pt-4">
        <p className="eyebrow">{hero.metaLeft}</p>
        <p className="eyebrow">{hero.metaRight}</p>
      </div>

      <h1 className="sr-only">
        {site.name} - {site.tagline}
      </h1>
    </section>
  );
}

/* ------------------------------------------------- statement + lookbook */

/**
 * The oversized statement, then the staggered lookbook cluster beneath it.
 * Each plate carries its own vertical lift so the row zigzags; the connecting
 * paragraph sits in the gap the tallest plates leave open at the top.
 */
function BoldStatement() {
  const lift = ["lg:mt-0", "lg:mt-24", "lg:mt-14", "lg:mt-32", "lg:mt-6"];
  const span = { tall: "5/7", mid: "4/5", short: "3/4" } as const;

  return (
    <section aria-labelledby="statement" className="shell pb-10 md:pb-16">
      <div className="flex items-end justify-between gap-8">
        <h2 id="statement" className={clsx(displayFace, "text-display-xl")}>
          {boldStatement.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <ArrowDownRight className="mb-2 hidden h-10 w-10 shrink-0 md:block md:h-16 md:w-16" />
      </div>

      <div className="relative mt-8 md:mt-10">
        {/* On wide screens this drops into the notch the staggered plates
            leave open; below that it is simply the paragraph after the head. */}
        <p className="body-mono mb-6 max-w-measure lg:absolute lg:left-[22%] lg:top-0 lg:z-10 lg:mb-0 lg:max-w-[22rem]">
          {boldStatement.body}
        </p>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:items-start">
          {lookbook.map((item, index) => (
            <li key={item.title} className={clsx(lift[index])}>
              <Link
                href={`/search/${item.handle}`}
                className="group block"
                prefetch={false}
              >
                <Plate
                  aspect={span[item.span]}
                  arrow
                  arrowTone={index === 1 ? "sage" : "cream"}
                  tag={item.tag}
                  title={item.title}
                  tone={(index % 4) as 0 | 1 | 2 | 3}
                  placeholderText={item.tag}
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The heavy ↘ that answers the statement. Drawn to match the display weight. */
function ArrowDownRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7l10 10" />
      <path d="M17 8v9H8" />
    </svg>
  );
}

/* --------------------------------------------------------------- filters */

async function CollectionFilters() {
  const categories = shopCategories(await getPrimaryMenu());
  if (!categories.length) return null;

  return (
    <section aria-label="Browse categories" className="shell pb-10 md:pb-14">
      <CollectionPillRail items={categories} />
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
        title={<span id="bestsellers">Loved in real homes</span>}
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
    <div className="shell py-16">
      <div className="mx-auto h-10 w-64 animate-pulse rounded-chip bg-wash" />
      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="panel p-3">
            <div className="plate aspect-square w-full animate-pulse" />
            <div className="mt-4 h-4 w-2/3 animate-pulse rounded-chip bg-wash" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- experience band */

/**
 * The asymmetric band: one wide photographic panel, and beside it a sage
 * statement card stacked over a smaller panel.
 */
function ExperienceBand() {
  return (
    <section
      aria-label="Why shop with us"
      className="shell grid grid-cols-1 gap-3 py-10 md:py-14 lg:grid-cols-[1.55fr_1fr]"
    >
      <Link href={experienceBand.wide.href} className="group block">
        <Plate
          aspect="16/10"
          arrow
          tone={1}
          placeholderText="warmth"
          caption={experienceBand.wide.caption}
          className="h-full"
          sizes="(min-width: 1024px) 60vw, 100vw"
          alt="A corner of a room layered with floor pillows, a throw and a linen blend cushion."
        />
      </Link>

      <div className="grid gap-3">
        <Link
          href={experienceBand.accent.href}
          className="panel-sage group relative flex flex-col justify-between overflow-hidden p-6 md:p-8"
        >
          <span aria-hidden className="text-2xl leading-none">
            ✳
          </span>
          <div className="mt-10">
            <span className="chip">{experienceBand.accent.chip}</span>
            <h2 className="serif mt-4 text-display-md">
              {experienceBand.accent.title}
            </h2>
          </div>
          <span className="arrow-btn absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
            <ArrowUpRight />
          </span>
        </Link>

        <Link href={experienceBand.small.href} className="group block">
          <Plate
            aspect="16/10"
            arrow
            tone={3}
            placeholderText="detail"
            caption={experienceBand.small.caption}
            className="h-full"
            sizes="(min-width: 1024px) 35vw, 100vw"
            alt="A Dabu hand-block print in indigo, close on the weave."
          />
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- material strip */

/** Hairline band of material and ethics credentials, set as wordmarks. */
function MaterialStrip() {
  return (
    <section aria-label="Our standards" className="rule-y bg-card">
      <ul className="shell flex flex-wrap items-center justify-between gap-x-8 gap-y-5 py-7">
        {brandPartners.map((partner) => (
          <li
            key={partner}
            className="serif text-display-sm uppercase tracking-[0.08em] text-ink/70"
          >
            {partner}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------- testimonial */

/** Portrait plate beside a black quote card - the reference's quiet moment. */
function Testimonial() {
  return (
    <section
      aria-label="What our customers say"
      className="shell grid grid-cols-1 gap-3 py-10 md:py-14 lg:grid-cols-2"
    >
      <Plate
        aspect="4/3"
        tone={0}
        placeholderText="kraft"
        className="h-full min-h-[18rem]"
        sizes="(min-width: 1024px) 50vw, 100vw"
        alt="Cloth on the studio table mid-way through a hand-block print run."
      />

      <figure className="panel-ink flex flex-col justify-center p-8 md:p-12">
        <span
          aria-hidden
          className="serif text-[4rem] leading-[0.6] text-sage md:text-[5rem]"
        >
          &rdquo;
        </span>
        <blockquote className="mt-6">
          <p className="serif text-display-md text-paper">
            &ldquo;{testimonial.quote}&rdquo;
          </p>
        </blockquote>
        <figcaption className="mt-8">
          <p className="ui-mono font-semibold text-paper">{testimonial.name}</p>
          <p className="spec-mono mt-1">{testimonial.role}</p>
        </figcaption>
      </figure>
    </section>
  );
}

/* ------------------------------------------------------------ rest ticker */

/** Full-bleed ticker, each repeat punctuated by the sage asterisk. */
function RestTicker() {
  return (
    <section aria-label="Moments of rest" className="rule-y py-5 md:py-7">
      <Marquee
        phrases={Array.from({ length: restTicker.repeat }, () =>
          restTicker.label
        )}
        size="display"
        separator="✳"
        separatorTone="sage"
        duration={38}
        className="[--sep-scale:1.4]"
      />
    </section>
  );
}

/* ------------------------------------------------------------ commerce */

async function CuratedEdits() {
  const products = (
    await productsFrom("blend", { sortKey: "CREATED_AT", reverse: true })
  ).slice(0, 3);

  if (!products.length) return null;

  return (
    <section aria-labelledby="curated-edits">
      <SectionHead
        eyebrow="Just In"
        title={<span id="curated-edits">New Kompanions</span>}
        count={products.length}
        action="View all"
        actionHref="/search"
      />
      <ul className="shell grid grid-cols-1 gap-3 pb-10 sm:grid-cols-2 lg:grid-cols-3 md:pb-14">
        {products.map((product) => (
          <li key={product.handle}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- spotlight */

async function Spotlight() {
  let product: Product | undefined;
  try {
    const [first] = await getProducts({ sortKey: "BEST_SELLING" });
    product = first;
  } catch {
    return null;
  }

  if (!product) return null;

  const price = product.priceRange.minVariantPrice;

  return (
    <section aria-labelledby="feature" className="shell py-10 md:py-14">
      <div className="panel grid grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div className="p-3">
          <Plate
            src={product.featuredImage?.url}
            alt={product.featuredImage?.altText || product.title}
            aspect="1/1"
            placeholderText="spotlight"
            tone={2}
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>

        <div className="flex flex-col justify-center p-6 md:p-12">
          <Eyebrow align="left">{featureBand.eyebrow}</Eyebrow>
          <Headline id="feature" size="lg" className="mt-4">
            {product.title}
          </Headline>
          <p className="ui-mono mt-4 font-semibold">
            <Price amount={price.amount} currencyCode={price.currencyCode} />
          </p>
          {product.description ? (
            <p className="body-mono mt-5 max-w-measure">
              {product.description.slice(0, 240)}
              {product.description.length > 240 ? "…" : ""}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={`/product/${product.handle}`} className="btn-solid">
              View piece
            </Link>
            <Link href="/search" className="link-arrow">
              All objects <ArrowUpRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- guides */

function Guides() {
  return (
    <section
      aria-labelledby="guides"
      className="shell grid grid-cols-1 items-stretch gap-3 pb-10 md:pb-14 lg:grid-cols-2"
    >
      <div className="panel flex flex-col justify-center p-8 md:p-12">
        <Eyebrow align="left">{guidesFeature.eyebrow}</Eyebrow>
        <Headline id="guides" size="lg" className="mt-4">
          {guidesFeature.title}
        </Headline>
        <p className="body-mono mt-5 max-w-measure">{guidesFeature.body}</p>
        <Link href={guidesFeature.href} className="btn-solid mt-8 self-start">
          {guidesFeature.cta}
        </Link>
      </div>
      <Link href={guidesFeature.href} className="group block">
        <Plate
          aspect="4/3"
          arrow
          tone={1}
          placeholderText="guides"
          className="h-full min-h-[16rem]"
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt="Fibre swatches and print blocks laid out on the studio table."
        />
      </Link>
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
      <ul className="shell grid grid-cols-1 gap-3 pb-10 md:grid-cols-3 md:pb-14">
        {articles.length
          ? articles.map((article, index) => (
              <li key={article.id}>
                <ArticleCard article={article} index={index} />
              </li>
            ))
          : journalPosts.map((post, index) => (
              <li key={post.slug}>
                <Link href="/blogs" className="group block">
                  <Plate
                    aspect="4/3"
                    arrow
                    tone={(index % 4) as 0 | 1 | 2 | 3}
                    placeholderText="journal"
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                  <h3 className="serif mt-4 text-display-sm">{post.title}</h3>
                  <p className="body-mono mt-2 line-clamp-3">{post.excerpt}</p>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------- closing band */

/** Mirrors the hero: one frame, a pill, a paragraph, and the wordmark. */
function ClosingBand() {
  return (
    <section
      aria-label="Start shopping"
      className="shell overflow-x-clip pb-[9vw] pt-4"
    >
      <div className="relative">
        <Plate
          aspect="2/1"
          tone={3}
          placeholderText="home"
          className="w-full min-h-[22rem]"
          sizes="100vw"
          alt="A lived-in floor lounge: biscuit pillows, a waffle throw and an unhurried morning."
        >
          <div className="absolute inset-x-3 top-3 z-20 flex flex-col items-start gap-3 md:inset-x-5 md:top-5 md:flex-row md:items-start md:justify-between md:gap-6">
            <Link href={ctaBand.href} className="btn-solid shrink-0">
              {ctaBand.pill}
            </Link>
            <p className="max-w-[22rem] text-spec text-paper/90 md:max-w-[18rem] md:text-right">
              {ctaBand.body}
            </p>
          </div>
        </Plate>

        <Link
          href={ctaBand.href}
          aria-label={ctaBand.wordmark}
          className="wordmark absolute inset-x-0 bottom-0 z-10 block translate-y-[46%] select-none whitespace-nowrap text-center leading-[0.78] text-ink"
        >
          {ctaBand.wordmark}
        </Link>

        <div className="absolute bottom-0 hidden md:block right-4 z-20 translate-y-[28%] md:right-12">
          <Seal text={ctaBand.seal} size="md" reverse />
        </div>
      </div>
    </section>
  );
}
