/**
 * Metaobject type the merchant defined for personalisation add-ons. Kept in
 * one place because the Admin definition and this query must agree exactly -
 * see docs/personalisation-add-ons.md.
 */
export const ADDON_METAOBJECT_TYPE = "product_add_on";

/**
 * Every personalisation add-on (initials, gift box) the merchant has defined.
 *
 * Read once for the whole store rather than per product: every add-on this
 * store offers is `apply_to_all`, so a per-product metafield lookup would be a
 * second query on every product page for an answer that never differs.
 *
 * Only the variant reference is resolved; every other field is a scalar the
 * reshape step reads by key. A Draft entry, or a definition whose Storefronts
 * access is off, simply does not appear here.
 */
export const getAddOnsQuery = /* GraphQL */ `
  query getAddOns($first: Int!) {
    metaobjects(type: "${ADDON_METAOBJECT_TYPE}", first: $first) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on ProductVariant {
              id
              availableForSale
              price {
                amount
                currencyCode
              }
              product {
                handle
                tags
              }
            }
          }
        }
      }
    }
  }
`;
