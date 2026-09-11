/**
 * Customer lookup by email - **Admin** API, not Storefront.
 *
 * The Storefront API cannot read a customer it has no access token for, which
 * is exactly the case here: a visitor typing an address into the newsletter
 * card is not logged in and may not have an account at all.
 *
 * Used only to resolve the "email has already been taken" branch of
 * `customerCreate`, where we need the existing customer's id before we can
 * flip their marketing consent. Requires `read_customers`.
 *
 * The address is interpolated into Shopify's search syntax, so it is wrapped
 * in quotes by the caller - an unquoted address containing a `+` or a `-`
 * parses as a search operator and silently matches the wrong person.
 */
export const getCustomerByEmailQuery = /* GraphQL */ `
  query getCustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        id
        email
        emailMarketingConsent {
          marketingState
          marketingOptInLevel
        }
      }
    }
  }
`;
