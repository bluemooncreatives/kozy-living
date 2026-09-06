import imageFragment from "./image";

/**
 * The listing shape: everything a product card renders and everything the
 * facet engine needs to derive filters from, and nothing else.
 *
 * Deliberately NOT `productFragment`. That one pulls `descriptionHtml`,
 * `images(first: 20)` and `variants(first: 250)` for the product detail page;
 * fetching the whole catalogue through it would be megabytes of payload for a
 * grid that shows one image and one price, and would blow past the 2MB ceiling
 * on a single Next data-cache entry long before the catalogue got large.
 *
 * `options` carries names and values only - the facet engine groups on those,
 * and variant ids belong to the detail page.
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
