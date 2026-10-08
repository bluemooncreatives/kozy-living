import imageFragment from "../fragments/image";

/**
 * Everything the custom kit builder needs, in one round trip: its settings,
 * the pieces it offers, the two fabrics and the thread colours. All four are
 * metaobjects the merchant edits in Admin - see docs/custom-kit-builder.md,
 * section 5, for the definitions these keys must match.
 *
 * The pieces are UNLISTED products. Shopify returns an unlisted product only
 * when it is asked for by handle, id or a reference, so the builder can only
 * ever reach them through `kit_piece.product` - a `products(query:)` listing
 * comes back empty for them, by design.
 */
export const getKitBuilderQuery = /* GraphQL */ `
  query getKitBuilder {
    settings: metaobjects(type: "kit_builder", first: 1) {
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
            }
          }
        }
      }
    }
    pieces: metaobjects(type: "kit_piece", first: 20) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on Product {
              id
              handle
              title
              tags
              featuredImage {
                ...image
              }
              images(first: 12) {
                nodes {
                  ...image
                }
              }
              # Two fabrics times every size. 50 covers 25 sizes a piece.
              variants(first: 50) {
                nodes {
                  id
                  title
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                  price {
                    amount
                    currencyCode
                  }
                  image {
                    ...image
                  }
                }
              }
            }
          }
        }
      }
    }
    fabrics: metaobjects(type: "kit_fabric", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                ...image
              }
            }
          }
        }
      }
    }
    threads: metaobjects(type: "embroidery_thread", first: 30) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                ...image
              }
            }
          }
        }
      }
    }
    # Fabric colours. Each names the kit_fabric it belongs to, so Solid and
    # Block printed each offer their own; the swatch is the studio's photo.
    colours: metaobjects(type: "kit_colour", first: 50) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                ...image
              }
            }
            ... on Metaobject {
              id
            }
          }
        }
      }
    }
  }
  ${imageFragment}
`;
