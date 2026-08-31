import { z } from "zod";

const envSchema = z.object({
  COMPANY_NAME: z.string().optional().default("Kozy Living"),
  TWITTER_CREATOR: z.string().optional().default("@KozyLiving"),
  TWITTER_SITE: z.string().optional().default("https://kozyliving.com"),
  SITE_NAME: z.string().optional().default("Kozy Living"),
  SHOPIFY_REVALIDATION_SECRET: z.string().optional().default(""),
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string().optional(),
  SHOPIFY_STOREFRONT_PUBLIC_TOKEN: z.string().optional(),
  SHOPIFY_STORE_DOMAIN: z.string().optional().default("kozyliving-2.myshopify.com"),
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: z.string().optional(),
  SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN: z.string().optional(),
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN: z.string().optional(),
  SHOPIFY_ADMIN_ACCESS_TOKEN: z.string().optional(),
});

envSchema.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
