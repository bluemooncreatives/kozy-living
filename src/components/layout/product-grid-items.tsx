import { Product } from "@/lib/shopify/types";
import Grid from "../grid";
import ProductCard from "../product-card";

export default function ProductGridItems({
  products,
}: {
  products: Product[];
}) {
  return (
    <>
      {products.map((product, index) => (
        <Grid.Item key={product.handle} className="animate-fadeIn">
          <ProductCard product={product} priority={index < 3} />
        </Grid.Item>
      ))}
    </>
  );
}
