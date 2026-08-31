import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Prose from "@/components/prose";
import ArticleCard, { formatArticleDate } from "@/components/blog/article-card";
import { Eyebrow, Headline } from "@/components/ui/section";
import { getArticle, getBlog } from "@/lib/shopify";
import { site } from "@/lib/site";

export const revalidate = 3600;

type Params = Promise<{ blog: string; article: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { blog: blogHandle, article: handle } = await params;
  const article = await getArticle(blogHandle, handle);

  if (!article) return notFound();

  const description =
    article.seo?.description || article.excerpt || site.description;

  return {
    title: article.seo?.title || article.title,
    description,
    openGraph: {
      type: "article",
      title: article.title,
      description,
      publishedTime: article.publishedAt,
      ...(article.image
        ? {
            images: [
              {
                url: article.image.url,
                width: article.image.width,
                height: article.image.height,
                alt: article.image.altText || article.title,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { blog: blogHandle, article: handle } = await params;
  const article = await getArticle(blogHandle, handle);

  if (!article) return notFound();

  // Siblings from the same blog, minus this post - the "keep reading" rail.
  const blog = await getBlog(article.blogHandle, 8).catch(() => undefined);
  const related =
    blog?.articles.filter((item) => item.id !== article.id).slice(0, 3) ?? [];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    datePublished: article.publishedAt,
    description: article.excerpt || undefined,
    image: article.image?.url ? [article.image.url] : undefined,
    author: {
      "@type": "Person",
      name: article.authorV2?.name || site.name,
    },
    publisher: { "@type": "Organization", name: site.name },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\u003c"),
        }}
      />

      <div className="shell py-12 md:py-16">
        <article className="mx-auto max-w-3xl">
          <Eyebrow align="left">
            <Link href={`/blogs/${article.blogHandle}`} className="hover:opacity-60">
              {article.blogTitle}
            </Link>
          </Eyebrow>

          <Headline as="h1" className="mt-5">
            {article.title}
          </Headline>

          <p className="spec-mono mt-5">
            {[
              article.publishedAt && formatArticleDate(article.publishedAt),
              article.authorV2?.name && `By ${article.authorV2.name}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {article.image ? (
            <div className="plate mt-10 aspect-[16/9] w-full">
              <Image
                src={article.image.url}
                alt={article.image.altText || article.title}
                fill
                priority
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}

          <hr className="my-10 border-rule" />

          {article.contentHtml ? (
            <Prose html={article.contentHtml} />
          ) : (
            <p className="body-mono">{article.excerpt}</p>
          )}

          {article.tags?.length ? (
            <ul className="mt-12 flex flex-wrap gap-2 border-t border-rule pt-6">
              {article.tags.map((tag) => (
                <li key={tag} className="badge">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          <Link href="/blogs" className="link-arrow mt-12">
            All posts <span aria-hidden>&rarr;</span>
          </Link>
        </article>
      </div>

      {related.length ? (
        <section aria-labelledby="keep-reading" className="rule-t">
          <div className="shell py-12 text-center md:py-16">
            <Eyebrow>Keep reading</Eyebrow>
            <Headline id="keep-reading" size="lg" className="mt-4">
              More from {article.blogTitle}
            </Headline>
          </div>
          <ul className="rule-y grid grid-cols-1 divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0">
            {related.map((item, index) => (
              <li key={item.id} className="p-3">
                <ArticleCard article={item} index={index} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
