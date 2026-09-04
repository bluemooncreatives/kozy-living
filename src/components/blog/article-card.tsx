import Link from "next/link";
import clsx from "clsx";
import Plate from "@/components/ui/plate";
import { Article } from "@/lib/shopify/types";

export function formatArticleDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * Journal cell. A plate with the corner ↗, then the dateline, the headline,
 * and the excerpt.
 *
 * An article without an image gets the plate's own toned placeholder rather
 * than a house image standing in for editorial photography - the previous
 * fallback list pointed at four files that do not exist in `public/`, so every
 * imageless article rendered a broken image.
 */
export default function ArticleCard({
  article,
  index = 0,
  sizes = "(min-width: 768px) 33vw, 100vw",
  priority = false,
  className,
}: {
  article: Article;
  index?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <article className={clsx("group h-full", className)}>
      <Link href={article.path} className="block">
        <Plate
          src={article.image?.url}
          alt={article.image?.altText || article.title}
          aspect="4/3"
          arrow
          priority={priority}
          sizes={sizes}
          tone={(index % 4) as 0 | 1 | 2 | 3}
          placeholderText="journal"
        />
        <p className="eyebrow mt-4 text-muted">
          {article.blogTitle}
          {article.publishedAt
            ? ` · ${formatArticleDate(article.publishedAt)}`
            : ""}
        </p>
        <h3 className="serif mt-2 text-display-sm text-balance">
          {article.title}
        </h3>
        {article.excerpt ? (
          <p className="body-mono mt-2 line-clamp-3">{article.excerpt}</p>
        ) : null}
      </Link>
    </article>
  );
}
