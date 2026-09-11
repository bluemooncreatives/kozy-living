# Newsletter — Shopify setup

The postcard popup writes to Shopify. A subscriber becomes a **customer record
carrying email marketing consent** — the same thing Shopify's own theme forms
produce — so Shopify Email, customer segments and Flow can all see the list
without an export.

Everything below is done in the Shopify admin at
`https://admin.shopify.com/store/<your-store>`.

---

## The flow, end to end

```
postcard popup (client)
  └─ server action  src/components/newsletter/actions.ts
       ├─ zod validation + honeypot + per-IP throttle
       └─ Admin GraphQL API  (token is server-only, never sent to the browser)
            ├─ customerCreate  → customer + emailMarketingConsent SUBSCRIBED
            └─ if the address already exists:
                 customers(query:"email:…")            → find the record
                 customerEmailMarketingConsentUpdate   → set SUBSCRIBED
                                │
                                ▼
            Shopify admin → Customers  (Email subscription: Subscribed)
                                │
                                ▼
                     Shopify Email / Flow / segments
```

---

## 1. Add the customer scopes to the custom app

The Admin token already in `.env.local` belongs to the custom app that owns the
contact form, and it was created with metaobject scopes only. Writing a customer
needs two more.

1. **Settings → Apps and sales channels → Develop apps** (`/settings/apps/development`)
2. Open the app that owns the contact form (the one whose token is in
   `SHOPIFY_ADMIN_ACCESS_TOKEN`).
3. **Configuration → Admin API integration → Edit**
4. Tick:
   - `write_customers` — creating the subscriber and setting consent
   - `read_customers` — finding an address that already exists, so a returning
     subscriber is re-subscribed instead of being shown an error
   - (`write_metaobjects` / `read_metaobjects` stay ticked — the contact form
     still needs them)
5. **Save**, then **Install app** / **Update** when the banner offers it. The
   token string does not change; the new scopes only take effect once the
   install is updated.

> If the app does not exist yet: same page → **Create an app** → name it
> (e.g. `Kozy Storefront`) → **Configure Admin API scopes** → tick the four
> scopes above → **Install app** → **API credentials** → reveal the
> **Admin API access token** (`shpat_…`, shown once).

## 2. Environment variables

Nothing new — the newsletter reuses the contact form's credentials.

```bash
# .env.local  (and the same two in Vercel → Settings → Environment Variables)
SHOPIFY_STORE_DOMAIN=kozyliving-2.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_…
```

The Admin token is a full-store credential. It is read only in
`src/lib/shopify/admin.ts`, which is imported exclusively from server actions —
never add `NEXT_PUBLIC_` to it and never import it from a `"use client"` file.

## 3. Check it worked

1. `npm run dev`, wait 15 seconds on the homepage, submit a test address.
2. **Customers** (`/customers`) → the address is there, tagged `newsletter` and
   `storefront`, with **Email subscription: Subscribed**.
3. Submit the same address again — the card should answer "you're already on the
   list", not an error. That path exercises `read_customers`.

If step 2 shows nothing, the server log names the cause: a `403` from the Admin
API is a missing scope (step 1 not saved *and* installed), and
`Shopify Admin is not configured` is a missing env var.

## 4. Make the list mailable

Subscribers land in Shopify but nothing sends to them until a marketing surface
is set up.

- **Install Shopify Email** — **Apps → Shopify App Store → Shopify Email**, or
  **Marketing → Campaigns → Create campaign**. Free for the first 10,000 emails
  a month. Unsubscribe links are added automatically, and an unsubscribe flips
  the same `emailMarketingConsent` field back to `UNSUBSCRIBED`, so compliance
  is handled by the platform rather than by this codebase.
- **Segment the popup's subscribers** — **Customers → Segments → Create
  segment** (`/customers/segments`):
  ```
  customer_email_subscription_status = 'SUBSCRIBED' AND customer_tags CONTAINS 'newsletter'
  ```
  Save it as *Newsletter subscribers*. Campaigns target the segment.
- **Welcome email (optional)** — **Apps → Shopify Flow → Create workflow** →
  trigger **Customer email marketing consent updated** → condition
  `email marketing consent state = subscribed` → action **Send marketing
  email**. This is what makes the signup feel answered; without it the first
  contact is whenever the next campaign happens to go out.

## 5. Double opt-in — read before turning it on

Shopify's double opt-in setting lives at **Settings → Notifications → Customer
notifications → Marketing double opt-in → Customer marketing confirmation**
(`/settings/notifications`).

**It does not apply to this signup.** Shopify only sends that confirmation email
for its own theme forms; there is no way to trigger it from the Admin API, and
Shopify has confirmed as much. A headless signup created as `PENDING` therefore
sits pending forever and never receives a single campaign.

So the action subscribes at `SINGLE_OPT_IN` — an honest record of what actually
happened, since nobody confirmed anything. If confirmed opt-in is a requirement
(an EU/GDPR-heavy list, or a deliverability decision), it has to be built:
create the customer as `PENDING`, send a confirmation email from your own
provider with a signed token, and call
`customerEmailMarketingConsentUpdate` → `SUBSCRIBED` when the link is clicked.
`src/lib/shopify/mutations/newsletter.ts` already has that mutation.

---

## Where the code is

| File | What it does |
| --- | --- |
| [src/components/newsletter/newsletter-popup.tsx](src/components/newsletter/newsletter-popup.tsx) | 15-second timer, once-per-visitor rules, modal shell |
| [src/components/newsletter/newsletter-postcard.tsx](src/components/newsletter/newsletter-postcard.tsx) | The card itself — reusable anywhere as a section |
| [src/components/newsletter/actions.ts](src/components/newsletter/actions.ts) | Server action: validation, throttle, Shopify write |
| [src/lib/shopify/mutations/newsletter.ts](src/lib/shopify/mutations/newsletter.ts) | `customerCreate`, `customerEmailMarketingConsentUpdate` |
| [src/lib/shopify/queries/customer.ts](src/lib/shopify/queries/customer.ts) | Lookup by email for the "already taken" branch |
| [src/lib/site.ts](src/lib/site.ts) | Every line of copy on the card (`newsletter`) |
| [src/app/globals.css](src/app/globals.css) | Airmail frame, stamp perforation, postmark button |

**Popup timing and frequency** are the constants at the top of
`newsletter-popup.tsx`: `DELAY_MS` (15s), `SNOOZE_MS` (30 days after a
dismissal), `QUIET_PATHS` (pages it never opens on). Subscribing silences it
permanently, via `localStorage["kozy:newsletter"]`.
