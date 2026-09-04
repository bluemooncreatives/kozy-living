import Prose from "@/components/prose";
import { Eyebrow } from "@/components/ui/section";
import { getPage } from "@/lib/shopify";
import { site } from "@/lib/site";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page: handle } = await params;
  const page = await getPage(handle);

  if (!page) return notFound();

  return {
    title: page.seo?.title || page.title,
    description: page.seo?.description || page.bodySummary,
    openGraph: {
      publishedTime: page.createdAt,
      modifiedTime: page.updatedAt,
      type: "article",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: handle } = await params;
  const page = await getPage(handle);

  if (!page) return notFound();

  return (
    <article className="shell max-w-3xl py-4">
      <Eyebrow align="left">{site.name}</Eyebrow>
      <h1 className="serif mt-4 text-display-xl">{page.title}</h1>
      <hr className="my-8 border-rule" />
      <Prose html={page.body as string} />
      <p className="eyebrow mt-14 border-t border-rule pt-6 text-muted">
        {`Last updated ${new Intl.DateTimeFormat(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(page.updatedAt))}`}
      </p>
    </article>
  );
}
