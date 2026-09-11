/**
 * Newsletter subscription - **Admin** API.
 *
 * A subscriber is a Shopify *customer* carrying email marketing consent, not a
 * metaobject like a contact enquiry. The difference matters:
 *
 *   - Shopify Email, segments and Flow all read `emailMarketingConsent`. A
 *     metaobject row is invisible to every one of them, so a list stored that
 *     way can never actually be mailed without an export;
 *   - unsubscribe links in Shopify Email flip the same field back to
 *     UNSUBSCRIBED, so compliance is handled by the platform rather than by us;
 *   - the customer record de-duplicates on email, which a metaobject does not.
 *
 * Requires `write_customers` (and `read_customers` for the lookup that backs
 * the "already taken" branch) on the custom app's Admin API scopes.
 *
 * NOTE ON DOUBLE OPT-IN: Shopify's confirmation email fires only for its own
 * theme forms - there is no way to trigger it from the Admin API. Creating a
 * customer as PENDING therefore strands them there forever unless we send our
 * own confirmation. This storefront subscribes at SINGLE_OPT_IN; see
 * NEWSLETTER_SETUP.md before changing that.
 */

export const createNewsletterCustomerMutation = /* GraphQL */ `
  mutation createNewsletterCustomer($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        emailMarketingConsent {
          marketingState
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Re-subscribing someone who already exists - a past purchaser, or a visitor
 * who unsubscribed and came back. `customerCreate` rejects their address, so
 * this is the second half of that path.
 */
export const updateEmailMarketingConsentMutation = /* GraphQL */ `
  mutation updateEmailMarketingConsent(
    $input: CustomerEmailMarketingConsentUpdateInput!
  ) {
    customerEmailMarketingConsentUpdate(input: $input) {
      customer {
        id
        emailMarketingConsent {
          marketingState
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
