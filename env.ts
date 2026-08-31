import { z } from "zod";

const envSchema = z.object({
  COMPANY_NAME: z.string(),
  TWITTER_CREATOR: z.string(),
  TWITTER_SITE: z.string(),
  SITE_NAME: z.string(),
  SHOPIFY_REVALIDATION_SECRET: z.string(),
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string(),
  SHOPIFY_STORE_DOMAIN: z.string(),
  // Admin API token for the contact form's `metaobjectCreate` write. Optional
  // so a storefront-only deploy still boots — `src/lib/shopify/admin.ts`
  // checks for it and the form reports a failure rather than pretending the
  // message was stored.
  SHOPIFY_ADMIN_ACCESS_TOKEN: z.string().optional(),
});

envSchema.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
