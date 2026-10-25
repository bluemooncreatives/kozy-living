# Moving the storefront onto the live Shopify store

This storefront was built against a **development store**. To launch it, it
has to run against the **live store** that serves kozyliving.in today with
a Shopify theme. This file is the runbook for what is **left** of that
move, in the order to do it. Finished work is removed from here once it
is verified; the table below is the only record of it.

> Live was last measured on **2026-10-25** through the *Kozy Living
> Headless* Storefront token, live's public `products.json` /
> `collections.json`, and dev's published site (`kozy-living.vercel.app`).
> Dev values come from a measurement on 2026-10-15. If you pick this up
> much later, re-measure before trusting a number.

|  | Dev store (where this site was built) | Live store (where it must run) |
| --- | --- | --- |
| myshopify domain | `kozy-living-dev.myshopify.com` | `4nr8xa-3x.myshopify.com` |
| Public domain | none | `kozyliving.in` |
| Storefront today | this Next.js app (on Vercel, staging) | Shopify theme **Pitch** 3.2.1 ("Copy of Copy of Pitch") |
| Shop id (CDN path) | `/s/files/1/0700/6476/7047/` | `/s/files/1/0978/6723/5641/` |

When this is done, the **same Next.js app** reads the **live** store, is
served at `https://kozyliving.in`, and hands checkout to Shopify on a
subdomain (this file uses `shop.kozyliving.in`; change it if the owner
prefers another name).

**Nothing from the old shop is kept** (owner's call, 2026-10-25). No
redirects for old URLs, no old journal articles, no Pitch theme, no theme
apps, no old Flow, slip, notification or discount setup. The new shop is
built fresh from dev. Kept, because they are the business rather than the
old storefront: **orders, customers, payments, shipping, taxes, markets
and the domain.**

---

## Already done

| Date | What | Notes |
| --- | --- | --- |
| 2026-10-23 | Headless channel, storefront **Kozy Living Headless** | On live (shop id `97867235641`). |
| 2026-10-23 | Storefront API permissions | Every scope on. |
| 2026-10-24 | Storefront API tokens | Public and private both answer on `4nr8xa-3x`. In local `.env`; **not yet in Vercel** (Step 10). |
| 2026-10-25 | Channel publishing | The token returns 93 products and 20 collections. |
| 2026-10-23 | Customer Account API permissions | Every scope on. Application setup is Step 9. |
| 2026-10-25 | Products | All 91 products dev lists, plus `custom-ritual-kit` and both add-ons. Only the 4 kit pieces are missing (Step 3). |
| 2026-10-25 | Metaobject definitions and entries | All 30 entries, with dev's values. Their reference fields are Step 4. |
| 2026-10-25 | Collections | Live rebuilt on **dev's 20 collections** (table below). Live's old collections are gone. |
| 2026-10-25 | Pages | Dev's 8 pages, same handles, empty bodies as in dev. |
| 2026-10-25 | Menus | Dev's tree built into live's **`main-menu`** and **`kozy-living-footer`**, which the site reads by default. Krafted by Kozy → Slippers fixed. |
| 2026-10-25 | Old shop cleared | The 11 old-URL redirects deleted (old collection links 404, by decision), live's 3 old journal articles deleted, the `Green` / `Blue` / `Yellow` / `Indigo` / `Robe` tags removed (no product carries a tag now except the 2 add-ons' `kozy-addon`). Pitch and its apps go at cutover and after launch. |
| 2026-10-25 | Journal | Dev's 4 articles on live's `news` blog, same handles and titles, with image, excerpt and author. No tags or SEO fields. |
| 2026-10-26 | Collection members | Live's additions kept on purpose (owner): `slippers` + `masala-chai-waffle-slipper`, `puffer-sunshine-slipper`; `kessentials` + `milk-froth-kloud-slipper`; `krafted-by-kozy` + `neelu-indigo-ritual-kit`; the yellow mini sofa in `krafted-by-kozy`, `pet-collection`, `pet-seating`. `milk-froth-kloud-slipper` restored to `slippers` (13 members). `bestsellers` reads, in order: `the-polka-pet-karrier`, `milk-froth-slippers`, `rose-tea-ritual-robe-kit`, `morning-luxuries-ritual-kit-milk-froth`, `floor-mini-soft-sofa-indigo`, `tulsi`. |
| 2026-10-25 | Local `.env` | Points at live. Its `SHOPIFY_ADMIN_CLIENT_*` pair is still dev's app, so the forms fail locally until Step 1. |

### How live's collections map to dev's

14 collections kept dev's handle. These 6 were renamed, and the code
follows them (Step 10.2):

| Dev handle | Live handle |
| --- | --- |
| `crafted-by-kozy` | `krafted-by-kozy` |
| `dabu-printed-pillows` | `decorative-throw-pillows` |
| `decorative-pillows` | `decorative-shaped-pillows` |
| `slippers-copy` | `kessentials-slippers` |
| `slippers-copy-1` | `krafted-by-kozy-slippers` |
| `kozy-by-crafted-bathrobes` | `krafted-by-kozy-bathrobes` |

Unchanged: `bathrobes`, `bestsellers`, `ritual-kits`, `slippers`,
`kessentials`, `kessentials-bathrobes`, `kessentials-ritual-kit`,
`krafted-rituals-kit`, `pet-collection`, `pet-carrier`, `pet-seating`,
`pet-parent`, `pet-clothing`, `shop-by-colour`. Dev's `frontpage` was not
brought over (unused).

---

## Ground rules

1. **The theme already shows the new structure.** Building live in place
   means kozyliving.in's Pitch theme renders the new collections, menu and
   pages *now*, not at cutover. Anything changed in collections, menus,
   pages or product status shows to shoppers immediately.
