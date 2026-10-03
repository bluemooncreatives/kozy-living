import Link from "next/link";
import {
  getCatalog,
  getPrimaryMenu,
  isFrameworkControlFlowError,
} from "@/lib/shopify";
import { sameCategoryFor } from "@/lib/shop/same-category";
import type { Product } from "@/lib/shopify/types";
import { productDiscovery } from "@/lib/site";
import Plate from "@/components/ui/plate";
import ActionButton from "@/components/ui/action-button";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import { Headline } from "@/components/ui/section";
import Price from "@/components/price";

export default async function CategoryShelf({ product }: { product: Product }) {
  const data = await Promise.all([getCatalog(), getPrimaryMenu()]).catch(
    (error: unknown) => {
      if (isFrameworkControlFlowError(error)) throw error;
      console.error("Unable to load the product category shelf", error);
      return null;
    },
  );
  if (!data) return null;
  const [catalog, menu] = data;
  const category = sameCategoryFor(product, catalog, menu);
  if (!category) return null;
  const shelf = category.products.slice(0, 4);

  return (
    <section
      className="category-shelf shell"
      aria-labelledby="category-shelf-title"
    >
      <div className="category-shelf-heading">
        <Headline id="category-shelf-title" size="lg" split={false}>
          {productDiscovery.title}
        </Headline>
        <ActionButton
          label={`${productDiscovery.browse} ${category.title}`}
          href={`/search/${category.handle}`}
          icon="arrow"
          variant="outline"
        />
      </div>
      <ul className="category-shelf-grid">
        {shelf.map((item, index) => (
          <li key={item.id}>
            <Link
              href={`/product/${item.handle}`}
              className="sample-card group"
            >
              <div className="sample-card-tab micro-mono">
                <span>{productDiscovery.cardLabel}</span>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="sample-card-photo">
                <Plate
                  src={item.featuredImage?.url}
                  alt={item.featuredImage?.altText || item.title}
                  aspect="4/5"
                  reveal={false}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  placeholderText={item.title}
                />
                {!item.availableForSale && (
                  <span className="sample-card-stock badge">
                    {productDiscovery.soldOut}
                  </span>
                )}
              </div>
              <div className="sample-card-details">
                <h3 className="ui-mono font-semibold">{item.title}</h3>
                <div className="sample-card-bottom">
                  <span className="spec-mono">
                    {item.priceRange.minVariantPrice.amount !==
                      item.priceRange.maxVariantPrice.amount && (
                      <span>{productDiscovery.from} </span>
                    )}
                    <Price
                      amount={item.priceRange.minVariantPrice.amount}
                      currencyCode={
                        item.priceRange.minVariantPrice.currencyCode
                      }
                    />
                  </span>
                  <span className="sample-card-arrow" aria-hidden>
                    <ArrowUpRight />
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
