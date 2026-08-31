import cartFragment from "../fragments/cart";

/**
 * Every cart mutation selects `userErrors` and `warnings`. Shopify answers a
 * rejected mutation with HTTP 200, no top-level `errors`, `cart: null` and the
 * reason in `userErrors` - without selecting it the failure is invisible and
 * the reshape step blows up on the null cart.
 */
const cartMutationResultFragment = /* GraphQL */ `
  fragment cartMutationResult on Cart {
    ...cart
  }
`;

const userErrorsSelection = /* GraphQL */ `
  userErrors {
    field
    message
    code
  }
  warnings {
    code
    message
    target
  }
`;

export const addToCartMutation = /* GraphQL */ `
  mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...cartMutationResult
      }
      ${userErrorsSelection}
    }
  }
  ${cartMutationResultFragment}
  ${cartFragment}
`;

export const createCartMutation = /* GraphQL */ `
  mutation createCart($lineItems: [CartLineInput!]) {
    cartCreate(input: { lines: $lineItems }) {
      cart {
        ...cartMutationResult
      }
      ${userErrorsSelection}
    }
  }
  ${cartMutationResultFragment}
  ${cartFragment}
`;

export const editCartItemsMutation = /* GraphQL */ `
  mutation editCartItems($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...cartMutationResult
      }
      ${userErrorsSelection}
    }
  }
  ${cartMutationResultFragment}
  ${cartFragment}
`;

export const removeFromCartMutation = /* GraphQL */ `
  mutation removeFromCart($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...cartMutationResult
      }
      ${userErrorsSelection}
    }
  }
  ${cartMutationResultFragment}
  ${cartFragment}
`;