2. **Match by handle, SKU or title, never by ID.** Every product, variant,
   metaobject and file has a new ID on live.
3. **Freeze the dev store.** From now on nobody edits dev's Admin. If
   something must change, change it in **both** stores. Do not delete or
   close dev until Step 14: the 4 kit pieces import their images from its
   CDN, and it is the reference for every value here.
4. **Go in order.** Metaobject references need the products and files to
   exist first.
5. **Publish new collections to *Kozy Living Headless*.** The site **404s
   an unknown or unpublished collection** on purpose.

### Decisions recorded

| Question | Decision |
| --- | --- |
| Homepage Bestsellers rail | `bestsellers` (6 products, same as dev), in its Admin order. |
| What comes over from dev? | **Everything**: products, metaobjects, colour and mood assignments, dev's 4 journal articles, Flow, the packing slip. |
| Collection structure | Dev's, as built on live on 2026-10-25. |
| The old shop | **Nothing is kept** (2026-10-25): old URLs are not redirected, and old articles, theme, theme apps, Flow workflows, templates, discount codes and policy texts are deleted or replaced. Orders, customers, payments, shipping, taxes and markets stay. |
| Rollback | None to the old theme. A bad deploy rolls back in Vercel; anything else is fixed forward. |
| Checkout subdomain | `shop.kozyliving.in` (placeholder until the owner confirms). |

---

## The steps at a glance

| Step | What | Who | Shows on kozyliving.in? |
| --- | --- | --- | --- |
| 1 | Admin API apps | Owner + dev | No |
| 2 | Upload the missing files | Admin | No |
| 3 | The 4 kit pieces, and fix the add-ons | Admin | Add-ons leave the theme |
| 4 | Metaobject references and fixes | Admin or script | No |
| 5 | Colour and mood on products | Admin or script | No |
| 6 | FAQ, policies, customer data | Admin | No |
| 7 | Flow, packing slip, notifications, discounts | Admin | No |
| 8 | Analytics and cookie banner for the new site | Owner + dev | Not until cutover |
| 9 | Customer Account API application setup | Dev | No |
| 10 | Code changes | Dev | No |
| 11 | Staging test against live | Dev + owner | No |
| 12 | Before the cutover day | Dev + owner | No |
| 13 | **Cutover** | Dev + owner | **Yes, this is the launch** |
| 14 | After launch | Dev | No |

---

## Step 1 - Admin API apps

Three features write through the Admin API:

- the contact form (`contact_message` metaobject)
- the B2B form (`contact_message` metaobject)
- the newsletter (customer marketing consent)

The app in local `.env` belongs to dev's organisation; live answers it
with `app_not_installed`. Use **two apps** on live, so the powerful
migration scopes do not stay live.

| App | Scopes | Lifetime |
| --- | --- | --- |
| `Kozy storefront` (runtime) | `read_metaobjects`, `write_metaobjects`, `read_customers`, `write_customers` | Permanent |
| `Kozy migration` (for Steps 4-5 by script, and to check what the Storefront API cannot see) | `read_products`, `write_products`, `read_metaobject_definitions`, `write_metaobject_definitions`, `read_metaobjects`, `write_metaobjects`, `read_files`, `write_files`, `read_online_store_navigation`, `write_online_store_navigation`, `read_content`, `write_content` | Uninstall in Step 14 |

Shopify no longer issues permanent `shpat_` tokens for apps created after
January 2026 (see `docs/NEWSLETTER_SETUP.md`).

1. [ ] Create the app in the **Dev Dashboard** (dev.shopify.com) of the
       organisation that **owns the live store**.
2. [ ] Set its Admin API scopes and release a version.
3. [ ] Install it on `4nr8xa-3x.myshopify.com`.
4. [ ] Copy the **Client ID** and **Client secret** into
       `SHOPIFY_ADMIN_CLIENT_ID` / `SHOPIFY_ADMIN_CLIENT_SECRET` in local
       `.env`. `src/lib/shopify/admin.ts` exchanges them for a 24-hour
       token itself.
5. If the exchange answers 400/401, the app and the store are not in the
   same organisation. Have the owner create the app from theirs.
6. If live already has a legacy custom app with a `shpat_` token, adding
   the four scopes to it and using `SHOPIFY_ADMIN_ACCESS_TOKEN` works too.
   `admin.ts` tries that first.

**Check that `contact_message` exists on live.** It is private (no
Storefronts access), so the 2026-10-25 measurement could not see it.
Admin → Settings → Custom data → Metaobject definitions. If it is missing,
create it with type `contact_message`, **Storefronts access off**, and:

| Key | Type | Notes |
| --- | --- | --- |
| `name` | Single line text | |
| `email` | Single line text | |
| `phone` | Single line text | Empty string allowed. Must not be required. |
| `message` | Multi-line text | B2B writes company / type / products / quantity as labelled lines here. |
| `source` | Single line text | `storefront-contact-form` or `storefront-b2b-form`. |
| `received_at` | Date and time | The code writes an ISO timestamp. Copy dev's exact type. |

Do not add required fields to it: both forms would then fail
(CLAUDE.md §4). Then send a test enquiry from `npm run dev` and look for
the entry in live Admin.

