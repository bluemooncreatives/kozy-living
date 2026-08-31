# Shopify customer authentication setup

The application implements Shopify Customer Account API OAuth 2.0 with PKCE.

## Shopify admin configuration

In **Sales channels → Headless → your storefront → Customer Account API**, configure:

- Callback URL: `https://YOUR_DOMAIN/api/auth/callback`
- JavaScript origin: `https://YOUR_DOMAIN`
- Logout URL: `https://YOUR_DOMAIN/`
- Permissions for customer profile, addresses, and order history

In **Settings → Customer accounts**, enable the modern **Customer accounts** option.

Shopify requires an HTTPS callback. For local testing, use an HTTPS tunnel and set
`NEXT_PUBLIC_SITE_URL` to that tunnel origin. The callback and logout URLs must match
the Shopify settings exactly.

## Environment

```env
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
SHOPIFY_STORE_DOMAIN=YOUR_STORE.myshopify.com
SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID=YOUR_CLIENT_ID
SHOPIFY_STOREFRONT_ACCESS_TOKEN=YOUR_PUBLIC_STOREFRONT_TOKEN
SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN=YOUR_SERVER_ONLY_PRIVATE_TOKEN
```

Never expose the private token through a `NEXT_PUBLIC_` variable or client component.
Rotate any private token that has been shared outside your secret manager.

## Routes

- `/account` — account dashboard, profile, addresses, and orders
- `/api/auth/login` — begins Shopify-hosted login/sign-up
- `/api/auth/callback` — validates state and exchanges the authorization code
- `/api/auth/refresh` — refreshes expired access tokens
- `/api/auth/logout` — clears the local session and ends the Shopify session

## Current production URLs

- Site URL: `https://kozy-living.vercel.app`
- Callback URL: `https://kozy-living.vercel.app/api/auth/callback`
- JavaScript origin: `https://kozy-living.vercel.app`
- Logout URL: `https://kozy-living.vercel.app/`
