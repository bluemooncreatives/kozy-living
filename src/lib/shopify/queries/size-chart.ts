import imageFragment from "../fragments/image";

/**
 * The size chart for ONE product: its own `custom.size_chart` and every
 * collection's, resolved in `pickSizeChart`. A query of its own rather than a
 * field on the product fragment, which every listing, search and
 * recommendation also spreads - only the product page needs a chart.
 */
const sizeChartFields = /* GraphQL */ `
  reference {
    ... on Metaobject {
      handle
      type
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
`;

export const getProductSizeChartQuery = /* GraphQL */ `
  query getProductSizeChart($handle: String!) {
    product(handle: $handle) {
      options {
        name
        values
      }
      sizeChart: metafield(namespace: "custom", key: "size_chart") {
        ${sizeChartFields}
      }
      collections(first: 20) {
        nodes {
          sizeChart: metafield(namespace: "custom", key: "size_chart") {
            ${sizeChartFields}
          }
        }
      }
    }
  }
  ${imageFragment}
`;
