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
      # A cart line renders this at ~64px, so it has no business pulling a
      # multi-megabyte original - see the note in fragments/image.ts. This
      # fragment spells the fields out rather than spreading the image
      # fragment, so the cap has to be repeated here.
      #
      # A GraphQL comment, not a JS one: this is inside a template literal,
      # and a /* */ comment carrying backticks closes the string early.
      url(transform: { maxWidth: 512, preferredContentType: WEBP })
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
