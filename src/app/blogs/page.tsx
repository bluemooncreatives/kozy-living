import Link from "next/link";
import { Metadata } from "next";
import ArticleCard from "@/components/blog/article-card";
import { SectionHead } from "@/components/ui/section";
import { getArticles, getBlogs } from "@/lib/shopify";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Living Journal",
  description: `Notes on mindful living, interior styling, tactile materials, and craftsmanship, straight from ${site.origin}.`,
  openGraph: { type: "website" },
};

// Articles are edited in Shopify Admin independently of deploys; the `blogs`
// cache tag is invalidated by the article webhook, so this can stay cached.
export const revalidate = 3600;

export default async function BlogsIndex() {
  const [articles, blogs] = await Promise.all([
    getArticles(24).catch(() => []),
    getBlogs().catch(() => []),
  ]);

  return (
    <>
      <SectionHead
        eyebrow="Dispatch"
        title="From the Living Journal"
        count={articles.length || undefined}
      />

      {blogs.length > 1 ? (
        <nav aria-label="Blogs" className="shell rule-y py-4">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {blogs.map((blog) => (
              <li key={blog.handle}>
                <Link
                  href={blog.path}
                  className="ui-mono transition-opacity hover:opacity-60"
                >
                  {blog.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {articles.length ? (
        <ul className="rule-y grid grid-cols-1 divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0">
          {articles.map((article, index) => (
            <li key={article.id} className="p-3">
              <ArticleCard
                article={article}
                index={index}
                priority={index < 3}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="shell rule-y py-16 text-center">
          <p className="body-mono">
            No posts yet. Publish an article in Shopify and it will appear here.
          </p>
        </div>
      )}
    </>
  );
}
