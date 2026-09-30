import { MOOD_METAOBJECT_TYPE } from "@/lib/shop/moods";

/**
 * The brand's moods, as the merchant defined them - the same `shop_mood`
 * metaobjects the product's `custom.shop_mood` metafield references, read
 * directly so the shop-by-mood index shows the WHOLE set, including a mood
 * nothing is tagged with yet, in the merchant's own order.
 */
export const getMoodsQuery = /* GraphQL */ `
  query getMoods($first: Int!) {
    metaobjects(type: "${MOOD_METAOBJECT_TYPE}", first: $first) {
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
