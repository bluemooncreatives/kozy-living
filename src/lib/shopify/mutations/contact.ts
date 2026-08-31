/**
 * Contact enquiries are stored as Shopify **metaobjects**, one entry per
 * message, in a definition of type `contact_message`.
 *
 * Why a metaobject and not a customer, a draft order or an email:
 *   - it is a first-class record in Admin → Content → Metaobjects, so the team
 *     reads and triages enquiries without leaving Shopify;
 *   - it does not create a customer account for someone who only asked a
 *     question, which would pollute segments and marketing lists;
 *   - it is queryable and exportable later, where an email is not.
 *
 * The definition must exist in the store before this mutation succeeds - see
 * the setup notes in README/DESIGN for the field keys it expects.
 */
export const createContactMessageMutation = /* GraphQL */ `
  mutation createContactMessage($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
        handle
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
