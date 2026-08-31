/**
 * The cart only ever renders a line's product title, handle and thumbnail, so
 * it selects those directly instead of embedding the full product fragment -
 * that one pulls 250 variants and 20 images *per line*, which is the single
 * biggest contributor to cart round-trip latency.
 */
const cartProductFragment = /* GraphQL */ `
  fragment cartProduct on Product {
    id
    handle
    title
    featuredImage {
      url
      altText
      width
      height
    }
  }
`;

const cartFragment = /* GraphQL */ `
  fragment cart on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
    lines(first: 250) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            # Authoritative per-unit price (post line-level discounts). Lets the
            # optimistic reducer scale a line without dividing the line total,
            # which drifts and divides by zero on a zero-quantity line.
            amountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
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
              product {
                ...cartProduct
              }
            }
          }
        }
      }
    }
  }
  ${cartProductFragment}
`;

export default cartFragment;
