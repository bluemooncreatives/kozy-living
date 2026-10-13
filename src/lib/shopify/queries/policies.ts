/**
 * Shop policies (privacy, terms, refund, shipping). They are NOT pages:
 * Shopify keeps them on `shop`, so `pageByHandle("privacy-policy")` answers
 * null and the `[page]` route 404s them. A policy the merchant never wrote
 * comes back null, which is how the footer knows not to link it.
 *
 * Two queries on purpose. The footer renders on every page and needs only the
 * names; a privacy policy body runs to tens of kilobytes and only its own page
 * needs it.
 */

export const getShopPolicyNamesQuery = /* GraphQL */ `
  query getShopPolicyNames {
    shop {
      privacyPolicy {
        handle
        title
      }
      termsOfService {
        handle
        title
      }
      refundPolicy {
        handle
        title
      }
      shippingPolicy {
        handle
        title
      }
    }
  }
`;

export const getShopPoliciesQuery = /* GraphQL */ `
  query getShopPolicies {
    shop {
      privacyPolicy {
        ...policy
      }
      termsOfService {
        ...policy
      }
      refundPolicy {
        ...policy
      }
      shippingPolicy {
        ...policy
      }
    }
  }

  fragment policy on ShopPolicy {
    handle
    title
    body
  }
`;
