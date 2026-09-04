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
        <nav aria-label="Blogs" className="shell pb-6">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {blogs.map((blog) => (
              <li key={blog.handle}>
                <Link
                  href={blog.path}
                  className="pill"
                >
                  {blog.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {articles.length ? (
        <ul className="shell grid grid-cols-1 gap-3 pb-14 md:grid-cols-3">
          {articles.map((article, index) => (
            <li key={article.id}>
              <ArticleCard
                article={article}
                index={index}
                priority={index < 3}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="shell"><div className="panel px-8 py-20 text-center">
          <p className="body-mono">
            No posts yet. Publish an article in Shopify and it will appear here.
          </p>
        </div></div>
      )}
    </>
  );
}
