import imageFragment from "./image";

/**
 * The listing shape: everything a product card renders and everything the
 * facet engine needs to derive filters from, and nothing else.
 *
 * Deliberately NOT `productFragment`. That one pulls `descriptionHtml`,
 * `images(first: 20)` and `variants(first: 250)` for the product detail page;
 * fetching the whole catalogue through it would be megabytes of payload for a
 * grid, and would blow past the 2MB ceiling on a single Next data-cache entry
 * long before the catalogue got large.
 *
 * The two bounded connections here are what let a card carry its own gallery
 * and its own add-to-cart button, and both are capped for that reason:
 *
 *   images(first: 5)    the card's arrows page through these. Five is a
 *                       browse, not the full set - the detail page is where
 *                       every shot lives.
 *   variants(first: 2)  enough to tell a single-variant product, which a card
 *                       can sell outright, from one with choices to make,
 *                       which has to go to the detail page for them. Pulling
 *                       all 250 to answer a yes/no question is what the
 *                       paragraph above rules out.
 *
 * `options` carries names and values only - the facet engine groups on those.
 */
export const productCardFragment = /* GraphQL */ `
  fragment productCard on Product {
    id
    handle
    title
    availableForSale
    tags
    productType
    vendor
    options {
      name
      values
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      ...image
    }
    images(first: 5) {
      edges {
        node {
          ...image
        }
      }
    }
    variants(first: 2) {
      edges {
        node {
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
        }
      }
    }
    collections(first: 50) {
      edges {
        node {
          handle
          title
        }
      }
    }
    createdAt
    updatedAt
  }
  ${imageFragment}
`;
