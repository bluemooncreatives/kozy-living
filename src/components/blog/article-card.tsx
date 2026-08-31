import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Article } from "@/lib/shopify/types";

/** Shopify articles carry no image until one is uploaded - fall back to the
 *  house plate art rather than collapsing the card's aspect ratio. */
const FALLBACK_IMAGES = [
  "/sales-collection.png",
  "/mens-collection.png",
  "/kids-collection.png",
  "/banner.png",
];

export function formatArticleDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

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
  const fallback = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]!;

  return (
    <article className={clsx("group", className)}>
      <Link href={article.path} className="block">
        <div className="plate aspect-[4/3] w-full">
          <Image
            src={article.image?.url ?? fallback}
            alt={article.image?.altText || article.title}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <p className="eyebrow mt-4">
          {article.blogTitle}
          {article.publishedAt
            ? ` · ${formatArticleDate(article.publishedAt)}`
            : ""}
        </p>
        <h3 className="serif mt-2 text-display-sm text-balance">
          {article.title}
        </h3>
        {article.excerpt ? (
          <p className="body-mono mt-3 line-clamp-3">{article.excerpt}</p>
        ) : null}
        <span className="link-arrow mt-4">
          Read more <span aria-hidden>&rarr;</span>
        </span>
      </Link>
    </article>
  );
}
