import ActionButton from "@/components/ui/action-button";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import { Eyebrow, Headline } from "@/components/ui/section";
import {
  faqJsonLd,
  homeFaqData,
  productFaqData,
  type FaqBoardData,
} from "@/lib/shop/faq";
import { getAddOns, getCollections } from "@/lib/shopify";
import type { Product, ProductAddOn } from "@/lib/shopify/types";
import { faq } from "@/lib/site";
import Link from "next/link";
import FaqBoard, { HomeFaqBoard } from "./faq-board";

/**
 * The FAQ band, on the homepage and every product page.
 *
 * Server-rendered around a small client island: the head, the studio panel
 * and the JSON-LD are static per request; only the open answer and, on product
 * pages, the selected topic are client state.
 *
 * Both callers stream it behind Suspense. The homepage reads live add-ons;
 * product pages also check live collection handles for their shop links.
 */

async function liveCollections() {
  return new Set(
    (await getCollections().catch(() => [])).map((c) => c.handle),
  );
}

export async function HomeFaq() {
  const addOns = await getAddOns().catch(() => []);

  return <FaqSection id="faq" data={homeFaqData({ addOns })} />;
}

export async function ProductFaq({
  product,
  addOns,
}: {
  product: Product;
  /** Already fetched by the page for the buy panel. */
  addOns: ProductAddOn[];
}) {
  const collections = await liveCollections();

  return (
    <FaqSection
      id="product-faq"
      data={productFaqData({ product, collections, addOns })}
    />
  );
}

function FaqSection({ id, data }: { id: string; data: FaqBoardData }) {
  if (!data.topics.length) return null;

  const home = id === "faq";
  const headId = `${id}-title`;
  const { help } = faq;
  const head = (
    <div className={home ? "faq-home-head" : "faq-head"}>
      <Eyebrow align="left">{data.eyebrow}</Eyebrow>
      <Headline id={headId} size="lg" className="mt-3">
        {data.title}
      </Headline>
      <p data-reveal="" className="body-mono mt-4 max-w-[26rem]">
        {data.lede}
      </p>
    </div>
  );
  const board = home
    ? <HomeFaqBoard items={data.topics[0]!.items} />
    : <FaqBoard topics={data.topics} />;

  return (
    <section
      id={id}
      aria-labelledby={headId}
      className={home
        ? "faq-home-section scroll-mt-[calc(var(--header-h)+1rem)] py-14 md:py-24"
        : "shell scroll-mt-[calc(var(--header-h)+1rem)] py-12 md:py-20"}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(data.topics)),
        }}
      />

      <div className={home ? "shell faq-home-layout" : "faq-grid"}>
        {home ? <div className="faq-home-grid">{head}{board}</div> : <>{head}{board}</>}

        <aside
          data-reveal=""
          aria-label={help.title}
          className="faq-help panel-ink"
        >
          {/* Graphic, not text: a whisper of oat that carries no contrast
              duty, like the mood page's ghost numeral. */}
          <span aria-hidden className="faq-help-ghost display-face">
            ?
          </span>
          <div>
            <p className="eyebrow">{help.eyebrow}</p>
            <h3 className="serif mt-3 text-display-md">{help.title}</h3>
            <p className="body-mono mt-3 max-w-[26rem]">{help.body}</p>
          </div>
          <div className="mt-6 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 md:mt-0">
            <ActionButton
              label={help.primary.label}
              href={help.primary.href}
              icon="arrow"
              variant="glass"
              target="_blank"
              rel="noopener noreferrer"
            />
            <Link href={help.secondary.href} className="link-arrow text-oat">
              {help.secondary.label} <ArrowUpRight />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

/**
 * Reserves the FAQ's main rows while Shopify data streams.
 */
export function FaqFallback({ home = false }: { home?: boolean }) {
  const head = (
    <div className={home ? "faq-home-head" : "faq-head"}>
      <div className="h-3 w-32 animate-pulse rounded-chip bg-wash" />
      <div className="mt-4 h-12 w-3/4 animate-pulse rounded-chip bg-wash" />
    </div>
  );
  const list = (
    <div className={home ? "faq-home-list" : "faq-list"}>
      {Array.from({ length: home ? 10 : 4 }).map((_, index) => (
        <div key={index} className="rule-b py-7">
          <div className="h-5 w-2/3 animate-pulse rounded-chip bg-wash" />
        </div>
      ))}
    </div>
  );

  return (
    <div aria-hidden className={home
      ? "faq-home-section py-14 md:py-24"
      : "shell py-12 md:py-20"}>
      <div className={home ? "shell faq-home-layout" : "faq-grid"}>
        {home ? <div className="faq-home-grid">{head}{list}</div> : <>{head}{list}</>}
        {home ? <div className="faq-help panel-ink h-40 md:h-44" /> : null}
      </div>
    </div>
  );
}
