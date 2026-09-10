import { COLOUR_METAOBJECT_TYPE } from "@/lib/shop/colours";

/**
 * The brand's colour palette, as the merchant defined it.
 *
 * These are the same `shop_color` metaobjects that the product colour metafield
 * references, read directly rather than through a product. That is what lets
 * the shop-by-colour picker show the WHOLE palette - including a colour nothing
 * is tagged with yet - in the merchant's own order, instead of only the colours
 * the catalogue happens to have reached.
 *
 * Fields are asked for generically rather than by name because the definition
 * belongs to the merchant: `lib/shop/colours.ts` knows which keys carry the
 * name, the hex and the sort order, and tolerates a store that named them
 * differently.
 */
export const getColourPaletteQuery = /* GraphQL */ `
  query getColourPalette($first: Int!) {
    metaobjects(type: "${COLOUR_METAOBJECT_TYPE}", first: $first) {
      nodes {
        handle
        fields {
          key
          value
        }
      }
    }
  }
`;
