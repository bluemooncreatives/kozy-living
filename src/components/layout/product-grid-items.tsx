import Grid from "../grid";
import ProductCard, { type ProductCardProduct } from "../product-card";

/**
 * The results grid.
 *
 * Cells fade in with the CSS `animate-fadeIn`, and the cards opt out of the
 * scroll-reveal: this grid is rebuilt in place every time a filter, a sort or a
 * page changes, and an 800ms staggered entrance on each of those reads as a
 * reload rather than as a filter.
 */
export default function ProductGridItems({
  products,
  sizes,
}: {
  products: ProductCardProduct[];
  /** Match the grid's own column count, or the browser over-fetches images. */
  sizes?: string;
}) {
  return (
    <>
      {products.map((product, index) => (
        <Grid.Item key={product.handle} className="animate-fadeIn">
          <ProductCard
            product={product}
            priority={index < 3}
            sizes={sizes}
            reveal={false}
          />
        </Grid.Item>
      ))}
    </>
  );
}
