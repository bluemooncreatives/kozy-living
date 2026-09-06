import { productCardFragment } from "../fragments/product-card";

/**
 * One page of the whole catalogue, in Shopify's best-selling order.
 *
 * `after` is threaded because Shopify caps a connection at 250 nodes; the
 * client walks the cursor until Shopify says there is no next page or the
 * safety cap in `getCatalog` is reached.
 */
export const getCatalogQuery = /* GraphQL */ `
  query getCatalog($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: BEST_SELLING) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ...productCard
        }
      }
    }
  }
  ${productCardFragment}
`;

/**
 * The product ids of one collection in the merchant's own order.
 *
 * Ids only: this is used purely as an ordering index over the catalogue that
 * has already been fetched, so re-fetching the product bodies would be waste.
 * `COLLECTION_DEFAULT` is what Shopify's own storefront shows - manual order
 * when the merchant has sorted the collection by hand, the collection's chosen
 * sort otherwise.
 */
export const getCollectionOrderQuery = /* GraphQL */ `
  query getCollectionOrder($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      handle
      products(first: $first, after: $after, sortKey: COLLECTION_DEFAULT) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

/**
 * Product ids matching a search term, in Shopify's relevance order.
 *
 * Ids only, for the same reason as `getCollectionOrderQuery`: the shop page
 * already holds the catalogue, so a search is a filter plus an ordering over
 * it rather than a second copy of the product data. Going through Shopify's
 * `search` rather than matching substrings locally keeps the storefront's
 * synonym and typo handling.
 */
export const searchCatalogQuery = /* GraphQL */ `
  query searchCatalog($query: String!, $first: Int!) {
    search(first: $first, query: $query, types: [PRODUCT], prefix: LAST) {
      edges {
        node {
          ... on Product {
            id
          }
        }
      }
    }
  }
`;
