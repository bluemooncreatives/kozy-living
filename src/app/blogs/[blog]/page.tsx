import { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/blog/article-card";
import { SectionHead } from "@/components/ui/section";
import { getBlog, getBlogs } from "@/lib/shopify";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const blogs = await getBlogs();
    return blogs.map((blog) => ({ blog: blog.handle }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ blog: string }>;
}): Promise<Metadata> {
  const { blog: handle } = await params;
  const blog = await getBlog(handle);

  if (!blog) return notFound();

  return {
    title: blog.seo?.title || blog.title,
    description: blog.seo?.description || `Posts from ${blog.title}.`,
    openGraph: { type: "website" },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ blog: string }>;
}) {
  const { blog: handle } = await params;
  const blog = await getBlog(handle);

  if (!blog) return notFound();

  return (
    <>
      <SectionHead
        eyebrow="Dispatch"
        title={blog.title}
        count={blog.articles.length || undefined}
        action="All posts"
        actionHref="/blogs"
      />

      {blog.articles.length ? (
        <ul className="rule-y grid grid-cols-1 divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0">
          {blog.articles.map((article, index) => (
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
          <p className="body-mono">This blog has no published posts yet.</p>
        </div>
      )}
    </>
  );
}