With the migration app in place, the open questions in the
[measurement note](#what-could-not-be-checked) can be answered.

---

## Step 2 - Upload the missing files

These live only in **dev's** storage. A dev URL works only while dev
exists, so each one is re-hosted on live. The other 30 images in
`site.ts` are already in live's Files under the same name.

| File | Used by |
| --- | --- |
| `Kozy_Logo.png` | header logo |
| `IMG_1187_7a482946-4a79-4607-9ac5-0203344c6e13_copy_2_jpg.jpg` | social card |
| `IMG_1171_43dfc109-e3d3-4a11-b902-f6443ff961fa.jpg` | `site.ts` |
| `IMG_6338_eea1aae1-4c9b-4571-8f07-f080a9d1fbeb.jpg` | `site.ts` |
| `IMG_2755_9be99538-96aa-4529-a92c-1c67d6431b73.jpg` | `site.ts` |
| `IMG_6412_d18c7de3-251f-46e0-9763-eb814a5fa2a5.jpg` | `site.ts` |
| `189666_jpg.jpg` | `site.ts` |
| `IMG_0689_jpg.jpg` | `site.ts` |
| `Solid_Beige_Terry_Fabric_Texture.png` | swatch, `kit_fabric` `solid` |
| `Hand-Printed_Green_Botanical_Linen_Pattern.png` | swatch, `kit_fabric` `block-printed` |
| `ChatGPT_Image_Oct_8_2026_01_33_58_PM.jpg` | swatch, `kit_colour` `natural` |
| `ChatGPT_Image_Oct_8_2026_01_33_53_PM.jpg` | swatch, `kit_colour` `pink` |
| `ChatGPT_Image_Oct_8_2026_01_33_44_PM.jpg` | swatch, `kit_colour` `sage` |

All at `https://cdn.shopify.com/s/files/1/0700/6476/7047/files/<name>`.

Plus all **7 videos** (their URLs do not name a store, so they could not
be checked; re-host them all). All at
`https://cdn.shopify.com/videos/c/o/v/<name>`:

- `806a125208a44b90ad1c2e7ae99d6494.mp4` (founder reel; also in `kozyStory`)
- `3329bb6694284f05be3d3ff8a0bb6f22.mp4` (hero films)
- `65fa358ea2ec488f9c62e7f86d758f3c.mp4`
- `e78b76a026054863975d667b63071a21.mp4`
- `d761713a789d44c3bb7f5b6686912560.mp4`
- `754450888c474683bb51918287cdcdca.mp4`
- `4c106e1353e5404dbc1622f13a2de9d2.mp4`

Steps:

1. [ ] Download each file (dev Admin → **Content → Files** → ⋯ →
       Download, or open the URL and save it).
2. [ ] Upload to live, **Content → Files → Upload files**. **Keep the file
       names.** If live already has one of that name, Shopify adds a
       suffix; note it.
3. [ ] Record each new URL (file → *Copy link*) in a two-column sheet,
       `old URL → new URL`. Videos get a new
       `cdn.shopify.com/videos/c/o/v/<id>.mp4`; copy it from the file's
       details. Step 10.3 uses this sheet.
4. [ ] **`Kozy_Logo.png`: upload the exact same file, unedited.** Its URL
       carries a crop in the file's own pixels
       (`crop_left=150&crop_top=124&crop_width=1508&crop_height=690`).
       Same pixels: the crop stays valid. Re-exported: re-measure the ink
       box (CLAUDE.md §6, "The header logo").
5. [ ] `IMG_1641.heic` is already on live, but HEIC does not render in
       most browsers. Check where it appears in `site.ts`; if the page
       shows a broken frame, convert it to JPG, upload, and use that URL.

---

## Step 3 - The 4 kit pieces, and fix the add-ons

### 3.1 The kit pieces

| Handle | Title | Tag | Options → variants @ price (₹) |
| --- | --- | --- | --- |
| `bathrobe` | Bathrobe | `kozy-kit-piece` | Size `S-M / M-L / L-XL` × Fabric `Solid / Block printed` → Solid 2000, Block printed 3000 |
| `slipper` | Slipper | `kozy-kit-piece` | Size `UK 3-4 … UK 11-12` (5) × Fabric → Solid 1199, Block printed 1499 |
| `makeup-pouch` | Makeup pouch | `kozy-kit-piece` | Fabric × Size `Free Size` → Solid 899, Block printed 1499 |
| `eye-mask` | Eye mask | `kozy-kit-piece` | Size `Free Size` × Fabric → Solid 699, Block printed 899 |

**Do not rename the handles**: the `kit_piece` entries point at these
products, and the kit URL state uses them.

1. [ ] Dev Admin → **Products** → tick the four → **Export → Selected
       products → CSV**.
2. [ ] Edit the CSV:
   - **Vendor** `Kozy Living Dev` → live's vendor (`KOZYLIVING`).
   - Optional SKUs: dev's pieces have none. If the owner wants them, use
     the scheme in `docs/custom-kit-builder.md` §5 Step 1
     (`KOZY-KIT-ROBE-SOL-<SIZE>` …). Nothing in code or Flow needs them.
   - Leave the `Image Src` columns: Shopify downloads each image from
     dev's CDN during the import.
3. [ ] Live Admin → **Products → Import**, with **"Overwrite products with
       matching handles" off**. None should match.
4. [ ] For each piece:
   - **Status → Unlisted.** The site still reaches them through the
     `kit_piece` reference; Unlisted keeps them out of the theme.
   - **Sales channels:** *Kozy Living Headless* only. Untick Online
     Store, Shop, Google & YouTube and Facebook & Instagram.
   - **Inventory:** real stock per Size × Fabric on the live location
     (CSV location names do not carry across stores).
   - **Shipping, weight, tax, HS code:** copy from dev.
   - **Fabric option:** dev's may be a linked option; the CSV recreates it
     as plain text. That is fine: `kit_fabric.option_value` is matched
     forgivingly (`Block Printed` = `Block printed`).

### 3.2 The add-ons and the kit container

- [ ] `personalized-initials` and `kozy-gift-box`: **Status → Unlisted**.
      They are Active today, so they list on the theme's
      `/collections/all` and in the headless catalogue.
- [ ] Same two: vendor `Kozy Living Dev` → `KOZYLIVING`.
- [ ] Same two: Sales channels → *Kozy Living Headless* only.
- [ ] Inventory: `custom-ritual-kit` and `personalized-initials` **Track
      quantity off** (the code relies on the kit container never being
      stock-tracked). `kozy-gift-box`: track it only if the owner counts
      boxes.
- [ ] Do not rename the SKUs `KOZY-KIT`, `KOZY-ADDON-INITIALS`,
      `KOZY-ADDON-GIFTBOX`: Flow, the packing slip and the workshop read
      them.
- [ ] `pink-robe` ("Rose Tea Ritual Robe") sits next to
      `rose-tea-ritual-robe-kit`. Ask the owner whether both should list.

### 3.3 Check

- `/collections/all` on the theme lists **none** of the 4 pieces, the kit
  or the add-ons.
- [Appendix D](#appendix-d---api-reference) returns 91 products.

---

## Step 4 - Metaobject references and fixes

Every entry exists, but **none references a product, variant or file**.
Until they do, the site offers no initials or gift box, and
`/kit-builder` and the homepage atelier rest. Live Admin → **Content →
Metaobjects →** *the definition* → open the entry.

Order matters: the products (Step 3) and swatches (Step 2) must exist.

1. [ ] `product_add_on` `add-your-initials` → **variant** =
       `personalized-initials` (`KOZY-ADDON-INITIALS`).
2. [ ] `product_add_on` `add-a-gift-box` → **variant** = `kozy-gift-box`
       (`KOZY-ADDON-GIFTBOX`).
3. [ ] `kit_builder` `custom-ritual-kit` → **container_variant** =
       `custom-ritual-kit`'s only variant (`KOZY-KIT`).
4. [ ] `kit_piece` → **product**: `bathrobe` → `bathrobe`, `slippers` →
       **`slipper`** (the entry and the product differ by an s),
       `makeup-pouch` → `makeup-pouch`, `eye-mask` → `eye-mask`.
5. [ ] `kit_fabric` → **swatch**: `solid` →
       `Solid_Beige_Terry_Fabric_Texture.png`, `block-printed` →
       `Hand-Printed_Green_Botanical_Linen_Pattern.png`.
6. [ ] `kit_colour` → **swatch**: `natural` → `…01_33_58_PM.jpg`, `pink`
       → `…01_33_53_PM.jpg`, `sage` → `…01_33_44_PM.jpg`.
7. [ ] `kit_fabric` `block-printed` → **is_default false**. Both fabrics
       are default on live; dev has only `solid`.
8. [ ] `shop_color` `rose-pink` → name `Rose Pink` (live has a leading
       space).

Leave as they are:

- The eye mask entry's handle is `eye-mask` (dev: `mask-eye-mask`). It
  only changes the `?pieces=` value in kit links shared from dev.
- `kit_fabric` `block-printed` `option_value` is `Block Printed` and the
  products say `Block printed`. The code matches these forgivingly.
- `kit_builder.initials_variant` is empty, as in dev.

If you edit a definition rather than an entry: field **keys** and the
**type** must match dev exactly, and "Active/draft status" stays **off**
(drafts are invisible to the Storefront API).

Check with the query in [Appendix D](#appendix-d---api-reference): an
unset field is missing from `fields`.

---

## Step 5 - Colour and mood on products

Not started: no live product returns either field.

### 5.1 Definitions

Live Admin → **Settings → Custom data → Products**. If these are not
there, add them:

| Name | Namespace and key | Type | Storefronts access |
| --- | --- | --- | --- |
| Shop colours | `custom.shop_colors` | Metaobject → **Shop color** → **List of entries** | **ON** |
| Shop mood | `custom.shop_mood` | Metaobject → **Shop mood** → **List of entries** | **ON** |

The key is `shop_colors` with the US spelling. That is what the code reads
first (`src/lib/shop/colours.ts`). Do not "correct" it.

### 5.2 Values

58 products, listed in [Appendix B](#appendix-b---colour-and-mood-on-products).

- **By hand:** each product → *Metafields* → Shop colours / Shop mood →
  pick the entries. **Keep the order in the appendix**
  (`morning-luxuries-furrie-shirt` is `white, oat-milk`, in that order).
- **Faster:** Products → select a batch → **Bulk edit** → *Columns* → add
  *Shop colours* and *Shop mood*. If the bulk editor will not edit list
  references, go product by product, or script it (Appendix D).

Check: `/shop-by-colour` shows 6 colours with counts and `/shop-by-mood`
6 moods (Gifting Rituals "coming soon" while untagged).

---

## Step 6 - FAQ, policies, customer data

### 6.1 FAQ page

- [ ] The `faq` page has an **empty body** (as in dev), and the footer
      links to it. Write the FAQ in it, or remove the FAQ item from
      `kozy-living-footer`.

### 6.2 Policies

Policies are legal texts the checkout links to, so they are **rewritten,
not deleted**: an empty refund or shipping policy is worse than an old one.

- [ ] Settings → Policies: rewrite **privacy**, **refund** and
      **shipping** for the new shop, replacing the old texts.
- [ ] Write a **Terms of service**. Neither store has one.
- The site lists only the policies that exist.

### 6.3 Customer data that may only exist in dev

If the staging site was ever shared beyond the team, real people may have
used it:

- [ ] Dev Admin → **Content → Metaobjects → Contact message**: any real
      enquiries? Answer them, or copy them into live.
- [ ] Dev Admin → **Customers**, filtered by *Email subscribed*: any real
      newsletter sign-ups? Export them, then import into live with
      marketing consent **only** for those who gave it.
- Dev **orders** are test orders and are not migrated.

---

## Step 7 - Flow, packing slip, notifications, discounts

### 7.1 Shopify Flow

1. [ ] Install **Shopify Flow** on live, if it is not installed.
2. [ ] In dev's Flow, open each workflow → **⋯ → Export** (`.flow` file):
   - add-ons: order tags `personalised` and `gift-box`
     (`docs/personalisation-add-ons.md` §4 Step 5)
   - kit: order tags `custom-kit` and `block-print`
     (`docs/custom-kit-builder.md` §5 Step 7)
   - any newsletter automation (`docs/NEWSLETTER_SETUP.md` §4)
3. [ ] In live's Flow, **Import** each one. Check that the conditions
       still read `KOZY-ADDON-INITIALS`, `KOZY-ADDON-GIFTBOX` and
       `KOZY-KIT`, then **turn it on**.
4. [ ] **Delete live's old workflows.** Only dev's come over.

### 7.2 Packing slip

- [ ] Settings → Shipping and delivery → **Packing slips → Edit**.
      **Replace** live's template with dev's: initials under the line
      (add-ons doc §4 Step 6) and kit grouping (kit doc §5 Step 8).

### 7.3 Notifications

- [ ] Reset live's edited templates to Shopify's default (Settings →
      Notifications → template → **Revert to default**), then make dev's
      changes for kits and initials (kit doc §5 Step 8), if dev has any.

### 7.4 Discounts

- [ ] **Delete live's old discount codes and automatic discounts.** Create
      the new shop's own, and run the checks in add-ons doc §4 Step 7 and
      kit doc §5 Step 9 on each: may it discount add-ons and kits?

### 7.5 Newsletter

- [ ] Follow `docs/NEWSLETTER_SETUP.md` §4-5 on live: the marketing
      surface that actually emails subscribers, and double opt-in.

### 7.6 Shipping, payments, markets

- [ ] These already work on live. Confirm only that the new products sit
      in a shipping profile that ships them (the default profile does).

---

## Step 8 - Analytics and cookie banner for the new site

The Pitch theme's app embeds (Easify product options, Pre-order, Loox /
TrustShop reviews, Chatwill, Whatmore Live, MP size chart, Fav urgency
labels, PageFly, SEOwill, GSC affiliate links) are **not replaced**: a
headless site does not run them, and they are uninstalled with the theme
(Step 14). If the shop misses one later, it is built as a new feature.
The site's add-ons (₹499 initials, ₹999 gift box) already cover what
Easify did for personalisation, and the site must **never invent
ratings** (CLAUDE.md §2) if reviews come back.

Two things the theme did for free that the new site needs of its own:

- [ ] **Analytics.** A headless site does not report sessions to Shopify
      Analytics; Shopify's reports will show storefront sessions drop
      while checkout data stays complete. Pixels in **Settings → Customer
      events** fire at checkout only. Decide what to measure on the site
      (GA4, Meta Pixel), and that it respects consent.
- [ ] **Cookie banner** for the markets the shop sells to.

---

## Step 9 - Customer Account API application setup

Headless → *Kozy Living Headless* → **Customer Account API**.

1. [ ] Copy the **Client ID** into `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`
       (local `.env` now, Vercel in Step 10.1). Client type: **Public**;
       the site uses PKCE and has no client secret
       (`docs/CUSTOMER_AUTH_SETUP.md`).
2. The authorize, token and logout URLs are discovered at runtime from
   `https://<SHOPIFY_STORE_DOMAIN>/.well-known/openid-configuration`
   (`src/lib/customer-account.ts`). Nothing to copy.
3. [ ] **Application setup → Edit.** Every entry must match what the code
       sends, character for character:

   | Field | Value | Why exactly this |
   | --- | --- | --- |
   | Callback URI | `https://kozy-living.vercel.app/api/auth/callback` | `redirect_uri` is `${NEXT_PUBLIC_SITE_URL}/api/auth/callback`. |
   | JavaScript origin | `https://kozy-living.vercel.app` | No path, no trailing slash. |
   | Logout URI | `https://kozy-living.vercel.app/` | **With** the trailing slash: the logout route sends `${NEXT_PUBLIC_SITE_URL}/`, and Shopify matches it exactly. |

4. [ ] Once the `live-store` branch has deployed (Step 11.1), add its
       **branch alias** as a second entry in each list. Vercel names it
       `kozy-living-git-live-store-<team>.vercel.app`; copy the exact host
       from the deployment's *Domains*.
5. `kozyliving.in` is added at cutover (Step 13, step 6).

**Settings → Customer accounts** is already on the new customer accounts.
Leave it.

---

## Step 10 - Code changes

Do these on a branch (e.g. `live-store`). Nothing here merges to `main`
until Step 11 passes.

### 10.1 Environment variables

Set these in **Vercel → Settings → Environment Variables**: Preview
first, Production at cutover. Local `.env` already has the store domain
and both Storefront tokens.

| Variable | Value | Notes |
| --- | --- | --- |
| `SHOPIFY_STORE_DOMAIN` | `4nr8xa-3x.myshopify.com` | Always the myshopify domain, never `kozyliving.in`. |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | live's public token | |
| `SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN` | live's private token | Server only. Nothing reads it today; it is **not** an Admin token. |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | Step 9 | |
| `SHOPIFY_ADMIN_CLIENT_ID` / `SHOPIFY_ADMIN_CLIENT_SECRET` | runtime app (Step 1) | Or `SHOPIFY_ADMIN_ACCESS_TOKEN`. |
| `NEXT_PUBLIC_SHOPIFY_MENU_HANDLE` | leave unset | The site reads `main-menu` by default. |
| `SHOPIFY_REVALIDATION_SECRET` | a new long random string | Used in the webhook URL (Step 13). Empty today. |
| `NEXT_PUBLIC_SITE_URL` | Preview (`live-store` branch only): `https://kozy-living-git-live-store-<team>.vercel.app` · Production: `https://kozyliving.in` | Must match the Customer Account API URLs exactly. Not `kozy-living.vercel.app` on the preview: that host is production, still on dev until cutover, so a sign-in started on the preview would land there and fail its state check. |
| `TWITTER_SITE` | `https://kozyliving.in` | It is `https://kozyliving.com` today. |
| `SHOPIFY_STOREFRONT_PUBLIC_TOKEN`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | delete or set to live values | Aliases. A stale dev value is a trap. |

Also delete the old **dev** values from every Vercel environment at
cutover, so a preview cannot quietly read the wrong store.

### 10.2 Collection handles in code

Only the six renamed collections move. Line numbers are as of commit
`b9118f0`; search for the old handle if they have moved.

| File | Where | Old | New |
| --- | --- | --- | --- |
| `src/components/product/product-description.tsx` | `KRAFTED_BY_KOZY_COLLECTION_HANDLE` (~17) | `crafted-by-kozy` | `krafted-by-kozy` |
| `src/lib/site.ts` | `lookbook` (~318) | `crafted-by-kozy` | `krafted-by-kozy` |
| `src/lib/site.ts` | `lookbook` (~377) | `dabu-printed-pillows` | `decorative-throw-pillows` |
| `src/lib/site.ts` | `aboutStory` (~501) | `dabu-printed-pillows` | `decorative-throw-pillows` |
| `src/lib/shop/faq.ts` | bathrobes (~56) | `kozy-by-crafted-bathrobes` | `krafted-by-kozy-bathrobes` |
| `src/lib/shop/faq.ts` | slippers (~63) | `slippers-copy`, `slippers-copy-1` | `kessentials-slippers`, `krafted-by-kozy-slippers` |
| `src/lib/shop/faq.ts` | pillows (~70, ~72 `shelf`) | `dabu-printed-pillows`, `decorative-pillows` | `decorative-throw-pillows`, `decorative-shaped-pillows` |

Everything else keeps its handle, including `bestsellers` and
`pet-collection`. `kozy-lounge` (`site.ts` ~227, ~516) and `blend`
(`page.tsx` `CuratedEdits`) exist in neither store and already fall back
(CLAUDE.md §6).

Check after editing (should print nothing):

```sh
grep -rnE "\"(crafted-by-kozy|dabu-printed-pillows|decorative-pillows|slippers-copy(-1)?|kozy-by-crafted-bathrobes)\"" src
```

### 10.3 Media URLs

- [ ] Replace the 8 image and 7 video URLs from Step 2 in
      `src/lib/site.ts` with their live URLs, using the Step 2 sheet.
- [ ] Point the other 30 images (Appendix C) at live's copies: Content →
      Files → search the name → *Copy link*.
- [ ] The logo keeps its `&crop=region&crop_left=150&crop_top=124&crop_width=1508&crop_height=690`
      suffix, **only if** the file was uploaded unchanged (Step 2).
- [ ] `socialImage` keeps `width: 1200, height: 1500` if the file is
      unchanged.
- [ ] Check that both of these print `0`:

```sh
grep -c "0700/6476/7047" src/lib/site.ts
grep -c "cdn.shopify.com/videos/c/o/v/\(806a1252\|3329bb66\|65fa358e\|e78b76a0\|d761713a\|75445088\|4c106e13\)" src/lib/site.ts
```

### 10.4 No redirects for old URLs

By decision, `next.config.js` gets **no** redirects for the old theme's
URLs (`/products/…`, `/collections/…`, `/pages/…`): they 404 on the new
site. Links Shopify itself still generates (product feeds, the Shop app)
point at the primary domain `shop.kozyliving.in`, and the forwarding
theme (Appendix E) maps those to the new routes.

### 10.5 Sitemap and robots: both are wrong today

- `src/app/sitemap.ts` hard-codes
  `const baseUrl = "https://demo-next-store.pages.dev/"`. **Every URL in
  the sitemap points at a stranger's domain.** Use `NEXT_PUBLIC_SITE_URL`.
- `src/app/robots.ts` builds the sitemap link from `NEXT_PUBLIC_VERCEL_URL`,
  the per-deployment `*.vercel.app` host. Use `NEXT_PUBLIC_SITE_URL`.

### 10.6 Smaller references

- `env.ts`: the `SHOPIFY_STORE_DOMAIN` default is `kozyliving-2.myshopify.com`
  (neither store), and the `TWITTER_SITE` default is `.com`. Update both,
  or drop the defaults.
- `next.config.js` `images.remotePatterns`: `vaishnaviestate.com` and
  `kozyliving.com` are leftovers. Every image comes from
  `cdn.shopify.com`, so they can go.
- `src/lib/site.ts` `email: "care@kozyliving.com"` is `TODO(brand)` and on
  the `.com` domain. Confirm the real address with the owner; it stays
  marked TODO until then.

### 10.7 Documentation

Update in the same change:

- `CLAUDE.md` §6 "Known Shopify data defects":
  - `crafted-by-kozy` is now `krafted-by-kozy`, and
    `KRAFTED_BY_KOZY_COLLECTION_HANDLE` follows it
  - `kozy-by-crafted-bathrobes` is now `krafted-by-kozy-bathrobes`
  - `slippers-copy-1` is now `krafted-by-kozy-slippers`, titled
    `Krafted By Kozy Slippers` (no double space)
  - the Krafted by Kozy → Slippers menu link is fixed
- `docs/CUSTOMER_AUTH_SETUP.md`: production URLs → `https://kozyliving.in`.

---

## Step 11 - Staging test against the live store

### 11.1 Point a preview at live

1. Vercel **Preview** environment variables = the live values from 10.1,
   scoped to the `live-store` branch so other previews stay on dev.
2. Deploy the `live-store` branch.
3. Take its branch alias (`kozy-living-git-live-store-<team>.vercel.app`),
   set `NEXT_PUBLIC_SITE_URL` to it, and redeploy.
4. Add the alias's callback, origin and logout URI to the Customer Account
   API (Step 9, item 4). Test sign-in on the alias, not on a
   per-deployment `*.vercel.app` URL.

### 11.2 The test

Follow CLAUDE.md §9 for using Playwright against this site: the loading
curtain, the newsletter popup, the viewport cookie.

**Catalogue**

- [ ] Homepage: every section renders, in order (CLAUDE.md §5).
  - Bestsellers shows `bestsellers` in Admin order.
  - The lookbook pages turn.
  - The story band's links resolve.
- [ ] Every menu and footer link opens a page. **No 404s.**
- [ ] `/search` and all 20 collections, including the six renamed ones.
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

## Step 12 - Before the cutover day (T-2 days)

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
- [ ] Build the **forwarding theme**, fresh, not from Pitch: Online Store
      → Themes → **Add theme** → Shopify's free *Horizon* (or *Dawn*),
      rename it `Forward to headless`, and add the snippet from
      [Appendix E](#appendix-e---theme-redirect-snippet). **Do not publish
      it yet.**
- [ ] Merge `live-store` into `main` but keep the **Production** env on
      dev values, or hold the merge. Production must not switch stores
      before the domain does.
- [ ] Pick a quiet hour, and tell the owner the window (about an hour).

### Why the cutover goes in this order

Shopify's checkout needs a domain of its own. Today that is
`kozyliving.in`; after cutover, kozyliving.in belongs to Vercel. So:

1. Shopify's primary domain moves to `shop.kozyliving.in`.
2. Then kozyliving.in moves to Vercel.

Swapping the order sends shoppers to a checkout on a domain that no
longer reaches Shopify.

---

## Step 13 - Cutover

### 13.1 The steps (T = 0)

1. [ ] **Vercel production env** → the live values (10.1), with
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
4. [ ] **Online Store → Themes:** publish `Forward to headless`. Pitch is
       now unpublished.
5. [ ] **DNS:** point `@` (kozyliving.in) and `www` at Vercel, using the
       records Vercel showed in item 2.
6. [ ] **Customer Account API** (Step 9): add
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

### 13.2 Smoke test (straight after)

- [ ] `https://kozyliving.in` serves the new site, with a valid
      certificate, on mobile data as well as Wi-Fi.
- [ ] `https://shop.kozyliving.in/products/tulsi` → the forwarding theme →
      `https://kozyliving.in/product/tulsi`.
- [ ] Add to cart → **Checkout** opens on `shop.kozyliving.in` and
      completes (discount-code order).
- [ ] Sign in → `/account` → sign out.
- [ ] Edit a product title in Admin → the site shows it within seconds
      (webhook) or 60 s (TTL).
- [ ] Order confirmation email: "View order" and "Visit our store" links
      end up on kozyliving.in.

### 13.3 SEO and channels

- [ ] **Google Search Console:** verify `kozyliving.in` (Domain property
      via DNS, if not already). Submit `https://kozyliving.in/sitemap.xml`
      (after 10.5 is fixed). Inspect a few `/product/…` URLs.
- [ ] **Google & YouTube / Facebook & Instagram channels:** the product
      feeds link to the primary domain (`shop.kozyliving.in/products/…`),
      which now forwards to the new site. Watch **Merchant Center →
      Diagnostics** for a week. A redirect to another host can be flagged
      as a landing-page mismatch. If it is, the feed URLs need overriding
      to `https://kozyliving.in/product/<handle>`.

### 13.4 If something goes wrong

There is no rollback to the old theme, by decision.

- **The site misbehaves:** Vercel → Deployments → the previous good one →
  **Instant Rollback**.
- **Checkout or domain trouble:** fix forward. Shopify → Domains shows
  what it can reach, and Vercel → Domains what it is still waiting for.
- Customer accounts keep working throughout: they live on
  `shopify.com/97867235641`.

---

## Step 14 - After launch

- [ ] For 48 hours, watch Vercel's logs for:
  - `Shopify Admin is not configured`
  - Admin `403` (a missing scope)
  - Storefront errors
  - 404s on old theme paths are expected (no redirects, by decision). Act
    only if a link the shop still sends out, such as an email template,
    404s.
- [ ] Uninstall the **`Kozy migration`** app (Step 1).
- [ ] **Delete the Pitch theme** and every copy of it (Online Store →
      Themes → ⋯ → Remove). Only `Forward to headless` stays.
- [ ] **Uninstall the theme apps**: Easify product options, Pre-order,
      Loox, TrustShop, Chatwill, Whatmore Live, MP size chart, Fav urgency
      stock labels, PageFly, SEOwill, GSC affiliate links.
- [ ] Rotate any token that was pasted into chat, email or a document
      during the move.
- [ ] Keep the **dev store** as a staging store. Do not delete it: it is
      the only place to try Admin changes without touching the shop. Its
      data will drift from live, so re-sync before relying on it.
- [ ] Update `CLAUDE.md` with the live store's facts (10.7), and mark this
      runbook **done**, with the cutover date.

---

## What could not be checked

The 2026-10-25 measurement used the Storefront API, which cannot see:
inventory tracking on `custom-ritual-kit` (must be off), product status
beyond listed / not listed, collection sort order, shipping and tax
settings, whether the product metafield definitions exist, and the private
`contact_message` definition. The migration app (Step 1) answers all of
them.

---

## Appendix A - Metaobject values on dev

For reference while doing Step 4. Live already holds every value below
except the reference fields and the two fixes listed in Step 4.

| Definition | Entries (handle: key values) |
| --- | --- |
| `product_add_on` | `add-your-initials`: variant → `KOZY-ADDON-INITIALS`, text_label "Your initials", max_length 6. `add-a-gift-box`: variant → `KOZY-ADDON-GIFTBOX`. Both active, apply_to_all, charge_per_unit. |
| `kit_builder` | `custom-ritual-kit`: container_variant → `KOZY-KIT`, min_pieces 1, initials_max_length 2, initials_variant empty. |
| `kit_piece` | `bathrobe` → `bathrobe`, `slippers` → `slipper`, `makeup-pouch` → `makeup-pouch`, `eye-mask` (dev: `mask-eye-mask`) → `eye-mask`. |
| `kit_fabric` | `solid`: is_default **true**, swatch `Solid_Beige_Terry_Fabric_Texture.png`. `block-printed`: is_default **false**, swatch `Hand-Printed_Green_Botanical_Linen_Pattern.png`. |
| `kit_colour` | `natural`, `pink`, `sage`: fabric → `solid`; swatches `ChatGPT_Image_Oct_8_2026_01_33_58_PM.jpg`, `…_53_PM.jpg`, `…_44_PM.jpg`. |
| `shop_color` | `rose-pink` "Rose Pink", `indigo-blue`, `tulsi-green`, `oat-milk`, `white`, `sage-green`. |
| `shop_mood` | `five-minute-morning-unwind`, `caffeine-ritual`, `rest-as-a-ritual`, `shared-lounging`, `gifting-rituals`, `for-you-your-furry`. |
| `embroidery_thread` | `gold`, `silver`, `black`, `brown`, `navy`, `pink`. |

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

## Appendix C - Files already on live

Present in live's Files under the same name on 2026-10-25, so Step 2
skips them; Step 10.3 still repoints their URLs. Every image in
`src/lib/site.ts` on dev's path (`0700/6476/7047`) **except** the 8 listed
in Step 2. To list them:

```sh
grep -oE "0700/6476/7047/files/[^?\"]+" src/lib/site.ts | sort -u
```

---

## Appendix D - API reference

### D.1 Checking what the site can see

Run against **live** with the public Storefront token. It answers "will
the site see it?" directly.

```sh
curl -s https://4nr8xa-3x.myshopify.com/api/2026-07/graphql.json \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: $SHOPIFY_STOREFRONT_ACCESS_TOKEN" \
  -d '{"query":"{ products(first:250){nodes{handle}} collections(first:250){nodes{handle}} c:metaobjects(type:\"shop_color\",first:50){nodes{handle}} m:metaobjects(type:\"shop_mood\",first:50){nodes{handle}} f:metaobjects(type:\"kit_fabric\",first:50){nodes{handle}} b:metaobjects(type:\"kit_builder\",first:5){nodes{handle}} p:metaobjects(type:\"kit_piece\",first:50){nodes{handle}} a:metaobjects(type:\"product_add_on\",first:50){nodes{handle}} k:metaobjects(type:\"kit_colour\",first:50){nodes{handle}} t:metaobjects(type:\"embroidery_thread\",first:50){nodes{handle}} menu(handle:\"main-menu\"){items{title}} }"}'
```

Expected once Step 3 is done:

- 91 products. The 7 Unlisted ones (4 pieces, the kit, 2 add-ons) do
  **not** list. On 2026-10-25 this returned 93, because both add-ons were
  still Active.
- 20 collections.
- Metaobject counts 6 / 6 / 2 / 1 / 4 / 2 / 3 / 6.
- The menu's 7 top-level items.

Counts do not show the reference fields. To see which are still empty,
ask for them: an unset field is simply missing from `fields`.

```graphql
{ metaobjects(type: "product_add_on", first: 10) { nodes { handle
    fields { key value reference { __typename } } } } }
```

### D.2 The scripted route for Steps 4-5

With the `Kozy migration` app (Step 1), a Node script can read dev through
its Storefront token and write live through the Admin API, matching by
handle and SKU:

| Step | Mutation | Notes |
| --- | --- | --- |
| Entries | `metaobjectUpsert(handle: { type, handle }, metaobject: { fields: [{ key, value }] })` | Safe to re-run. Reference fields take the **live** gid: look products up with `productByHandle` / `productVariants(query: "sku:KOZY-KIT")`, and files with `files(query: "filename:…")`. |
| Product metafield definitions | `metafieldDefinitionCreate(definition: { name, namespace: "custom", key, ownerType: PRODUCT, type: "list.metaobject_reference", validations: [{ name: "metaobject_definition_id", value: <gid> }], access: { storefront: PUBLIC_READ } })` | Only if 5.1 finds them missing. |
| Product values | `metafieldsSet(metafields: [{ ownerId, namespace: "custom", key, type: "list.metaobject_reference", value: "[\"gid://shopify/Metaobject/…\"]" }])` | Up to 25 per call. Keep the order from Appendix B. |

Run it once with a dry-run flag that only prints what it would write,
read the output, then run it for real.

---

## Appendix E - Theme redirect snippet

Goes into the fresh **forwarding theme** (Step 12). Create
`snippets/headless-redirect.liquid`:

```liquid
{%- comment -%}
  Sends every theme page to the headless storefront at kozyliving.in.
  Checkout, cart permalinks, accounts and app proxies are left alone -
  they must keep working on this domain. Lives only in the
  "Forward to headless" theme.
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
