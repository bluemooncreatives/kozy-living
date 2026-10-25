# Moving the storefront onto the live Shopify store

This storefront was built against a **development store**. To launch it, it
has to run against the **live store** that serves kozyliving.in today with
a Shopify theme. This file is the end-to-end runbook for that move: what
exists where, what has to be rebuilt, in what order, and how to switch the
domain over without the shop going dark.

> The plan below was measured on **2026-10-15** against both stores (dev
> through the Storefront API, live through its public `products.json` /
> `collections.json`). Live was **re-measured on 2026-10-25** through the
> *Kozy Living Headless* token, and by then the owner had rebuilt live on
> **dev's** structure rather than mapping onto live's old collections. Where
> the two disagree, [Where live stands](#where-live-stands-2026-10-25) wins.
> If you pick this up much later, re-measure before trusting a number.

## Progress

Tick steps off here as they are done, so whoever picks this up next knows
where the move stands.

| Date | Step | State | Notes |
| --- | --- | --- | --- |
| 2026-10-23 | 1.3 Headless channel + storefront | Done | Storefront named **Kozy Living Headless**. Its Customer Account API endpoints carry shop id `97867235641`, the live store's (the same id as live's `/account`), so it is on live, not dev. |
| 2026-10-23 | 1.4 Storefront API permissions | Done | Every scope on (see 1.4). |
| 2026-10-24 | 1.4 Storefront API tokens | Copied, verified | Public and private tokens both answer on `4nr8xa-3x` (shop `Kozy Living`, primary domain `kozyliving.in`). Staged **commented out** at the foot of local `.env`; dev stays active there until Phase 11. **Not yet in Vercel.** |
| 2026-10-25 | 1.5 Channel publishing | Done | The live token returns **93 products and 20 collections**: everything listed on kozyliving.in, plus `pink-robe` and the mini sofa, which are on Headless only. |
| 2026-10-23 | 1.6 Customer Account API permissions | Done | Every scope on. **Application setup (callback, origin, logout) still empty**: next step. |
| 2026-10-25 | Local `.env` | On live | `SHOPIFY_STORE_DOMAIN` and both Storefront tokens are now live's, uncommented; dev's values are gone from it. The `SHOPIFY_ADMIN_CLIENT_*` pair is still **dev's** app: live answers `app_not_installed`, so the contact, B2B and newsletter forms fail locally until 1.7. |
| 2026-10-25 | 2 Files | Partly | 30 of the 43 images (D.1 + D.3) are already in live Files under the same name. Missing: see [the open list](#still-open). Videos not checked (their URLs do not name a store). |
| 2026-10-25 | 3 Products | Done except the 4 kit pieces | All 91 listed dev products, `custom-ritual-kit` and both add-ons are on live. `bathrobe`, `slipper`, `makeup-pouch` and `eye-mask` are not yet. Add-on fix-ups open. |
| 2026-10-25 | 4-5 Metaobjects | Entries in, references open | All 30 entries exist with dev's values. No entry references a product, variant or file yet. |
| 2026-10-25 | 6 Colour and mood | Open | 0 of 93 products carry `custom.shop_colors` or `custom.shop_mood`. |
| 2026-10-25 | 7 Collections | Done, a different way | Live now has **dev's 20 collections**; 14 keep dev's handle, 6 were renamed. Live's old collections are gone, and their URLs 404 on kozyliving.in **today**. |
| 2026-10-25 | 8.1 Pages | Done | Dev's 8 pages, same handles. |
| 2026-10-25 | 9 Menus | Done, a different way | Built straight into live's `main-menu` and `kozy-living-footer`, not a separate `kozy-headless-menu`. |
| — | 1.2 Backup, 1.7 Admin apps, 1.8 freeze, 8.2 journal, 10 | Open | |

### Where live stands (2026-10-25)

Measured through the Headless Storefront token, live's public
`products.json` / `collections.json`, and dev's published site
(`kozy-living.vercel.app`) for dev's collection members.

**The approach changed.** The plan below maps dev onto live's existing
collections and builds a separate headless menu, so the Pitch theme stays
untouched. Instead, live was rebuilt to look like dev: dev's collections
(mostly under dev's handles), dev's pages, and dev's menus in live's own
`main-menu`. Three consequences:

- **The code needs far fewer handle changes** (11.2 is rewritten for it).
  `bestsellers`, `pet-collection`, `slippers` and `pet-carrier` stay as
  they are.
- **The Pitch theme already shows the new structure.** Its menu links to
  the 8 empty pages (`/pages/kit-builder` and the rest render blank on the
  theme), and the two add-ons are published to the Online Store.
- **Live's old collection URLs are dead now, not at cutover.**
  `/collections/best-sellers`, `kloud-slippers`, `krafted`,
  `small-paws-klub`, `the-kozy-lounge` and `morning-luxuries-with-kozy`
  all 404 on kozyliving.in, and the theme's homepage still links to the
  last two. See [7.3](#73-old-live-collection-urls).

What matches dev:

| | State |
| --- | --- |
| Products | All 91 products dev lists, same handles. Plus `custom-ritual-kit` (Unlisted, SKU `KOZY-KIT`, ₹0) and both add-ons (SKUs and ₹499 / ₹999 correct). `pink-robe` and the mini sofa carry dev's variants and prices. |
| Collections | 20, one per dev collection except `frontpage`. Members equal dev's in 14; the 6 differences are in [7.2](#72-membership-differences). |
| Pages | `contact`, `faq`, `kit-builder`, `b2b-enquiries`, `founders-note`, `the-kozy-story`, `shop-by-colour`, `shop-by-mood`. Bodies empty, as in dev. |
| Menus | `main-menu` and `kozy-living-footer` carry dev's tree, with **Krafted by Kozy → Slippers fixed**. Titles now read "Kustom Kit", "Shop by Colour" and "Contact" (dev: "Custom Kit", "Shop by Colours", "Contact Us"); the footer adds a Refund Policy item. |
| Metaobjects | `shop_color` 6, `shop_mood` 6, `kit_fabric` 2, `kit_colour` 3 (each pointing at `solid`), `embroidery_thread` 6, `kit_piece` 4, `product_add_on` 2, `kit_builder` 1. Dev's handles, except `kit_piece` `eye-mask` (dev: `mask-eye-mask`). |
| Policies | Privacy, refund, shipping. No terms of service. |

#### Still open

Live store:

- [ ] **Create the 4 kit pieces** (3.1): `bathrobe`, `slipper`,
      `makeup-pouch`, `eye-mask`, Unlisted, tag `kozy-kit-piece`.
- [ ] **Add-ons** `personalized-initials` and `kozy-gift-box`: set
      **Unlisted** (they are Active and list on the theme's
      `/collections/all` and in the headless catalogue today), and change
      their vendor from `Kozy Living Dev`.
- [ ] **Metaobject references** (Appendix A). The Storefront API returns
      none of these on live:
  - [ ] `kit_piece.product` × 4, once the pieces exist.
  - [ ] `product_add_on.variant` × 2. Until then the site offers no
        initials and no gift box.
  - [ ] `kit_builder.container_variant` → `custom-ritual-kit`. Until then
        `/kit-builder` and the homepage atelier rest.
  - [ ] `kit_fabric.swatch` × 2 and `kit_colour.swatch` × 3, after the
        swatches are uploaded.
- [ ] **Metaobject values that differ from dev**:
  - `kit_fabric` `block-printed` has `is_default` **true**; dev has false.
    Two defaults: set it false.
  - `shop_color` `rose-pink` `name` is `" Rose Pink"`, with a leading
    space. Trim it.
- [ ] **Colour and mood on products** (Phase 6, Appendix B): not started.
- [ ] **Collection members** that differ from dev (7.2).
- [ ] **Redirects** for live's old collection URLs (7.3). This one affects
      the live shop now.
- [ ] **Files** missing on live (Phase 2): `Kozy_Logo.png`, the social card
      `IMG_1187_7a482946-…_copy_2_jpg.jpg`, `IMG_1171_43dfc109-…`,
      `IMG_6338_eea1aae1-…`, `IMG_2755_9be99538-…`, `IMG_6412_d18c7de3-…`,
      `189666_jpg.jpg`, `IMG_0689_jpg.jpg`, and all 5 swatches (D.3). The
      7 videos still need re-hosting.
- [ ] **Journal** (8.2): live's `news` blog (titled *KOZY KORNER*) still has
      only its own 3 articles; dev's 4 are not there.
- [ ] Install the **runtime Admin app** on live (1.7).
- [ ] Customer Account API **application setup** (1.6 step 6).
- [ ] Backup (1.2), Flow, packing slip, notifications, discounts (Phase 10).

Not checked (the Storefront API cannot see them): inventory tracking on
`custom-ritual-kit` (must be off), product status beyond listed / not
listed, collection sort order, shipping and tax settings, and whether the
metafield definitions exist with Storefronts access. An Admin token on
live (1.7) answers all of them.

---

## Contents

0. [Read this first](#0-read-this-first)
1. [The two stores, side by side](#1-the-two-stores-side-by-side)
2. [The phases at a glance](#2-the-phases-at-a-glance)
3. [Phase 1 - Access to the live store](#phase-1---access-to-the-live-store)
4. [Phase 2 - Files and media](#phase-2---files-and-media)
5. [Phase 3 - Products](#phase-3---products)
6. [Phase 4 - Metaobject definitions](#phase-4---metaobject-definitions)
7. [Phase 5 - Metaobject entries](#phase-5---metaobject-entries)
8. [Phase 6 - Colour and mood on products](#phase-6---colour-and-mood-on-products)
9. [Phase 7 - Collections](#phase-7---collections)
10. [Phase 8 - Pages, blog, policies, customers](#phase-8---pages-blog-policies-customers)
11. [Phase 9 - Menus](#phase-9---menus)
12. [Phase 10 - Flow, packing slip, notifications, discounts](#phase-10---flow-packing-slip-notifications-discounts)
13. [Phase 11 - Code changes](#phase-11---code-changes)
14. [Phase 12 - Staging test against the live store](#phase-12---staging-test-against-the-live-store)
15. [Phase 13 - Cutover](#phase-13---cutover)
16. [Phase 14 - Theme apps that stop working](#phase-14---theme-apps-that-stop-working)
17. [Phase 15 - After launch](#phase-15---after-launch)
18. [Appendices A-F](#appendix-a---metaobject-entries)

---

## 0. Read this first

### What is moving

|  | Dev store (where this site was built) | Live store (where it must run) |
| --- | --- | --- |
| myshopify domain | `kozy-living-dev.myshopify.com` | `4nr8xa-3x.myshopify.com` |
| Public domain | none | `kozyliving.in` |
| Storefront today | this Next.js app (on Vercel, staging) | Shopify theme **Pitch** 3.2.1 ("Copy of Copy of Pitch") |
| Shop id (CDN path) | `/s/files/1/0700/6476/7047/` | `/s/files/1/0978/6723/5641/` |

When this is done, the **same Next.js app** reads the **live** store, is
served at `https://kozyliving.in`, and hands checkout to Shopify on a
subdomain (this file uses `shop.kozyliving.in`; change it if the owner
prefers another name). The Pitch theme stays installed only to forward
stray visitors to the new site.

### Why it is more than swapping a token

The **products** already match: all 89 live products exist in dev with
the same handles and titles, because dev was cloned from live. So the
catalogue, product pages, cart and checkout work as soon as the
environment variables point at live.

**Everything built on top of the products exists only in dev:**

- 9 metaobject definitions, with their entries
- 2 product metafields (colour and mood), set on 58 products
- 9 products (4 kit pieces, the kit container, 2 add-ons, 2 dev-only products)
- the menus the site reads
- Flow workflows, the packing slip, and the notification and discount setup
- 45 photos and videos hard-coded in `src/lib/site.ts`, hosted in **dev's** file storage

None of it can be copied by ID. Every product, variant, metaobject and
file gets a **new ID** in the live store, and anything that holds a
*reference* has to be re-pointed there.

### Ground rules

1. **Additive until cutover.** Phases 1-10 only *add* things to the live
   store, and the Pitch theme does not show any of them. The live shop
   keeps selling the whole time. Only Phase 13 changes what customers see.
2. ~~**Do not edit the live store's `main-menu` before cutover.**~~
   Overtaken (2026-10-25): live's `main-menu` now *is* the headless menu,
   and the Pitch theme renders it (Phase 9).
3. **Match by handle, SKU or title, never by ID.**
4. **Freeze the dev store.** From the moment Phase 1 starts, nobody edits
   dev's Admin. If something must change, change it in **both** stores.
   Do not delete or close the dev store until Phase 15. Product images
   are imported from its CDN, and it is the reference for every value here.
5. **Go in order.** Definitions reference other definitions, and entries
   reference products and files.

### Decisions recorded (owner / developer, 2026-10-15)

| Question | Decision |
| --- | --- |
| Which collection feeds the homepage Bestsellers rail? | ~~Live's `best-sellers` (22).~~ **Overtaken 2026-10-25:** live now has dev's `bestsellers` (6, the same members), and `best-sellers` is gone. The code keeps `bestsellers`. |
| What comes over from dev? | **Everything**: the 2 dev-only products, the 7 add-on/kit products, every metaobject and entry, every colour and mood assignment, dev-only collection members, dev's 4 journal articles, both menus, Flow, the packing slip. |
| Dev collection vs. a live collection doing the same job | ~~The code moves to the live handle.~~ **Overtaken 2026-10-25:** live was rebuilt on dev's 20 collections. 14 keep dev's handle; 6 got a cleaner one, and the code follows those 6 (11.2). |
| Live-only data | Live's 3 journal articles and its policies stay. ~~Live-only collections~~: they no longer exist on live (7.3). |
| Checkout subdomain | `shop.kozyliving.in` (placeholder until the owner confirms). |

---

## 1. The two stores, side by side

| Thing | Dev | Live, 2026-10-15 | Live, 2026-10-25 |
| --- | --- | --- | --- |
| Products (published) | 93 | 89 | 93 on Headless: all of dev's except the 4 Unlisted kit pieces (Phase 3) |
| Collections | 21 | 26 | 20, dev's structure (Phase 7) |
| Metaobject definitions used by the site | 9 | 0 | 8 readable on Storefront; `contact_message` is private and not checked |
| Metaobject entries | 30 (+ contact messages) | 0 | 30; references not set (Phase 5) |
| Products with `custom.shop_colors` | 57 | 0 | 0 (Phase 6) |
| Products with `custom.shop_mood` | 33 | 0 | 0 (Phase 6) |
| Menus read by the site | `main-menu`, `kozy-living-footer` | Pitch's `main-menu` only | Both, built from dev's (Phase 9) |
| Pages | 8, all with empty bodies | `contact` | Dev's 8 |
| Journal (`news`) | 4 articles | 3 different articles | Unchanged: copy dev's 4 (Phase 8) |
| Policies | privacy | privacy, refund, shipping | Same; live is ahead |
| Customer accounts | new accounts | new accounts (`/account` → `shopify.com/97867235641/account`) | Nothing to switch |
| Theme apps | none | 10 app embeds | Phase 14 |
| Hard-coded media in `site.ts` | 38 images + 7 videos on dev's CDN | none | 30 of 43 images present by name (Phase 2) |

---

## 2. The phases at a glance

| Phase | What | Who | Visible to shoppers on kozyliving.in? |
| --- | --- | --- | --- |
| 1 | Access: Headless channel, tokens, Admin app | Store owner + dev | No |
| 2 | Re-host photos, videos, swatches in live Files | Admin | No |
| 3 | Import 9 products | Admin | No (Unlisted) / 2 new products: yes |
| 4 | Create 9 metaobject definitions | Admin or script | No |
| 5 | Create 30 metaobject entries | Admin or script | No |
| 6 | Colour and mood metafields on 58 products | Admin or script | No |
| 7 | Collections: map, add missing members, create 1 | Admin | Slightly (collections gain products) |
| 8 | Pages, journal, policies, customer data | Admin | Journal gains 4 articles |
| 9 | Two new menus for the headless site | Admin | No |
| 10 | Flow, packing slip, notifications, discounts | Admin | No |
| 11 | Code changes | Dev | No |
| 12 | Full test on a Vercel preview against live | Dev + owner | No |
| 13 | Cutover: domain, theme redirect, auth, webhooks | Dev + owner | **Yes, this is the launch** |
| 14 | Replace or drop theme apps | Owner + dev | Yes |
| 15 | Monitoring, clean-up, retire migration access | Dev | No |

Phases 4-6 can be done **by hand** using the appendices, or **by
script** against the Admin API (Appendix E). The script is faster and
avoids typos across ~120 values. By hand works and needs no extra access
scopes.

---

## Phase 1 - Access to the live store

### 1.1 Who needs what

The person doing Phases 2-10 needs a **staff account on the live store**
with these permissions:

- Products, collections and inventory
- Content: Files, Metaobjects, Pages, Blog posts and Menus
- Settings → Custom data
- Apps and sales channels, including develop apps
- Domains
- Notifications
- Shopify Flow

The store owner can do it all, or invite the developer as staff with
those permissions.

### 1.2 Back up the live store first

- [ ] **Products → Export → All products → CSV**. Keep the file.
- [ ] **Online Store → Themes → Pitch → ⋯ → Duplicate.** This copy is
      the rollback theme (Phase 13).
- [ ] Screenshot **Content → Menus → Main menu**, plus the homepage and a
      product page, so "before" is on record.

### 1.3 Install the Headless channel

1. [x] Admin → **Sales channels → +** (or the Shopify App Store) → install
   **Headless** (by Shopify).
2. [x] **Headless → Create storefront.** Named `Kozy Living Headless`
   (2026-10-23). The name only labels it in Admin; nothing in code reads it.

### 1.4 Storefront API token and permissions

1. Headless → *Kozy Living Headless* → **Storefront API → Manage**.
2. [x] **Permissions → Edit**. Done 2026-10-23 with every scope on. Shopify
   notes these are **shared across all Headless storefronts** on the store.

   | Scope | Read by the site |
   | --- | --- |
   | `unauthenticated_read_product_listings` (products, variants **and collections**) | Yes. There is no separate collection scope any more. |
   | `unauthenticated_read_product_inventory` | Yes: sold-out states, stock clamps. |
   | `unauthenticated_read_product_tags` | Yes: the `kozy-addon` / `kozy-kit*` filters. |
   | `unauthenticated_read_content` | Yes: menus, pages, blog, policies. |
   | `unauthenticated_read_metaobjects` | Yes: colour, mood, add-ons, kit builder. |
   | `unauthenticated_read_checkouts`, `unauthenticated_write_checkouts` | Yes: the cart and Buy now. |
   | `unauthenticated_read_selling_plans` | Not today. Keep it: a pre-order app may need it (Phase 14). |
   | `unauthenticated_read_customers`, `unauthenticated_write_customers`, `unauthenticated_read_customer_tags` | No. Login goes through the Customer Account API (1.6) and the newsletter through the Admin API (1.7). Harmless; untick them if you want the token to carry only what the site uses. |
   | `unauthenticated_read_product_pickup_locations`, `unauthenticated_read_bundles`, `unauthenticated_read_bulk_operations`, `unauthenticated_write_bulk_operations`, `unauthenticated_read_shop_pay_installments_pricing` | No. Harmless. |

3. [x] Copy the **public access token**. It becomes
   `SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
4. [x] Copy the **private access token** (`shpat_…`). It becomes
   `SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN`. Nothing reads it today; keep
   it in Vercel anyway, never in a `NEXT_PUBLIC_` variable. It is **not**
   an Admin token: `admin.ts` never falls back to it (an old `.env` comment
   said it did), so the contact forms and newsletter still need 1.7.
5. [x] Both copied 2026-10-24 and checked against the live API (public in
   `X-Shopify-Storefront-Access-Token`, private in
   `Shopify-Storefront-Private-Token`). They sit commented out at the foot
   of local `.env` until Phase 11 switches it over. Vercel: not yet (11.1).

### 1.5 Make products and collections available to the Headless channel

**This is the step that most often makes a new headless site look empty.**
The Storefront API returns only what is published to the storefront the
token belongs to.

- [ ] **Products** → select all (89) → **⋯ → Include in sales channel(s)**
      → *Kozy Living Headless*.
- [ ] **Collections** → select all (26) → same.
- [ ] Note for the future: every **new** product or collection must also
      be included in this channel, or it will not appear on the site.

Check: the query in [Appendix E.1](#e1-checking-what-the-site-can-see)
should return 89 products and 26 collections.

### 1.6 Customer Account API (login and orders)

1. Headless → *Kozy Living Headless* → **Customer Account API**.
2. Copy the **Client ID**. It becomes `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`.
3. Client type: **Public**. The site uses PKCE and has no client secret;
   see `docs/CUSTOMER_AUTH_SETUP.md`.
4. [x] **Permissions**: done 2026-10-23 with every scope on (customers,
   orders, draft orders, store credit, markets, companies, subscription
   contracts, metaobjects; shared across all Headless storefronts). The
   site reads the profile, addresses and orders, and logs in with
   `openid email customer-account-api:full`.
5. **Application endpoints: nothing to copy.** The authorize, token and
   logout URLs shown there are discovered at runtime from
   `https://<SHOPIFY_STORE_DOMAIN>/.well-known/openid-configuration`
   (`src/lib/customer-account.ts`). Pointing `SHOPIFY_STORE_DOMAIN` at
   live is all it takes.
6. [ ] **Application setup → Edit.** Every entry must match what the code
   sends, character for character:

   | Field | Value | Why exactly this |
   | --- | --- | --- |
   | Callback URI | `https://kozy-living.vercel.app/api/auth/callback` | `redirect_uri` is `${NEXT_PUBLIC_SITE_URL}/api/auth/callback`. |
   | JavaScript origin | `https://kozy-living.vercel.app` | No path, no trailing slash. |
   | Logout URI | `https://kozy-living.vercel.app/` | **With** the trailing slash: the logout route sends `${NEXT_PUBLIC_SITE_URL}/`, and Shopify matches it exactly. |

   Then add the **staging branch alias** as a second entry in each of the
   three lists, once the `live-store` branch has deployed (Phase 12.1).
   Vercel names it `kozy-living-git-live-store-<team>.vercel.app`; copy
   the exact host from the deployment's *Domains*. That alias is what the
   staging test signs in on.

   `kozyliving.in` is added at cutover (Phase 13.3, step 6).
7. **Settings → Customer accounts** is already on the new customer
   accounts (verified). Leave it.

### 1.7 Admin API app (forms and newsletter at runtime, plus the migration)

Three features write through the Admin API:

- the contact form (`contact_message` metaobject)
- the B2B form (`contact_message` metaobject)
- the newsletter (customer marketing consent)

Use **two apps**, so the powerful migration scopes do not stay live.

| App | Scopes | Lifetime |
| --- | --- | --- |
| `Kozy storefront` (runtime) | `read_metaobjects`, `write_metaobjects`, `read_customers`, `write_customers` | Permanent |
| `Kozy migration` (only if Phases 4-6 are scripted) | `read_products`, `write_products`, `read_metaobject_definitions`, `write_metaobject_definitions`, `read_metaobjects`, `write_metaobjects`, `read_files`, `write_files`, `read_online_store_navigation`, `write_online_store_navigation`, `read_content`, `write_content` | Uninstall in Phase 15 |

How to create one: Shopify no longer issues permanent `shpat_` tokens for
apps created after January 2026 (see `docs/NEWSLETTER_SETUP.md`).

1. Create the app in the **Dev Dashboard** (dev.shopify.com) of the
   organisation that **owns the live store**.
2. Set its Admin API scopes and release a version.
3. Install it on `4nr8xa-3x.myshopify.com`.
4. Copy the **Client ID** and **Client secret** into
   `SHOPIFY_ADMIN_CLIENT_ID` / `SHOPIFY_ADMIN_CLIENT_SECRET`.
   `src/lib/shopify/admin.ts` exchanges them for a 24-hour token itself.
5. If the exchange answers 400/401, the usual cause is that the app and
   the store are not in the same organisation. Have the owner create the
   app from their organisation.
6. If the live store already has a legacy custom app with a `shpat_`
   token, adding the four scopes to it and using
   `SHOPIFY_ADMIN_ACCESS_TOKEN` works too. `admin.ts` tries that first.

### 1.8 Freeze dev

- [ ] Tell everyone with dev Admin access: no edits from now on.

---

## Phase 2 - Files and media

Three groups of files live in **dev's** storage. A dev-store URL keeps
working only while the dev store exists, so every one is re-hosted on
live.

| Group | Count | Used by | Listed in |
| --- | --- | --- | --- |
| Photos hard-coded in `src/lib/site.ts` (incl. logo and social card) | 38 | Hero, lookbook, story band, founder pages, header logo, social card | [Appendix D.1](#d1-images-in-srclibsitets) |
| Videos hard-coded in `src/lib/site.ts` | 7 | Hero films, founder reel | [Appendix D.2](#d2-videos-in-srclibsitets) |
| Swatch images referenced by metaobjects | 5 | Kit fabric and kit colour chips | [Appendix D.3](#d3-swatch-images-used-by-metaobject-entries) |

Steps:

1. [ ] Download every file. In dev Admin, **Content → Files**: search
       each name and use ⋯ → Download. Or open each URL from `site.ts` in
       a browser and save it.
2. [ ] Upload them to live under **Content → Files → Upload files**.
       **Keep the file names.** If live already has a file of the same
       name, Shopify adds a suffix. Note it.
3. [ ] For every file, copy its new URL (file → *Copy link*) into a
       two-column sheet: `old URL → new URL`. Phase 11.3 uses this sheet.
       Videos get a new `cdn.shopify.com/videos/c/o/v/<id>.mp4` URL; copy
       it from the file's details.
4. [ ] **Logo (`Kozy_Logo.png`): upload the exact same file, unedited.**
       Its URL carries a crop measured in the file's own pixels
       (`crop_left=150&crop_top=124&crop_width=1508&crop_height=690`).
       - Same pixels: the crop stays valid; only the base URL and `v=`
         change.
       - Re-exported file: re-measure the ink box (CLAUDE.md §6, "The
         header logo").
5. [ ] `IMG_1641.heic`: HEIC does not render in most browsers. Check where
       it appears in `site.ts`. If the page shows a broken frame there,
       convert it to JPG before uploading and update the URL.
6. [ ] The 5 swatches only need to exist in live Files. Phase 5 picks
       them from there.

---

## Phase 3 - Products

### 3.1 The nine products

> **2026-10-25:** five of the nine are on live. `custom-ritual-kit` is
> Unlisted; `personalized-initials` and `kozy-gift-box` are still **Active**
> with vendor `Kozy Living Dev` (3.3, 3.5 not done for them); `pink-robe`
> and the mini sofa are published to Headless but not the Online Store.
> **The four kit pieces are still to come**, so steps 3.2-3.6 now apply
> to those four only, plus the add-on fix-ups.

| Handle | Title (dev) | Tags | Options → variants @ price (₹) | SKU | Status on live |
| --- | --- | --- | --- | --- | --- |
| `bathrobe` | Bathrobe | `kozy-kit-piece` | Size `S-M / M-L / L-XL` × Fabric `Solid / Block printed` → Solid 2000, Block printed 3000 | none in dev | **Unlisted** |
| `slipper` | Slipper | `kozy-kit-piece` | Size `UK 3-4 … UK 11-12` (5) × Fabric → Solid 1199, Block printed 1499 | none | **Unlisted** |
| `makeup-pouch` | Makeup pouch | `kozy-kit-piece` | Fabric × Size `Free Size` → Solid 899, Block printed 1499 | none | **Unlisted** |
| `eye-mask` | Eye mask | `kozy-kit-piece` | Size `Free Size` × Fabric → Solid 699, Block printed 899 | none | **Unlisted** |
| `custom-ritual-kit` | Custom Ritual Kit | `kozy-kit` | one variant → 0 | `KOZY-KIT` | **Unlisted** |
| `personalized-initials` | Personalised Initials | `kozy-addon` | one variant → 499 | `KOZY-ADDON-INITIALS` | **Unlisted** (Active in dev; see 3.4) |
| `kozy-gift-box` | Kozy Gift Box | `kozy-addon` | one variant → 999 | `KOZY-ADDON-GIFTBOX` | **Unlisted** (Active in dev; see 3.4) |
| `pink-robe` | Rose Tea Ritual Robe | — | Size `s-m / m-l / l-xl` × Sleeve Detail `Scrunchie Sleeve / Wide Open Sleeve` → 4500 | none | Active |
| `mini-soft-sofa-natural-yellow-dyed` | Mini Soft Floor Lounge Seating - Naturally Dyed Yellow | — | Size `S / M / L` → 7000 / 8500 / 9000 | none | Active |

**Do not rename** these handles or the three SKUs:

- The metaobjects point at the products.
- The kit URL state uses the handles.
- Flow, the packing slip and the workshop read the SKUs.

The `custom-ritual-kit` / `KOZY-KIT` pair is also referenced by name in
`docs/custom-kit-builder.md`.

### 3.2 Export from dev

1. Dev Admin → **Products** → search each handle → tick all 9.
2. **Export → Selected products → CSV for Excel** (or plain CSV).

### 3.3 Edit the CSV before importing

- **Vendor:** the 7 kit and add-on products say `Kozy Living Dev`. Change
  them to the live store's vendor, `KOZYLIVING`.
- **Optional kit SKUs:** dev's kit pieces have none. If the owner wants
  them, fill in the scheme from `docs/custom-kit-builder.md` §5 Step 1
  (`KOZY-KIT-ROBE-SOL-<SIZE>` …). Nothing in code or Flow depends on them.
- Leave the `Image Src` columns as they are. Shopify downloads each image
  from dev's CDN during the import, which is why dev must stay alive.

### 3.4 Import on live

1. Live Admin → **Products → Import** → choose the CSV.
2. Leave **"Overwrite products with matching handles"** **off**. None
   should match, and if one does, you want to know.
3. Import and wait for the email.

### 3.5 Fix up each imported product

- [ ] **Status → Unlisted** for the 7 kit and add-on products.
  - Unlisted keeps them out of the Pitch theme's collections and search
    (the add-ons were Active in dev and would otherwise show up in
    `/collections/all` on the live theme).
  - The headless site still reaches them, because it loads them through
    metaobject references, which is one of the three ways Shopify returns
    an Unlisted product.
- [ ] **Sales channels** for all 9: include *Kozy Living Headless*. For
      the 7 Unlisted ones, also untick Online Store, Shop, Google &
      YouTube and Facebook & Instagram.
- [ ] **Inventory** (CSV location names do not match across stores):
  - `custom-ritual-kit`, `personalized-initials`: **Track quantity off**.
    The kit container is never stock-tracked; the code relies on that.
  - `kozy-gift-box`: track it if the owner counts boxes, otherwise off.
  - Kit pieces: real stock per Size × Fabric on the live location.
  - `pink-robe`, mini sofa: the owner's stock.
- [ ] **Shipping, weight and tax:** copy each product's settings from
      dev. Physical product yes/no, weight, "Charge tax", HS code.
- [ ] **Fabric option:** dev's Fabric may be a *linked* option (category
      metafield). The CSV recreates it as a plain option. That is fine:
      `kit_fabric.option_value` is matched by text, forgivingly
      (`Block Printed` = `Block printed`).
- [ ] `pink-robe` ("Rose Tea Ritual Robe") sits next to live's
      `rose-tea-ritual-robe-kit`. It is kept as decided. Ask the owner
      whether both should be visible.

### 3.6 Check

- `/products/pink-robe` and `/products/mini-soft-sofa-natural-yellow-dyed`
  open on the live theme (they are Active).
- The 7 Unlisted ones **do not** appear in the theme's `/collections/all`
  or search.

---

## Phase 4 - Metaobject definitions

Live Admin → **Settings → Custom data → Metaobject definitions → Add definition**.

### Rules for every definition

- **Type must match exactly** (`shop_color`, not `Shop color` and not
  `shop_colour`). Shopify fills the type in from the name; edit it before
  saving. The site queries by type.
- **Field keys must match exactly.** Renaming a field later does *not*
  change its key, and a field's type cannot be changed after creation.
  If a key is wrong, delete the field and add it again.
- **Access → Storefronts: ON** for every definition **except**
  `contact_message`. Without it the site sees nothing.
- **"Active/draft status" (publishable): leave OFF.** The site uses its
  own `active` boolean field. If publishing is turned on, new entries
  default to **Draft**, and the Storefront API does not return drafts.
- Create them **in this order**. `kit_colour` references `kit_fabric`, so
  `kit_fabric` must exist first.
- Dev is the authority. If a field in dev's definition is not in these
  tables, copy it across as it is.

### 4.1 `shop_color` - "Shop color"

| Key | Type | Notes |
| --- | --- | --- |
| `name` | Single line text | Required. Display name. |
| `color` | Color | The swatch hex. |
| `sort_order` | Integer | Order on Shop by colour. |

### 4.2 `shop_mood` - "Shop mood"

| Key | Type | Notes |
| --- | --- | --- |
| `name` | Single line text | Required. Display name. |
| `description` | Multi-line text | The merchant's line under the mood. |
| `sort_order` | Integer | |

### 4.3 `product_add_on` - "Product add-on"

Full rationale: `docs/personalisation-add-ons.md` §4 Step 2.

| Key | Type | Notes |
| --- | --- | --- |
| `title` | Single line text | Display name. |
| `kind` | Single line text | Validation: regular expression `^(initials\|gift_box)$`. |
| `variant` | Product variant (one) | The charged SKU. The price is read from here. |
| `active` | True or false | |
| `apply_to_all` | True or false | Entries with this off are ignored (per-product add-ons are not implemented). |
| `charge_per_unit` | True or false | |
| `required` | True or false | Read by nothing; kept for parity. |
| `text_label` | Single line text | Label of the letters field. |
| `text_required` | True or false | |
| `max_length` | Integer | |
| `help_text` | Multi-line text | |
| `policy_note` | Single line text | |

### 4.4 `kit_fabric` - "Kit fabric"

| Key | Type | Notes |
| --- | --- | --- |
| `title` | Single line text | Display name. |
| `option_value` | Single line text | **Required.** The Fabric option value it selects on the products. |
| `description` | Multi-line text | |
| `swatch` | File (images) | |
| `is_default` | True or false | |
| `sort_order` | Integer | |
| `active` | True or false | |

### 4.5 `kit_colour` - "Kit colour"

| Key | Type | Notes |
| --- | --- | --- |
| `title` | Single line text | Display name. |
| `colour` | Color | |
| `fabric` | Metaobject reference → **Kit fabric** | **Required.** Which fabric offers this colour. |
| `swatch` | File (images) | |
| `sort_order` | Integer | |
| `active` | True or false | |

### 4.6 `kit_piece` - "Kit piece"

| Key | Type | Notes |
| --- | --- | --- |
| `title` | Single line text | Display name. |
| `product` | Product reference (one) | **Required.** The Unlisted piece. |
| `description` | Single line text | |
| `embroiderable` | True or false | |
| `sort_order` | Integer | |
| `active` | True or false | |

### 4.7 `embroidery_thread` - "Embroidery thread"

| Key | Type | Notes |
| --- | --- | --- |
| `title` | Single line text | Display name. |
| `colour` | Color | |
| `sort_order` | Integer | |
| `active` | True or false | |

### 4.8 `kit_builder` - "Kit builder" (one entry: the settings)

| Key | Type | Notes |
| --- | --- | --- |
| `title` | Single line text | Display name. |
| `container_variant` | Product variant (one) | **Required.** `custom-ritual-kit`'s only variant. |
| `min_pieces` | Integer | |
| `initials_max_length` | Integer | |
| `embroidery_note` | Multi-line text | |
| `policy_note` | Single line text | |
| `active` | True or false | |
| `initials_variant` | Product variant (one) | Optional. Not set in dev; the code reads it if present. |

### 4.9 `contact_message` - "Contact message" (Storefronts access OFF)

Written by the contact and B2B forms through the Admin API. **Storefronts
access stays off**: these are private enquiries.

| Key | Type | Notes |
| --- | --- | --- |
| `name` | Single line text | |
| `email` | Single line text | |
| `phone` | Single line text | Empty string allowed. Must not be required. |
| `message` | Multi-line text | B2B writes company / type / products / quantity as labelled lines here. |
| `source` | Single line text | `storefront-contact-form` or `storefront-b2b-form`. |
| `received_at` | Date and time | The code writes an ISO timestamp. **Open dev's definition and copy its exact type.** If dev used single line text, use that. |

Do not add required fields to this definition: both forms would then fail
(CLAUDE.md §4).

---

## Phase 5 - Metaobject entries

Live Admin → **Content → Metaobjects →** *the definition* **→ Add entry**.
Every value is in [Appendix A](#appendix-a---metaobject-entries).

**The entry handles must match dev's exactly.** They appear in URLs and
in the URL state:

- `?colour=indigo-blue`
- `?mood=rest-as-a-ritual`
- `?pieces=bathrobe,makeup-pouch&fabric=solid&thread=gold`

Shopify generates a handle from the display name. Open the entry's handle
field and correct it before saving, e.g. `mask-eye-mask` and
`add-your-initials`.

Order, and what each depends on. As of 2026-10-25 every entry exists;
the open part is the reference fields.

1. [x] `shop_color` × 6. Trim `rose-pink`'s name (`" Rose Pink"`).
2. [x] `shop_mood` × 6
3. [~] `kit_fabric` × 2: entries in, **swatch** empty (needs Phase 2).
   `block-printed` has `is_default` true; set it **false**.
4. [~] `kit_colour` × 3: entries in, `fabric` → `solid` set, **swatch** empty.
5. [x] `embroidery_thread` × 6
6. [~] `kit_piece` × 4: entries in, **`product` empty** (the pieces are not
   on live yet). The eye mask entry's handle is `eye-mask`, not dev's
   `mask-eye-mask`; keep it, it only changes the `?pieces=` value in kit
   links shared from dev.
7. [~] `product_add_on` × 2: entries in, **`variant` empty**. Point them at
   `KOZY-ADDON-INITIALS` and `KOZY-ADDON-GIFTBOX`.
8. [~] `kit_builder` × 1: entry in, **`container_variant` empty**. Point it
   at `custom-ritual-kit`'s variant (`KOZY-KIT`).

Data defects to fix rather than copy:

- `kit_piece` **`mask-eye-mask`**: dev's `title` is `" Mask<TAB>Eye mask"`
  (a stray tab and leading space). Enter **`Eye Mask`**.
- `kit_fabric` `block-printed`: `option_value` is `Block Printed` while
  the products say `Block printed`. The code matches these forgivingly, so
  either is fine. Using `Block printed` makes them agree.

Check: the query in [Appendix E.1](#e1-checking-what-the-site-can-see)
returns the counts 6 / 6 / 2 / 1 / 4 / 2 / 3 / 6.

---

## Phase 6 - Colour and mood on products

### 6.1 Definitions

Live Admin → **Settings → Custom data → Products → Add definition**:

| Name | Namespace and key | Type | Storefronts access |
| --- | --- | --- | --- |
| Shop colours | `custom.shop_colors` | Metaobject → **Shop color** → **List of entries** | **ON** |
| Shop mood | `custom.shop_mood` | Metaobject → **Shop mood** → **List of entries** | **ON** |

The key is `shop_colors` with the US spelling. That is the identifier the
code reads first (`src/lib/shop/colours.ts`). Do not "correct" it.

### 6.2 Values

> **2026-10-25:** not started. No product on live returns either field
> through the Storefront API.

58 products. The full list is in [Appendix B](#appendix-b---colour-and-mood-on-products).

- **By hand:** each product → *Metafields* → Shop colours / Shop mood →
  pick the entries. **Keep the order shown in the appendix.**
  `morning-luxuries-furrie-shirt` is `white, oat-milk`, in that order.
- **Faster:** Products → select a batch → **Bulk edit** → *Columns* →
  add *Shop colours* and *Shop mood*. If the bulk editor will not edit
  list references in this admin, go product by product, or use the
  script (Appendix E).
- The live tags `Green`, `Blue`, `Yellow`, `Indigo` and `Robe` stay; the
  site does not read them.

---

## Phase 7 - Collections

> **Rewritten 2026-10-25.** The plan here used to map dev's collections
> onto live's 26 existing ones (`kloud-slippers`, `krafted`,
> `small-paws-klub`, …). Live was instead rebuilt on dev's structure, and
> those 26 are gone. This is the state as measured.

### 7.1 The mapping

Live has one collection per dev collection, except Shopify's unused
`frontpage`. 14 keep dev's handle; 6 were given a clean one, and the code
follows those 6 (11.2).

| Dev handle | Live handle | Live title | Members (dev / live) |
| --- | --- | --- | --- |
| `bathrobes` | `bathrobes` | Bathrobes | 11 / 11 |
| `bestsellers` | `bestsellers` | Bestsellers | 6 / 6 |
| `ritual-kits` | `ritual-kits` | Ritual Kits | 9 / 9 |
| `slippers` | `slippers` | Slippers | 11 / 12, see 7.2 |
| `kessentials` | `kessentials` | Kessentials | 15 / 16, see 7.2 |
| `kessentials-bathrobes` | `kessentials-bathrobes` | Kessentials Bathrobes | 6 / 6 |
| `kessentials-ritual-kit` | `kessentials-ritual-kit` | Kessentials Ritual Kit | 6 / 6 |
| `krafted-rituals-kit` | `krafted-rituals-kit` | Krafted Rituals Kit | 3 / 3 |
| `pet-collection` | `pet-collection` | Pet Collection | 20 / 21, see 7.2 |
| `pet-carrier` | `pet-carrier` | Pet Carrier | 7 / 7 |
| `pet-seating` | `pet-seating` | Pet Seating | 6 / 7, see 7.2 |
| `pet-parent` | `pet-parent` | Pet & Parent | 7 / 7 |
| `pet-clothing` | `pet-clothing` | Pet Clothing | 6 / 6 |
| `shop-by-colour` | `shop-by-colour` | Shop By Colour | 17 / 17 (unused by the code) |
| `crafted-by-kozy` | **`krafted-by-kozy`** | Krafted By Kozy | 14 / 16, see 7.2 |
| `dabu-printed-pillows` | **`decorative-throw-pillows`** | Decorative Throw Pillows | 10 / 10 |
| `decorative-pillows` | **`decorative-shaped-pillows`** | Decorative Shaped Pillows | 3 / 3 |
| `slippers-copy` | **`kessentials-slippers`** | Kessentials Slippers | 3 / 3 |
| `slippers-copy-1` | **`krafted-by-kozy-slippers`** | Krafted By Kozy Slippers | 8 / 8 |
| `kozy-by-crafted-bathrobes` | **`krafted-by-kozy-bathrobes`** | Krafted By Kozy Bathrobes | 5 / 5 |
| `frontpage` | not migrated | — | Shopify's default, unused. |

The renames also fix two of CLAUDE.md §6's data defects: the scrambled
`kozy-by-crafted-bathrobes` handle, and `Krafted by  kozy Slippers`
(double space, lowercase k), now `Krafted By Kozy Slippers`.

Every collection is published to *Kozy Living Headless* (the token
returns all 20), so 7.5 is done.

### 7.2 Membership differences

Dev's members were read from dev's published site; live's from the
Headless token. Everywhere else the two sets are identical. **Owner's
call** on each: either make live match dev, or accept live as the newer
intent.

| Live collection | On live, not in dev | In dev, not on live |
| --- | --- | --- |
| `slippers` | `masala-chai-waffle-slipper`, `puffer-sunshine-slipper` | `milk-froth-kloud-slipper` |
| `kessentials` | `milk-froth-kloud-slipper` | — |
| `krafted-by-kozy` | `neelu-indigo-ritual-kit`, `mini-soft-sofa-natural-yellow-dyed` | — |
| `pet-collection` | `mini-soft-sofa-natural-yellow-dyed` | — |
| `pet-seating` | `mini-soft-sofa-natural-yellow-dyed` | — |

The mini sofa is in three live collections but published only to
Headless, so the theme does not show it there; the new site will.

**Sort order was not compared.** The Storefront API gives a collection's
own order and dev's site sorts its own way, so the two lists cannot be
lined up. Check `bestsellers` especially: the homepage rail reads it in
its Admin order.

### 7.3 Old live collection URLs

Live's previous collections no longer resolve. On 2026-10-25 each of
these returned **404 on kozyliving.in**, and the Pitch homepage still
links to the last two:

`best-sellers`, `kloud-slippers`, `krafted`, `small-paws-klub`,
`the-kozy-lounge`, `morning-luxuries-with-kozy`

The other old handles (from the 2026-10-15 measurement) are almost
certainly gone too: `best-sellers-1`, `pet-karrier`, `kessential-slippers`,
`krafted-slippers`, `krafted-kits`, `floor-sitting`, `his-and-hers-kit-1`,
`kessentials-kit`, `pillows`, `mini-sofas`.

Two places need redirects, because the theme serves kozyliving.in until
cutover and this app after it:

- [ ] **Now, in Shopify:** Online Store → Navigation → **URL Redirects**,
      `/collections/<old>` → `/collections/<new>`. Fixes the live shop and
      Google's index today.
- [ ] **At cutover, in `next.config.js`** (11.4): the same pairs as
      `/collections/<old>` → `/search/<new>`, placed **before** the
      generic `/collections/:handle` rule, which would otherwise send them
      to a 404 on the new site.

Suggested targets. Those marked *owner* have no obvious successor:

| Old live handle | New live handle |
| --- | --- |
| `best-sellers`, `best-sellers-1` | `bestsellers` |
| `kloud-slippers` | `slippers` |
| `krafted` | `krafted-by-kozy` |
| `small-paws-klub` | `pet-collection` |
| `pet-karrier` | `pet-carrier` |
| `kessential-slippers` | `kessentials-slippers` |
| `krafted-slippers` | `krafted-by-kozy-slippers` |
| `krafted-kits` | `krafted-rituals-kit` |
| `kessentials-kit` | `kessentials-ritual-kit` |
| `pillows` | `decorative-throw-pillows` |
| `floor-sitting`, `mini-sofas` | `pet-seating` (*owner*) |
| `the-kozy-lounge`, `morning-luxuries-with-kozy` | *owner* (perhaps `bathrobes` or `/search`) |
| `his-and-hers-kit-1` | `/products/neelu-tulsi-his-hers-ritual-kit` (*owner*) |

Also fix the theme homepage's two dead links, or let the redirects carry
them.

### 7.4 Bestsellers

- `bestsellers` is read **in its Admin order**. Open it and confirm
  **Sort: Manually**, in the order the owner wants on the homepage rail.

### 7.5 Channel

- [x] Every collection is in the *Kozy Living Headless* channel
      (2026-10-25). Keep including new ones: the site **404s an unknown
      or unpublished collection** on purpose.

---

## Phase 8 - Pages, blog, policies, customers

### 8.1 Pages

The site has its own routes for most pages, and those routes shadow
Shopify pages of the same handle.

**Done 2026-10-25:** live has all 8 of dev's pages, under the same
handles. The menus link to them as *Page* items, which the site rewrites
from `/pages/x` to `/x`, so the code routes still answer.

| Handle | On live? | Note |
| --- | --- | --- |
| `contact` | yes | |
| `faq` | yes | ⚠️ **Empty body**, as in dev, so `/faq` renders an empty page. Write the FAQ in it, or drop the footer's FAQ item (Phase 9). |
| `shop-by-colour`, `shop-by-mood`, `the-kozy-story`, `founders-note`, `b2b-enquiries`, `kit-builder` | yes | Empty bodies; the site's own routes shadow them. ⚠️ The Pitch theme's menu links to them, so **they render blank on kozyliving.in until cutover**. |

### 8.2 Journal

> **2026-10-25:** not done. Live's `news` blog (titled *KOZY KORNER*)
> still lists only its own 3 articles.

Dev's blog `news` has 4 articles that live does not have:

- `the-hands-behind-every-kozy-kreation`
- `why-kozy-living-is-eco-conscious`
- `rest-is-a-ritual`
- `the-art-of-dabu-hand-block-printing`

Steps:

- [ ] Recreate each one in live **Content → Blog posts**, blog `News`.
      Same title, **same handle**, body, featured image (upload it), excerpt,
      tags, author, SEO fields and published date.
- [ ] These go live on the Pitch theme's journal straight away. Set them
      **Hidden** until cutover if the owner prefers.

Live's own 3 articles stay and will list on `/blogs`:

- `brand-manifesto`
- `founders-note`
- `private-label-b2b-partnerships`

Decide with the owner whether the `founders-note` article should
redirect to the site's `/founders-note` page, so the same letter does not
appear twice (Phase 11.4 has the line, commented out).

### 8.3 Policies

Live has privacy, refund and shipping policies; dev only had privacy. The
site lists only the policies that exist, so nothing to do.

- [ ] Recommended: write a **Terms of service** (Settings → Policies).
      Neither store has one.

### 8.4 Customer data that may only exist in dev

If the staging site was ever shared beyond the team, real people may have
used it:

- [ ] Dev Admin → **Content → Metaobjects → Contact message**: any real
      enquiries? Answer them, or copy them into live's inbox.
- [ ] Dev Admin → **Customers**, filtered by *Email subscribed*: any real
      newsletter sign-ups? Export them (CSV), then import into live with
      marketing consent **only** for those who gave it.
- Dev **orders** are test orders and are not migrated.

---

## Phase 9 - Menus

> **Rewritten 2026-10-25.** The plan was a separate `kozy-headless-menu`,
> leaving the theme's `main-menu` alone. Instead dev's menu was built
> straight into live's **`main-menu`**, which the site reads by default,
> and the Pitch theme renders it too. This is what live holds.

The site reads menus through the Storefront API and rewrites Shopify
links: `/collections/x` → `/search/x`, `/products/x` → `/product/x`,
`/pages/x` → `/x`. The menu titles are the merchant's text and appear as
typed; the house spelling changes only "Crafted" → "Krafted" and "Pet
Collection" → "Pet Kollection".

### 9.1 Main menu → `main-menu` (done)

| Item | Link type | Target on live |
| --- | --- | --- |
| **Home** | Home page | — |
| **Shop** | Catalog | `/collections/all` |
|   Shop by Colour | Page | `shop-by-colour` |
|   Shop by Mood | Page | `shop-by-mood` |
|   Bathrobes | Collection | `bathrobes` |
|   Pillows | Collection | `decorative-throw-pillows` |
|   Slippers | Collection | `slippers` |
|   Ritual Kits | Collection | `ritual-kits` |
|   Kustom Kit | Page | `kit-builder` |
| **Krafted by Kozy** | Collection | `krafted-by-kozy` |
|   Bathrobes | Collection | `krafted-by-kozy-bathrobes` |
|   Slippers | Collection | `krafted-by-kozy-slippers` (dev pointed at the parent; fixed) |
|   Pillows | Collection | `decorative-throw-pillows` |
|   Ritual Kits | Collection | `krafted-rituals-kit` |
|   His and Her Ritual Kit | Product | `neelu-tulsi-his-hers-ritual-kit` |
| **Kessentials** | Collection | `kessentials` |
|   Bathrobes | Collection | `kessentials-bathrobes` |
|   Ritual Kits | Collection | `kessentials-ritual-kit` |
|   Slippers | Collection | `kessentials-slippers` |
| **Pet Kollection** | Collection | `pet-collection` |
|   Pet Karrier | Collection | `pet-carrier` |
|   Pet Seating | Collection | `pet-seating` |
|   Pet Klothing | Collection | `pet-clothing` |
|   Pet & Parent | Collection | `pet-parent` |
| **The Kozy Story** | Page | `the-kozy-story` |
|   Founders Note | Page | `founders-note` |
|   B2B Enquiries | Page | `b2b-enquiries` |
|   Blogs | Blog | `news` |
| **Contact** | Page | `contact` |

Against dev's menu: "Custom Kit" → "Kustom Kit", "Shop by Colours" →
"Shop by Colour", "Contact Us" → "Contact", and page links where dev used
web addresses. All of these resolve on the site.

### 9.2 Footer → `kozy-living-footer` (done)

The footer menu turns parents with children into columns, and puts items
without children in a last column (CLAUDE.md §4).

| Item | Link type | Target on live |
| --- | --- | --- |
| **Home** | Home page | — |
| **Shop** | Catalog | as in 9.1, all seven children |
| **Krafted by Kozy** | Collection | `krafted-by-kozy` |
|   Ritual Kits | Collection | `krafted-rituals-kit` |
|   His and Her Ritual Kit | Product | `neelu-tulsi-his-hers-ritual-kit` |
| **Kessentials** | Collection | `kessentials` (no children) |
| **Pet Kollection** | Collection | `pet-collection`, with the four pet collections |
| **The Kozy Story** | Page | `the-kozy-story` |
|   Founders Note | Page | `founders-note` |
|   B2B Enquiries | Page | `b2b-enquiries` |
|   Blogs | Blog | `news` |
|   FAQ | Page | `faq` (⚠️ empty body, 8.1) |
|   Privacy Policy | Shop policy | `privacy-policy` |
|   Refund Policy | Shop policy | `refund-policy` |
| **Contact** | Page | `contact` |

The footer's legal row lists the shop's policies on its own
(`getShopPolicyNames()`), so the two policy items appear twice on the
page. Harmless; drop them from the menu if the owner prefers.

Live's Shopify-default `footer` menu (one "Search" link) is not read.

### 9.3 Environment

- **No menu variable is needed.** The site tries `main-menu` and
  `kozy-living-footer` by default. Leave
  `NEXT_PUBLIC_SHOPIFY_MENU_HANDLE` unset.

---

## Phase 10 - Flow, packing slip, notifications, discounts

### 10.1 Shopify Flow

1. Install **Shopify Flow** on live, if it is not installed.
2. In dev's Flow, open each workflow → **⋯ → Export** (`.flow` file):
   - add-ons: order tags `personalised` and `gift-box`
     (`docs/personalisation-add-ons.md` §4 Step 5)
   - kit: order tags `custom-kit` and `block-print`
     (`docs/custom-kit-builder.md` §5 Step 7)
   - any newsletter automation (`docs/NEWSLETTER_SETUP.md` §4)
3. In live's Flow, **Import** each one. Check that the conditions still
   read `KOZY-ADDON-INITIALS`, `KOZY-ADDON-GIFTBOX` and `KOZY-KIT`, then
   **turn it on**.
4. Look at the live store's existing workflows too. Do not duplicate one
   that already tags these orders.

### 10.2 Packing slip

- Settings → Shipping and delivery → **Packing slips → Edit**. Bring
  dev's changes across:
  - initials under the line: add-ons doc §4 Step 6
  - kit grouping: kit doc §5 Step 8
- **Merge, do not paste over**: live's slip may carry its own changes.
  Copy live's current template somewhere first.

### 10.3 Notifications

- If dev's **order confirmation** (or other) templates were changed for
  kits and initials (kit doc §5 Step 8), make the same change in live.
  Again, merge with live's own edits.

### 10.4 Discounts

- Re-run the checks in add-ons doc §4 Step 7 and kit doc §5 Step 9
  against **live's** discount codes. Live has its own codes, which dev
  never saw. Decide per code whether it may discount add-ons and kits.

### 10.5 Newsletter

- Follow `docs/NEWSLETTER_SETUP.md` §4-5 on live: the marketing surface
  that actually emails subscribers, and the double opt-in setting.

### 10.6 Shipping, payments, markets

- These already work on live. Confirm only that the 9 new products sit
  in a shipping profile that ships them (the default profile does).

---

## Phase 11 - Code changes

Do these on a branch (e.g. `live-store`). Nothing here should merge to
`main` until Phase 12 passes.

### 11.1 Environment variables

Set these in **Vercel → Settings → Environment Variables**: Preview
first, Production at cutover. Mirror them in local `.env`.

| Variable | Value | Notes |
| --- | --- | --- |
| `SHOPIFY_STORE_DOMAIN` | `4nr8xa-3x.myshopify.com` | Always the myshopify domain, never `kozyliving.in`. |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | public token (1.4) | |
| `SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN` | private token (1.4) | Server only. |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | from 1.6 | |
| `SHOPIFY_ADMIN_CLIENT_ID` / `SHOPIFY_ADMIN_CLIENT_SECRET` | runtime app (1.7) | Or `SHOPIFY_ADMIN_ACCESS_TOKEN`. |
| `NEXT_PUBLIC_SHOPIFY_MENU_HANDLE` | leave unset | Live's `main-menu` is the headless menu (9.3). |
| `SHOPIFY_REVALIDATION_SECRET` | a new long random string | Used in the webhook URL (13.3). It is empty today. |
| `NEXT_PUBLIC_SITE_URL` | Preview (`live-store` branch only): `https://kozy-living-git-live-store-<team>.vercel.app` · Production: `https://kozyliving.in` | Must match the Customer Account API URLs exactly. Not `kozy-living.vercel.app` on the preview: that host is production, still on dev until cutover, so a sign-in started on the preview would land there and fail its state check. |
| `TWITTER_SITE` | `https://kozyliving.in` | It is `https://kozyliving.com` today. |
| `SHOPIFY_STOREFRONT_PUBLIC_TOKEN`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | delete or set to live values | Aliases. A stale dev value is a trap. |

Also delete the old **dev** values from every Vercel environment, so a
preview cannot quietly read the wrong store.

### 11.2 Collection handles in code

**Rewritten 2026-10-25** for the live store as rebuilt (7.1). Only the
six renamed collections move; line numbers are as of commit `b9118f0`.
Search for the old handle if they have moved.

| File | Where | Old | New |
| --- | --- | --- | --- |
| `src/components/product/product-description.tsx` | `KRAFTED_BY_KOZY_COLLECTION_HANDLE` (~17) | `crafted-by-kozy` | `krafted-by-kozy` |
| `src/lib/site.ts` | `lookbook` (~318) | `crafted-by-kozy` | `krafted-by-kozy` |
| `src/lib/site.ts` | `lookbook` (~377) | `dabu-printed-pillows` | `decorative-throw-pillows` |
| `src/lib/site.ts` | `aboutStory` (~501) | `dabu-printed-pillows` | `decorative-throw-pillows` |
| `src/lib/shop/faq.ts` | bathrobes (~56) | `kozy-by-crafted-bathrobes` | `krafted-by-kozy-bathrobes` |
| `src/lib/shop/faq.ts` | slippers (~63) | `slippers-copy`, `slippers-copy-1` | `kessentials-slippers`, `krafted-by-kozy-slippers` |
| `src/lib/shop/faq.ts` | pillows (~70, ~72 `shelf`) | `dabu-printed-pillows`, `decorative-pillows` | `decorative-throw-pillows`, `decorative-shaped-pillows` |

**Unchanged** (same handle on both stores): `bestsellers`
(`BESTSELLERS_COLLECTION_HANDLE` in `page.tsx`), `pet-collection`
(`PET_COLLECTION_HANDLE`, the lookbook, `aboutStory`, `faq.ts`),
`slippers`, `pet-carrier`, `pet-seating`, `pet-clothing`, `pet-parent`,
`ritual-kits`, `kessentials`, `kessentials-bathrobes`,
`kessentials-ritual-kit`, `krafted-rituals-kit`, and the product handles
`neelu-tulsi-his-hers-ritual-kit`, `hoodie-robe` and
`biscuits-floor-pillow-with-gusset`.

`kozy-lounge` (`site.ts` hero ~227, `aboutStory` ~516) and `blend`
(`page.tsx` `CuratedEdits`) exist in neither store and already fall back
(CLAUDE.md §6). The earlier advice to point `kozy-lounge` at live's
`the-kozy-lounge` is void: that collection is gone.

Check after editing (should print nothing):

```sh
grep -rnE "\"(crafted-by-kozy|dabu-printed-pillows|decorative-pillows|slippers-copy(-1)?|kozy-by-crafted-bathrobes)\"" src
```

### 11.3 Media URLs

- [ ] Replace each of the 38 image and 7 video URLs in `src/lib/site.ts`
      with its live URL, using the Phase 2 sheet.
- [ ] The logo keeps its `&crop=region&crop_left=150&crop_top=124&crop_width=1508&crop_height=690`
      suffix, **only if** the file was uploaded unchanged (Phase 2 step 4).
- [ ] `socialImage` keeps `width: 1200, height: 1500` if the file is
      unchanged.
- [ ] Check that both of these print `0`:

```sh
grep -c "0700/6476/7047" src/lib/site.ts
grep -c "cdn.shopify.com/videos/c/o/v/\(806a1252\|3329bb66\|65fa358e\|e78b76a0\|d761713a\|75445088\|4c106e13\)" src/lib/site.ts
```

### 11.4 Redirects for the theme's old URLs

Google, Instagram, old order emails and the Pitch theme's own links all
point at Shopify-style paths. Add these to `redirects()` in
`next.config.js`. **Order matters**: the nested product path must come
before the collection one.

```js
// Shopify theme URLs -> this app's routes. kozyliving.in served the Pitch
// theme until <cutover date>; every external link to it uses these shapes.
{ source: "/products/:handle", destination: "/product/:handle", permanent: true },
{ source: "/collections/:collection/products/:handle", destination: "/product/:handle", permanent: true },
{ source: "/collections", destination: "/search", permanent: true },
{ source: "/collections/all", destination: "/search", permanent: true },
// Live's pre-2026-10-25 collection handles (7.3), before the generic rule.
{ source: "/collections/best-sellers", destination: "/search/bestsellers", permanent: true },
{ source: "/collections/kloud-slippers", destination: "/search/slippers", permanent: true },
{ source: "/collections/krafted", destination: "/search/krafted-by-kozy", permanent: true },
{ source: "/collections/small-paws-klub", destination: "/search/pet-collection", permanent: true },
// …one line per row of the table in 7.3, with the owner's picks filled in.
{ source: "/collections/:handle", destination: "/search/:handle", permanent: true },
{ source: "/pages/:handle", destination: "/:handle", permanent: true },
{ source: "/cart", destination: "/", permanent: false },
{ source: "/account/:path+", destination: "/account", permanent: false },
// { source: "/blogs/news/founders-note", destination: "/founders-note", permanent: true }, // owner's call, 8.2
```

`/search?q=…`, `/blogs/…` and `/policies/…` already match routes in this
app.

### 11.5 Sitemap and robots: both are wrong today

- `src/app/sitemap.ts` hard-codes
  `const baseUrl = "https://demo-next-store.pages.dev/"`. **Every URL in
  the sitemap points at a stranger's domain.** Use `NEXT_PUBLIC_SITE_URL`.
- `src/app/robots.ts` builds the sitemap link from `NEXT_PUBLIC_VERCEL_URL`.
  That is the per-deployment `*.vercel.app` host, not the production
  domain. Use `NEXT_PUBLIC_SITE_URL`.

### 11.6 Smaller references

- `env.ts`: the `SHOPIFY_STORE_DOMAIN` default is `kozyliving-2.myshopify.com`
  (neither store), and the `TWITTER_SITE` default is `.com`. Update both,
  or drop the defaults.
- `next.config.js` `images.remotePatterns`: `vaishnaviestate.com` and
  `kozyliving.com` are leftovers. Every image now comes from
  `cdn.shopify.com`, so they can go.
- `src/lib/site.ts` `email: "care@kozyliving.com"` is `TODO(brand)` and
  on the `.com` domain. Confirm the real address with the owner; it stays
  marked TODO until then.
- ~~`.env.sample`: add `NEXT_PUBLIC_SHOPIFY_MENU_HANDLE`.~~ Not needed
  since the menu went into `main-menu` (9.3).

### 11.7 Documentation

Update in the same change:

- `CLAUDE.md` §6 "Known Shopify data defects":
  - `crafted-by-kozy` is now `krafted-by-kozy` on live, so
    `KRAFTED_BY_KOZY_COLLECTION_HANDLE` follows it
  - `kozy-by-crafted-bathrobes` is now `krafted-by-kozy-bathrobes`
  - `slippers-copy-1` is now `krafted-by-kozy-slippers`, titled
    `Krafted By Kozy Slippers` (no double space)
  - the Krafted by Kozy → Slippers menu link is fixed
  - `kozy-lounge` still exists nowhere
- `CLAUDE.md` §4: the menu is still `main-menu` (no change to the handle
  order), and the footer is still `kozy-living-footer`.
- `docs/CUSTOMER_AUTH_SETUP.md`: production URLs → `https://kozyliving.in`.

---

## Phase 12 - Staging test against the live store

### 12.1 Point a preview at live

1. Vercel **Preview** environment variables = the live values from 11.1,
   scoped to the `live-store` branch so other previews stay on dev.
2. Deploy the `live-store` branch.
3. Take its branch alias (`kozy-living-git-live-store-<team>.vercel.app`),
   set `NEXT_PUBLIC_SITE_URL` to it, and redeploy.
4. Add the alias's callback, origin and logout URI to the Customer Account
   API settings (1.6 step 6). Test sign-in on the alias, not on a
   per-deployment `*.vercel.app` URL.

### 12.2 The test

Follow CLAUDE.md §9 for using Playwright against this site: the loading
curtain, the newsletter popup, the viewport cookie.

**Catalogue**
- [ ] Homepage: every section renders, in order. The list is in CLAUDE.md §5.
  - Bestsellers shows `bestsellers` in Admin order.
  - The lookbook pages turn.
  - The story band's links resolve.
- [ ] Every menu and footer link opens a page. **No 404s.**
- [ ] `/search` and all 20 collections in 7.1, including the six renamed
      ones (`/search/krafted-by-kozy-bathrobes` and the rest).
- [ ] The old handles in 7.3 redirect (once 11.4 has them).
- [ ] A multi-variant product: the price follows the size; sold-out
      variants are handled.
- [ ] `/product/pink-robe`, `/product/mini-soft-sofa-natural-yellow-dyed`.
- [ ] `/product/personalized-initials` and `/product/bathrobe` show the
      not-found page. They must never list or render.
- [ ] `/shop-by-colour`: all 6 colours with counts. `/shop-by-mood`: 6
      moods, with Gifting Rituals "coming soon" if still untagged.

**Buying** (on the live store, so real stock and real payments)
- [ ] Product page: add with initials `KF` + gift box. The cart shows
      both nested under the line.
- [ ] Buy now: a separate checkout holds only this Kompanion.
- [ ] `/kit-builder`: complete a kit with fabric, kolour, thread and
      initials. The cart shows one kit.
- [ ] The homepage atelier builds and adds a kit.
- [ ] Card Add / Buy now / stepper on a shop grid.
- [ ] Checkout opens on the store's checkout domain, with the right lines
      and prices.
- [ ] **Place one real order.** Use a staff-only 100% discount code, or
      pay and refund. Then check in live Admin:
  - the order shows `Initials: KF` and `Kit: K-…`
  - Flow added `personalised`, `gift-box`, `custom-kit`
  - the packing slip prints the initials and the kit grouping
  - `/account` on the preview lists the order, grouped by kit

**Forms and accounts**
- [ ] Contact form → a new **Contact message** entry in live Admin
      (`source: storefront-contact-form`).
- [ ] B2B form (incl. "Kustomised" quantity) → an entry with
      `source: storefront-b2b-form`.
- [ ] Newsletter: the band, the popup and the teaser each create or
      update a customer in live Admin with **email marketing: subscribed**.
- [ ] Sign in, `/account`, sign out.

**Everything else**
- [ ] Journal list and an article; `/policies/refund-policy`.
- [ ] `/opengraph-image` renders with the photograph.
- [ ] No `/_next/image … 500` in the network panel.
- [ ] The breakpoint sweep (CLAUDE.md §9): `scrollWidth === clientWidth`
      at every width.

Only move on when every box is ticked.

---

## Phase 13 - Cutover

### 13.1 Before the day (T-2 days)

- [ ] **Find where kozyliving.in's DNS lives.**
  - **Bought through Shopify:** DNS is in Shopify Admin → Settings →
    Domains → kozyliving.in → *DNS settings*. If Shopify will not let you
    point the **root** record away from Shopify, the domain has to be
    **transferred out** first. A transfer takes days, so check this
    **now**.
  - **Bought elsewhere** (GoDaddy, Namecheap …): DNS is at that registrar.
- [ ] Lower the TTL on the `@` and `www` records to **300 seconds**.
- [ ] **Do not touch MX, TXT (SPF/DMARC) or DKIM records.** Email,
      including Shopify Email's sender authentication, depends on them.
- [ ] Build the **redirect theme**. Duplicate Pitch, name it
      `Pitch - redirect to headless`, and add the snippet from
      [Appendix F](#appendix-f---theme-redirect-snippet). **Do not
      publish it yet.**
- [ ] Merge `live-store` into `main` but keep the **Production** env on
      dev values, or hold the merge. Production must not switch stores
      before the domain does.
- [ ] Pick a quiet hour, and tell the owner the window (about an hour).

### 13.2 Why this order

Shopify's checkout needs a domain of its own. Today that is
`kozyliving.in`; after cutover, kozyliving.in belongs to Vercel. So:

1. Shopify's primary domain moves to `shop.kozyliving.in`.
2. Then kozyliving.in moves to Vercel.

Swapping the order sends shoppers to a checkout on a domain that no
longer reaches Shopify.

### 13.3 The steps (T = 0)

1. [ ] **Vercel production env** → the live values (11.1), with
       `NEXT_PUBLIC_SITE_URL=https://kozyliving.in`. Redeploy.
       `kozy-living.vercel.app` now serves the live store. Smoke-test it.
2. [ ] **Vercel → Domains:** add `kozyliving.in` and `www.kozyliving.in`
       to the production project. Choose which one redirects to the
       other, and note the DNS records Vercel asks for.
3. [ ] **Shopify → Settings → Domains → Connect existing domain:**
       `shop.kozyliving.in`.
       - Add a DNS `CNAME shop → shops.myshopify.com`.
       - Wait until Shopify shows it **Connected** with SSL issued.
       - Then **Change primary domain** → `shop.kozyliving.in`.
4. [ ] **Online Store → Themes:** publish `Pitch - redirect to headless`.
5. [ ] **DNS:** point `@` (kozyliving.in) and `www` at Vercel, using the
       records Vercel showed in step 2.
6. [ ] **Customer Account API** (1.6): add
       - Callback: `https://kozyliving.in/api/auth/callback`
       - JavaScript origin: `https://kozyliving.in`
       - Logout: `https://kozyliving.in/`
7. [ ] Once Vercel shows kozyliving.in **valid**: **Shopify → Domains →
       remove** `kozyliving.in` and `www.kozyliving.in`. Shopify then
       stops claiming them.
8. [ ] **Webhooks:** Settings → Notifications → **Webhooks → Create
       webhook**, format JSON, latest API version. URL:
       `https://kozyliving.in/api/revalidate?secret=<SHOPIFY_REVALIDATION_SECRET>`.
       - One webhook each for product creation, update and deletion.
       - One each for collection creation, update and deletion.
       - Blog post events too, if the list offers them.
       - Metaobject edits are not offered here. They reach the site within
         the 60-second cache TTL anyway.

### 13.4 Smoke test (straight after)

- [ ] `https://kozyliving.in` serves the new site, with a valid
      certificate, on mobile data as well as Wi-Fi.
- [ ] `https://kozyliving.in/products/tulsi` → 308 → `/product/tulsi`.
- [ ] `https://shop.kozyliving.in/products/tulsi` → the redirect theme →
      `https://kozyliving.in/product/tulsi`.
- [ ] Add to cart → **Checkout** opens on `shop.kozyliving.in` and
      completes (discount-code order).
- [ ] Sign in → `/account` → sign out.
- [ ] Edit a product title in Admin → the site shows it within seconds
      (webhook) or 60 s (TTL).
- [ ] Order confirmation email: "View order" and "Visit our store" links
      end up on kozyliving.in.

### 13.5 SEO and channels

- [ ] **Google Search Console:** verify `kozyliving.in` (Domain property
      via DNS, if not already). Submit `https://kozyliving.in/sitemap.xml`
      (after 11.5 is fixed). Inspect a few `/product/…` URLs.
- [ ] **Google & YouTube / Facebook & Instagram channels:** the product
      feeds link to the primary domain (`shop.kozyliving.in/products/…`),
      which now forwards to the new site. Watch **Merchant Center →
      Diagnostics** for a week. A redirect to another host can be flagged
      as a landing-page mismatch. If it is, the feed URLs need overriding
      to `https://kozyliving.in/product/<handle>`.

### 13.6 Rollback, if something is badly wrong

A rollback is DNS plus one theme switch. ⚠️ Phases 1-10 were meant to be
invisible to the theme, but since 2026-10-25 they are not: the theme
already renders the rebuilt collections, menu and pages (see
[Where live stands](#where-live-stands-2026-10-25)). Rolling back returns
the theme as it is then, not as it was on 2026-10-15.

1. Shopify → Domains → connect `kozyliving.in` again and **set it
   primary**.
2. DNS: `@` → `A 23.227.38.65` and `www` → `CNAME shops.myshopify.com`
   (Shopify's standard records).
3. Themes → publish the **original** Pitch, not the redirect copy.
4. Customer accounts keep working: they live on `shopify.com/97867235641`.

---

## Phase 14 - Theme apps that stop working

The Pitch theme loads these app embeds. **A headless storefront does not
run theme app embeds**, so each one disappears from the shop at cutover
unless it is replaced. Go through the list with the owner **before**
cutover.

| App (embed) | What it does on the theme | On the new site | Decide |
| --- | --- | --- | --- |
| **Easify product options** | Extra option fields on product pages | **Gone.** | ⚠️ Find which products use it and for what. If it collects initials or gift wrap, the site's add-ons (₹499 / ₹999) replace it. Anything else must become a variant, an add-on, or be dropped. Orders placed with its options must not lose information. |
| **Pre-order** (`pre-order-28`) | Lets out-of-stock products be ordered | **Gone.** | ⚠️ List the pre-order products. The site sells whatever Shopify allows: inventory policy "Continue selling when out of stock" or a selling plan. Make sure each one is still buyable, and that the shopper is told it ships later. |
| Loox / TrustShop | Product reviews and star badges | Gone. The reviews stay in the app. | Use the app's headless API or widget, or launch without reviews. The site must **never invent ratings** (CLAUDE.md §2). |
| Chatwill | WhatsApp chat bubble | Gone. | Add a plain `wa.me` link (site copy, `site.ts`) if wanted. |
| Whatmore Live | Shoppable video | Gone. | Drop, or ask the vendor for a headless embed. |
| MP size chart | Size guide on product pages | Gone. | Move the charts into product descriptions or a metafield the product page reads. |
| Fav urgency stock labels | "Only n left" | Gone. | The site already shows stock clamps in the cart. Drop. |
| PageFly | Landing pages built in PageFly | **Those pages 404.** | List PageFly pages. Rebuild the ones that matter, and redirect the rest (11.4). |
| SEOwill page speed | Theme speed tweaks | Irrelevant. | Uninstall after cutover. |
| GSC affiliate external links | Affiliate tracking links | Gone. | Ask the owner whether affiliates still run. If yes, the tracking needs rebuilding. |

Also:

- **Analytics.** The theme reports sessions and conversion to Shopify
  Analytics automatically; a headless site does not. Shopify's reports
  will show a drop in storefront sessions while checkout data stays
  complete. Pixels in **Settings → Customer events** fire at checkout
  only. Decide with the owner what to measure on the site (GA4, Meta
  Pixel), and that it respects consent.
- **Cookie banner.** If the theme showed Shopify's privacy banner, the
  site needs its own for the same markets.

---

## Phase 15 - After launch

- [ ] For 48 hours, watch Vercel's logs for:
  - `Shopify Admin is not configured`
  - Admin `403` (a missing scope)
  - Storefront errors
  - 404s on paths that used to exist on the theme (add redirects for them)
- [ ] Uninstall the **`Kozy migration`** app (1.7).
- [ ] Rotate any token that was pasted into chat, email or a document
      during the move.
- [ ] Keep the **dev store** as a staging store. Do not delete it: it is
      the only place to try Admin changes without touching the shop.
      Its data will drift from live, so re-sync before relying on it.
- [ ] Update `CLAUDE.md` with the live store's facts (11.7), and mark
      this runbook **done**, with the cutover date.

---

## Appendix A - Metaobject entries

Copy these **exactly**, handles included. Colours are hex.

### A.1 `shop_color` (6)

| Handle | name | color | sort_order |
| --- | --- | --- | --- |
| `rose-pink` | Rose Pink | `#d98f97` | 1 |
| `indigo-blue` | Indigo Blue | `#183f73` | 2 |
| `tulsi-green` | Tulsi Green | `#315d3d` | 3 |
| `oat-milk` | Oat Milk | `#e1cda8` | 4 |
| `white` | White | `#ffffff` | 5 |
| `sage-green` | Sage Green | `#9db08e` | 6 |

### A.2 `shop_mood` (6)

| Handle | name | description | sort_order |
| --- | --- | --- | --- |
| `five-minute-morning-unwind` | Five-Minute Morning Unwind | For a little reset before the day begins. | 1 |
| `caffeine-ritual` | Caffeine Ritual | Chai, coffee, tea, matcha — whatever your cup looks like. | 2 |
| `rest-as-a-ritual` | Rest as a Ritual | For when you want to stop, soften and simply rest. | 3 |
| `shared-lounging` | Shared Lounging | For comfortable moments with someone you love. | 4 |
| `gifting-rituals` | Gifting Rituals | For gifting comfort and a little Kozy feeling. | 5 |
| `for-you-your-furry` | For You & Your Furry | Because some of the best rituals are shared. | 6 |

### A.3 `product_add_on` (2)

| Field | `add-your-initials` | `add-a-gift-box` |
| --- | --- | --- |
| title | Add Your Initials | Add a Gift Box |
| kind | `initials` | `gift_box` |
| variant | `personalized-initials` → Default Title (`KOZY-ADDON-INITIALS`) | `kozy-gift-box` → Default Title (`KOZY-ADDON-GIFTBOX`) |
| active | true | true |
| apply_to_all | true | true |
| charge_per_unit | true | true |
| required | false | false |
| text_label | Your initials | *(empty)* |
| text_required | true | false |
| max_length | 6 | *(empty)* |
| help_text | Up to 6 letters, hand-embroidered. Adds 5–7 days | Wrapped in our signature box. |
| policy_note | Personalised Kompanions can't be returned. | *(empty)* |

The initials `help_text` has no closing full stop in dev. Copy it as it
is, or add the full stop. It is shown as typed.

### A.4 `kit_fabric` (2)

| Field | `solid` | `block-printed` |
| --- | --- | --- |
| title | Solid | Block Printed |
| option_value | `Solid` | `Block Printed` (or `Block printed`, see Phase 5) |
| description | A plain, even weave in one calm tone. | Hand-block printed in the Dabu tradition, made with craft clusters across India. |
| swatch | `Solid_Beige_Terry_Fabric_Texture.png` | `Hand-Printed_Green_Botanical_Linen_Pattern.png` |
| is_default | true | false |
| sort_order | 1 | 2 |
| active | true | true |

### A.5 `kit_colour` (3)

| Handle | title | colour | fabric | swatch | sort_order | active |
| --- | --- | --- | --- | --- | --- | --- |
| `natural` | Natural | `#E7E5C0` | `solid` | `ChatGPT_Image_Oct_8_2026_01_33_58_PM.jpg` | 3 | true |
| `pink` | Pink | `#EA7575` | `solid` | `ChatGPT_Image_Oct_8_2026_01_33_53_PM.jpg` | 4 | true |
| `sage` | Sage | `#69967D` | `solid` | `ChatGPT_Image_Oct_8_2026_01_33_44_PM.jpg` | 5 | true |

Block Printed has no colours, so the builder skips the Kolour step for
it. That is how dev behaves too.

### A.6 `embroidery_thread` (6)

| Handle | title | colour | sort_order | active |
| --- | --- | --- | --- | --- |
| `gold` | Gold | `#c9a227` | 1 | true |
| `silver` | Silver | `#bfc1c2` | 2 | true |
| `black` | Black | `#1a1a1a` | 3 | true |
| `brown` | Brown | `#7b4a2d` | 4 | true |
| `navy` | Navy | `#1f2d4d` | 5 | true |
| `pink` | Pink | `#ffc0cb` | 6 | true |

### A.7 `kit_piece` (4)

| Handle | title | product | description | embroiderable | sort_order | active |
| --- | --- | --- | --- | --- | --- | --- |
| `bathrobe` | Bathrobe | `bathrobe` | For the slow hour after a bath. | true | 1 | true |
| `slippers` | Slippers | `slipper` | Soft steps through a quiet morning. | true | 2 | true |
| `makeup-pouch` | Makeup Pouch | `makeup-pouch` | A home for the everyday ritual. | true | 3 | true |
| `mask-eye-mask` | **Eye Mask** (dev has a stray tab) | `eye-mask` | For rest that comes easily. | true | 4 | true |

Watch the handle of the slippers entry: it is `slippers`, while its
product's handle is `slipper`.

### A.8 `kit_builder` (1)

| Field | Value |
| --- | --- |
| handle | `custom-ritual-kit` |
| title | Custom Ritual Kit |
| container_variant | `custom-ritual-kit` → Default Title (`KOZY-KIT`) |
| min_pieces | 1 |
| initials_max_length | 2 |
| embroidery_note | Hand-embroidered in your chosen thread. Adds 5–7 days. |
| policy_note | Personalised Kompanions can't be returned. |
| active | true |
| initials_variant | *(empty, as in dev)* |

---

## Appendix B - Colour and mood on products

58 products. Lists are ordered: keep the order.

| Product handle | `custom.shop_colors` | `custom.shop_mood` |
| --- | --- | --- |
| `b` | indigo-blue | — |
| `bandana` | indigo-blue | for-you-your-furry |
| `bandana-1` | indigo-blue | for-you-your-furry |
| `biscuit-floor-pillow` | indigo-blue | for-you-your-furry |
| `biscuits-floor-pillow-with-gusset` | indigo-blue | for-you-your-furry |
| `blueshine` | indigo-blue | — |
| `chain-link-pillows` | white | — |
| `floor-mini-soft-sofa-indigo` | indigo-blue | for-you-your-furry |
| `flow-carrier` | tulsi-green | for-you-your-furry |
| `flow-print-floor-cushion` | indigo-blue | — |
| `flow-print-pet-carrier` | oat-milk | for-you-your-furry |
| `flow-throw-pillow` | indigo-blue | — |
| `green-tea-puffer-slipper` | sage-green | — |
| `indigo-accent-crack-link` | indigo-blue | — |
| `indigo-flow-print-dress` | indigo-blue | — |
| `indigo-pet-shirt` | indigo-blue | — |
| `indigo-puffer-twist` | indigo-blue | — |
| `initial-twin-bandana-kit` | indigo-blue | for-you-your-furry |
| `k-block-print-donut-pillow` | indigo-blue | for-you-your-furry |
| `kloud-komfort-slipper-indigo-flow-print` | indigo-blue | — |
| `masala-chai-waffle-slipper` | oat-milk | — |
| `milk-froth-kessentials-kit` | oat-milk | rest-as-a-ritual |
| `milk-froth-kit-ritual-kit` | oat-milk | five-minute-morning-unwind, rest-as-a-ritual |
| `milk-froth-kloud-slipper` | oat-milk | — |
| `milk-froth-robe` | oat-milk | caffeine-ritual |
| `milk-froth-slippers` | oat-milk | — |
| `mini-polka-cat-dress` | white | — |
| `mini-polka-shirt` | white | — |
| `mint-green-robe-1` | sage-green | — |
| `morning-luxuries-furrie-shirt` | white, oat-milk | for-you-your-furry |
| `morning-luxuries-ritual-kit-milk-froth` | oat-milk | caffeine-ritual, rest-as-a-ritual |
| `natural-dye-red-soft-sofa-low-seating` | — | for-you-your-furry |
| `neelu` | indigo-blue | rest-as-a-ritual |
| `neelu-indigo-ritual-kit` | indigo-blue | rest-as-a-ritual |
| `neelu-kloud-slippers` | indigo-blue | — |
| `neelu-tulsi-his-hers-ritual-kit` | tulsi-green, indigo-blue | rest-as-a-ritual, shared-lounging |
| `neelu-twin-initial-kit` | indigo-blue | for-you-your-furry |
| `oat-flow-print-pet-carrier` | oat-milk | for-you-your-furry |
| `patched-throw-pillow` | indigo-blue | — |
| `pet-carrier` | indigo-blue | for-you-your-furry |
| `pet-karrier-green` | sage-green | — |
| `pink-ritual-kit` | rose-pink | rest-as-a-ritual |
| `polka-krinkle-kit-double-cloth-crinkle-cotton` | oat-milk | — |
| `puffy-throw-pillow` | indigo-blue | — |
| `rose-tea-ritual-kit` | rose-pink | — |
| `rose-tea-ritual-robe-kit` | rose-pink | caffeine-ritual, rest-as-a-ritual |
| `scalloped-twin-set-toffee-modal-silk` | oat-milk | for-you-your-furry |
| `scrunchie-bandana-set` | indigo-blue | for-you-your-furry |
| `silk-modal-leash-puffer-cover` | indigo-blue | for-you-your-furry |
| `the-peek-kompanion-tote` | oat-milk | for-you-your-furry |
| `the-polka-cloud-set` | indigo-blue | for-you-your-furry |
| `the-polka-pet-karrier` | white | for-you-your-furry |
| `tulsi` | tulsi-green | rest-as-a-ritual |
| `tulsi-ritual-kit` | tulsi-green | rest-as-a-ritual |
| `waffle-kessentials-kit` | oat-milk | caffeine-ritual, rest-as-a-ritual |
| `waffle-kessentials-robe` | white | caffeine-ritual |
| `white-cloud-wavy-slipper` | oat-milk | — |
| `zig-zag-block-pillow` | indigo-blue | — |

`pink-robe` is one of the two dev-only products and carries **no**
colour in dev. Dev's `shop-by-colour` collection lists it, so the owner
may want `rose-pink` added. Optional.

---

## Appendix C - Collection membership gaps

**Rewritten 2026-10-25.** The old list added dev's members to live's old
collections, which no longer exist. What remains is 7.2, as one checklist
(owner's call on each: match dev, or keep live's):

- [ ] `slippers`: dev has `milk-froth-kloud-slipper`; live has
      `masala-chai-waffle-slipper` and `puffer-sunshine-slipper` instead
- [ ] `kessentials`: live adds `milk-froth-kloud-slipper`
- [ ] `krafted-by-kozy`: live adds `neelu-indigo-ritual-kit` and
      `mini-soft-sofa-natural-yellow-dyed`
- [ ] `pet-collection`: live adds `mini-soft-sofa-natural-yellow-dyed`
- [ ] `pet-seating`: live adds `mini-soft-sofa-natural-yellow-dyed`

---

## Appendix D - Media to re-host

### D.1 Images in `src/lib/site.ts`

All of them are at
`https://cdn.shopify.com/s/files/1/0700/6476/7047/files/<name>` (dev).

- `Kozy_Logo.png` (the header logo: upload unchanged, see Phase 2)
- `IMG_1187_7a482946-4a79-4607-9ac5-0203344c6e13_copy_2_jpg.jpg` (the social card)
- `WhatsApp_Image_2026-02-08_at_11.59.15_PM.jpg`
- `IMG_1171_43dfc109-e3d3-4a11-b902-f6443ff961fa.jpg`
- `IMG_6338_eea1aae1-4c9b-4571-8f07-f080a9d1fbeb.jpg`
- `IMG_2755_9be99538-96aa-4529-a92c-1c67d6431b73.jpg`
- `IMG_6412_d18c7de3-251f-46e0-9763-eb814a5fa2a5.jpg`
- `NEW_PRODUCT_WATCH_SALE_PROMO_Poster_25bd1395-74aa-4e03-8808-487406600e3f.png`
- `IMG_8778.jpg`
- `IMG_1235.jpg`
- `NEW_PRODUCT_WATCH_SALE_PROMO_Poster_-_4.jpg`
- `IMG_1214.jpg`
- `NEW_PRODUCT_WATCH_SALE_PROMO_Poster_-_10.jpg`
- `IMG_1675.jpg`
- `IMG_1695.png`
- `IMG_1677.jpg`
- `900E9CCD-5302-4863-A642-251A2207515C.jpg`
- `85aeb9ef-fd0d-4cf2-a72f-af881a17b4fb.jpg`
- `IMG_1033.jpg`
- `IMG_1694_d0fd0a48-49cb-46ac-a8ec-fbf065b857f6.jpg`
- `IMG_4035.png`
- `CEDD7B20-D83F-4050-9CEB-D693C7AE6269.jpg`
- `5A7D8EAA-E90A-4449-B0C0-4C7C5CA38535.jpg`
- `DB2B40CD-1A34-48FC-98D5-63220DD3DD2B.jpg`
- `189666_jpg.jpg`
- `9774ec93-dce6-49a1-ba50-ec350ae25b8b.jpg`
- `IMG_1876_d3c112d9-c774-458b-b8a9-fd12fc7e056e.jpg`
- `IMG_1880.jpg`
- `IMG_1895_c94dd5b4-daca-47b9-94aa-d5aa31527cd5.jpg`
- `IMG_0689_jpg.jpg`
- `IMG_0129.jpg`
- `IMG_1866.jpg`
- `IMG_5245.jpg`
- `IMG_0857.jpg`
- `9A8CCDE6-D286-47A8-9B01-7FC01ECB6AF0.jpg`
- `IMG_1664_cc6a4799-b520-4db1-b9d2-bab197e0d74c.jpg`
- `PHOTO-2026-04-25-15-43-08_34c1e353-99d4-49b1-a326-7c28afb0d0cd.jpg`
- `IMG_1641.heic` (check it renders, see Phase 2 step 5)

### D.2 Videos in `src/lib/site.ts`

All of them are at `https://cdn.shopify.com/videos/c/o/v/<name>`. Video
URLs do not name their store; these were uploaded through dev, so re-host
them all.

- `806a125208a44b90ad1c2e7ae99d6494.mp4` (founder reel; also used in `kozyStory`)
- `3329bb6694284f05be3d3ff8a0bb6f22.mp4` (hero films)
- `65fa358ea2ec488f9c62e7f86d758f3c.mp4`
- `e78b76a026054863975d667b63071a21.mp4`
- `d761713a789d44c3bb7f5b6686912560.mp4`
- `754450888c474683bb51918287cdcdca.mp4`
- `4c106e1353e5404dbc1622f13a2de9d2.mp4`

### D.3 Swatch images used by metaobject entries

At `https://cdn.shopify.com/s/files/1/0700/6476/7047/files/<name>`:

- `Solid_Beige_Terry_Fabric_Texture.png` (kit_fabric `solid`)
- `Hand-Printed_Green_Botanical_Linen_Pattern.png` (kit_fabric `block-printed`)
- `ChatGPT_Image_Oct_8_2026_01_33_58_PM.jpg` (kit_colour `natural`)
- `ChatGPT_Image_Oct_8_2026_01_33_53_PM.jpg` (kit_colour `pink`)
- `ChatGPT_Image_Oct_8_2026_01_33_44_PM.jpg` (kit_colour `sage`)

---

## Appendix E - Admin and Storefront API reference

### E.1 Checking what the site can see

Run against **live** with the public Storefront token. It answers the
question "will the site see it?" directly.

```sh
curl -s https://4nr8xa-3x.myshopify.com/api/2026-07/graphql.json \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: $SHOPIFY_STOREFRONT_ACCESS_TOKEN" \
  -d '{"query":"{ products(first:250){nodes{handle}} collections(first:250){nodes{handle}} c:metaobjects(type:\"shop_color\",first:50){nodes{handle}} m:metaobjects(type:\"shop_mood\",first:50){nodes{handle}} f:metaobjects(type:\"kit_fabric\",first:50){nodes{handle}} b:metaobjects(type:\"kit_builder\",first:5){nodes{handle}} p:metaobjects(type:\"kit_piece\",first:50){nodes{handle}} a:metaobjects(type:\"product_add_on\",first:50){nodes{handle}} k:metaobjects(type:\"kit_colour\",first:50){nodes{handle}} t:metaobjects(type:\"embroidery_thread\",first:50){nodes{handle}} menu(handle:\"main-menu\"){items{title}} }"}'
```

Expected once Phases 3-9 are done:

- 91 products: all of dev's listed products. The 7 Unlisted ones
  (4 pieces, the kit, 2 add-ons) do **not** list; that is correct.
  On 2026-10-25 this returned **93**, because both add-ons were still
  Active.
- 20 collections (7.1).
- Metaobject counts 6 / 6 / 2 / 1 / 4 / 2 / 3 / 6 (true on 2026-10-25).
- The menu's 7 top-level items (true on 2026-10-25).

Counts alone do not show the reference fields. To see which are still
empty, ask for them: an unset field is simply missing from `fields`.

```graphql
{ metaobjects(type: "product_add_on", first: 10) { nodes { handle
    fields { key value reference { __typename } } } } }
```

### E.2 The scripted route for Phases 4-6

With the `Kozy migration` app (1.7), a Node script can read dev through
its Storefront token and write live through the Admin API, matching by
handle and SKU. The mutations it needs:

| Step | Mutation | Notes |
| --- | --- | --- |
| Definitions | `metaobjectDefinitionCreate(definition: { name, type, displayNameKey, access: { storefront: PUBLIC_READ }, fieldDefinitions: [{ key, name, type, required, validations }] })` | `kit_colour.fabric` needs `validations: [{ name: "metaobject_definition_id", value: <kit_fabric definition gid> }]`. Use `access: { storefront: NONE }` for `contact_message`. |
| Entries | `metaobjectUpsert(handle: { type, handle }, metaobject: { fields: [{ key, value }] })` | Upsert is safe to re-run. Reference fields take the **live** gid: look products up with `productByHandle` / `productVariants(query: "sku:KOZY-KIT")`, and files with `files(query: "filename:…")`. |
| Product metafield definitions | `metafieldDefinitionCreate(definition: { name, namespace: "custom", key, ownerType: PRODUCT, type: "list.metaobject_reference", validations: [{ name: "metaobject_definition_id", value: <gid> }], access: { storefront: PUBLIC_READ } })` | |
| Product values | `metafieldsSet(metafields: [{ ownerId, namespace: "custom", key, type: "list.metaobject_reference", value: "[\"gid://shopify/Metaobject/…\"]" }])` | Up to 25 per call. Keep the order from Appendix B. |

Run it once with a dry-run flag that only prints what it would write,
read the output, then run it for real.

---

## Appendix F - Theme redirect snippet

Goes into the **duplicate** Pitch theme (13.1). Create
`snippets/headless-redirect.liquid`:

```liquid
{%- comment -%}
  Sends every theme page to the headless storefront at kozyliving.in.
  Checkout, cart permalinks, accounts and app proxies are left alone -
  they must keep working on this domain. Rollback: publish the original
  Pitch theme (this file lives only in the redirect copy).
{%- endcomment -%}
{%- unless request.design_mode -%}
<script>
  (function () {
    var p = location.pathname, m, to;
    if (/^\/(cart|checkout|checkouts|account|apps|a|tools|services|admin)(\/|$)/.test(p)) return;
    if ((m = p.match(/^\/collections\/[^\/]+\/products\/([^\/]+)/))) to = '/product/' + m[1];
    else if ((m = p.match(/^\/products\/([^\/]+)/))) to = '/product/' + m[1];
    else if (p === '/collections' || p === '/collections/all') to = '/search';
    else if ((m = p.match(/^\/collections\/([^\/]+)/))) to = '/search/' + m[1];
    else if ((m = p.match(/^\/pages\/([^\/]+)/))) to = '/' + m[1];
    else to = p; // '/', /search, /blogs/..., /policies/... match already
    location.replace('https://kozyliving.in' + to + location.search);
  })();
</script>
{%- endunless -%}
```

Then in `layout/theme.liquid`, as the **first line inside `<head>`**:

```liquid
{% render 'headless-redirect' %}
```

Test it in the theme preview *before* publishing:

- Preview → open a product → it should leave for
  `kozyliving.in/product/<handle>`.
- `request.design_mode` keeps the theme editor itself usable.
