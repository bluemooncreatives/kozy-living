# Custom Kit Builder: research, design and Shopify Admin setup

A page where a shopper builds **their own kit** from four base Kompanions —
**Bathrobe, Slippers, Makeup Pouch, Eye Mask** — in any combination of two, three or
all four, then chooses a fabric, an embroidery thread and their initials, and
adds the whole kit to the cart as **one item** that Shopify charges correctly
and prints, piece by piece, on the order.

The four base products are **never visible on the shop**: not in collections,
search, recommendations, the category rail or the sitemap. They exist only
inside the builder, and on the shopper's order (checkout, confirmation email,
order status page and the `/account` order history).

**Status (2026-10-08):** Admin Steps 1–5 done on the dev store
(`kozy-living-dev`); Steps 6–9 pending. **Code built** (Phases 0–5; CLAUDE.md
§14) and checked in a browser on `next dev`: building, live re-pricing on a
fabric switch, adding to the cart, the drawer's kit card, a quantity change
moving every piece, the pieces hidden from search with their pages
not-found, and no horizontal overflow from 320px to 414px. **Phase 0 passed:**
a throwaway cart took the ₹0 container with the four Unlisted Block printed
pieces nested under it (₹6,897), quantity 2 moved every line, and removing the
container removed them all. Not yet seen: checkout, a real order and the
`/account` kit grouping (needs a signed-in customer with an order).

Verified through the Storefront API (`2026-07`) with the site's token:

- All four definitions have Storefronts access on; entries: 1 builder,
  4 pieces, 2 fabrics, 6 threads, all active.
- **Unlisted works as designed:** `products(query: "tag:kozy-kit-piece OR
  tag:kozy-kit")` returns nothing, while the `kit_piece` references resolve
  every product with all variants `availableForSale`. (Phase 0 items a and b.)
- **Shopify's linked "Fabric" option returns the entry's Label as the option
  value** (`Block printed`), so matching on `option_value` works. Option order
  on the products is Size, then Fabric; match by option **name**, not position.
- Every piece, Eye Mask and Makeup Pouch included, has sizes S–XL (Slipper
  S/M), and Slippers are marked embroiderable.
- Found and reported for fixing: `min_pieces` was 1, the Block Printed
  entry's `option_value` had a capital P, and the Eye Mask piece title held
  pasted table text.
- Still open in Admin on 2026-10-08: `min_pieces` reads 1 and the Eye Mask
  title still holds the pasted text. The code now tolerates the capital-P
  `option_value`, so that one no longer needs fixing.

> **Supersedes the deleted plan.** Commit `0e2e45c` added `docs/kit-builder.md`
> and `docs/kit-builder-shopify-admin.md` (deleted in `993e386`). That plan
> personalised **one existing product per build**. This brief is different: a
> kit **assembled from several dedicated base products**, each priced per
> fabric. Reuse its research, not its decisions. Despite its commit
> message, `0e2e45c` contains **no kit builder code**: only those two docs,
> `CategoryShelf`, `StudioNote` and `sameCategoryFor`.

---

## Contents

1. [The brief](#1-the-brief)
2. [Is it possible on this stack? — research findings](#2-is-it-possible-on-this-stack--research-findings)
3. [The chosen design](#3-the-chosen-design)
4. [What already exists in this codebase](#4-what-already-exists-in-this-codebase)
5. [Shopify Admin setup — step by step](#5-shopify-admin-setup--step-by-step)
6. [Code plan](#6-code-plan)
7. [Edge cases](#7-edge-cases)
8. [Verification](#8-verification)
9. [Open questions (defaults are what will be built)](#9-open-questions-defaults-are-what-will-be-built)
10. [Implementation prompt (paste this to start the build)](#10-implementation-prompt-paste-this-to-start-the-build)
11. [Sources](#11-sources)

---

## 1. The brief

| Step | What the shopper does | Pricing effect |
| --- | --- | --- |
| 1 · Choose Kompanions | Pick **at least two** of Bathrobe / Slippers / Eye Mask / Makeup Pouch (a "Full Ritual Kit" tile selects all four), and a **size** for each piece that has sizes | Sum of the chosen pieces' Solid prices |
| 2 · Choose fabric | **Solid** (default, preselected) or **Block Printed** | **Every chosen piece switches to its own Block Printed price** (table below) |
| 3 · Choose embroidery thread | A colour swatch (gold, silver, black, brown, navy, pink in the mockup), or "No embroidery" | Free |
| 4 · Custom initials | Up to **2 letters** (the mockup's limit), with a live preview in the chosen thread colour | Included (see §9 Q2) |
| 5 · Review & cart | Line-by-line price and one total; **Add to cart** | — |
| Shopify cart → checkout → order | One kit line with the pieces, fabric charge, thread and initials under it | Shopify charges the real prices |

The size step is not in the mockup, but the bathrobe and slippers need one, so
step 1 has to ask for it.

### Prices (owner, 2026-10-07)

Each piece has **two prices**, one per fabric. Choosing Block Printed does
not add a flat charge; it swaps every chosen piece to its Block Printed price.

| Piece | Solid | Block Printed | Difference |
| --- | --- | --- | --- |
| Bathrobe | ₹2,000 | ₹3,000 | +₹1,000 |
| Slippers | ₹1,199 | ₹1,499 | +₹300 |
| Makeup Pouch | ₹899 | ₹1,499 | +₹600 |
| Eye Mask | ₹699 | ₹899 | +₹200 |
| **All four** | **₹4,797** | **₹6,897** | **+₹2,100** |

Worked example, Bathrobe + Eye Mask: Solid ₹2,699 → Block Printed ₹3,899
(+₹1,200).

Hard requirements:

- The four base products **must not appear** on the shop page, in any
  collection, in search, or anywhere else a product can be browsed.
- A purchased kit **must be visible to the customer** after purchase:
  confirmation email, order status page and `/account` order history.
- Headless: everything runs through the Storefront API and the Customer
  Account API. No Liquid theme and no theme app blocks.
- The store is on the **Basic** plan (see `docs/personalisation-add-ons.md`).
  Nothing here may need Shopify Plus.

---

## 2. Is it possible on this stack? — research findings

**Yes, without an app or Plus.** Each requirement maps to a platform feature
that exists today and that this repo either already uses or can use directly:

| Requirement | Platform feature | Verdict |
| --- | --- | --- |
| Hide the base products everywhere but keep them buyable | **Unlisted** product status (Admin API `2025-10`+) | ✅ Native. Shopify documents unlisted products as returned by the Storefront API "only when referenced individually by handle, id, or metafield reference", so they never show up in `products`, `collection.products`, `search` or recommendations. |
| Builder can still read them | **Metaobjects** with product references | ✅ A metafield/metaobject reference is one of the three ways an unlisted product *is* returned. The builder loads its pieces through metaobjects, never through a product listing. |
| Kit as one unit with a single price in the cart | **Nested cart lines** (`CartLineInput.parent`, Storefront API `2025-10`+; this repo is on `2026-07`) | ✅ Already in production here for initials and gift box (CLAUDE.md §13). One level of nesting is allowed, which is all a kit needs: kit → pieces. |
| A different price per piece for each fabric | A **Fabric** option on each base product, with a price per variant | ✅ Plain Shopify variants. Nothing extra to build; the price is whatever the chosen variant costs. |
| Thread colour and initials on the order | **Line-item properties** (cart line `attributes`) | ✅ Printed in checkout, the Admin order, the confirmation email, the order status page and (with the snippet already installed) the packing slip. |
| Customer sees the kit after buying | Shopify-hosted **order status page** shows nested lines; **Customer Account API** `Order.lineItems` exposes `customAttributes` | ✅ The status page works with no change. `/account` currently lists only order totals, so it needs line items added (§6 Phase 5). |

### Nested cart lines — what Shopify allows

From Shopify's nested-cart-lines docs:

- **"Only one level of parent-child is allowed."** So the kit cannot nest
  initials under the bathrobe *under* the kit. Everything sits one level below
  the kit line, and the initials and thread go on the kit line as properties.
- Children are **removed automatically when the parent is removed**.
- Nesting is shown in checkout, the thank-you page, the order status page,
  order and abandoned-checkout emails, and the Admin order.
- **Not supported:** draft orders, order editing, POS, bundles, and Script
  Editor. **"You cannot nest add-ons under bundle parents or components."**
- Parent relationships cannot be changed once set.
- The parent can be referenced by `lineId` or `merchandiseId`. This repo
  always uses `lineId`, for the reason in §13.

Measured on this store when the add-ons were built
(`docs/personalisation-add-ons.md` §2): child quantity does **not** follow the
parent, two identical lines **merge**, and `parentRelationship` is on
`CartLine`, not `BaseCartLine`. The existing code already handles all three.

### Alternatives considered and rejected

| Option | Why not |
| --- | --- |
| **Cart Transform function** (`linesMerge` into one "Ritual Kit" line) | Shopify Functions in a **custom app are Plus-only**. A public app's functions run on every plan, but that means a third-party app you depend on. |
| **Shopify Bundles app** (fixed bundles) | One bundle product per combination: 11 combinations of 2+ pieces × 2 fabrics × every size pairing. And add-ons **cannot be nested under bundle parents or components**, so the paid lines could not sit under the kit. Customised bundles rely on theme app blocks, which a headless site does not have. |
| **One "Custom Kit" product with a variant per combination** | 22 variants before sizes; with robe and slipper sizes it passes Shopify's 3-option limit. The order would read "Custom Kit — Robe+Slipper+Mask / Block / M" rather than listing the pieces, and the pieces' own prices and stock would be duplicated by hand. |
| **Line-item properties only** | Can carry text but **cannot change the price**. |
| **Product-options apps** (Infinite Options, Globo…) | Built for Liquid themes; they inject into the theme's product form. Nothing to inject into here. |
| **`nextjs-frontend-hidden` tag alone** | The site already has this tag (`HIDDEN_PRODUCT_TAG`), but it only hides a product from *this site's* listings and still renders its page. Unlisted also hides it from Shopify's own search, the sitemap, Google/Meta channels and Shopify Catalog. Use both: Unlisted for the platform, a tag for the code (§5 Step 1). |

---

## 3. The chosen design

### The kit in the cart and on the order

A hidden **kit container** product at ₹0 is the parent. Each chosen piece is a
child nested under it, as the variant for the chosen fabric (and size):

```text
Custom Ritual Kit                              ₹0      Kit: K-7Q2X · Fabric: Block Printed · Thread: Gold · Initials: PD
  ↳ Kozy Bathrobe · Block Printed / M          ₹3,000  Kit: K-7Q2X
  ↳ Kozy Slippers · Block Printed / UK 6       ₹1,499  Kit: K-7Q2X
  ↳ Kozy Makeup Pouch · Block Printed          ₹1,499  Kit: K-7Q2X
  ↳ Kozy Eye Mask · Block Printed                ₹899  Kit: K-7Q2X
                                               ───────
                                               ₹6,897
```

The same kit in Solid is ₹4,797. There is **no separate fabric-charge
line**: the fabric is in each piece's variant, so its price is too.

Why this shape:

- **The kit reads as one thing** in checkout, the Admin order and the email,
  with the pieces indented under one heading. That is as close to the mockup's
  single "Ritual Kit (Customized)" line as Basic allows. The mockup's single
  ₹6,999 line needs a Cart Transform `linesMerge`, which is Plus-only for a
  custom app.
- **Removing the kit removes everything** (Shopify cascades).
- **Each piece stays a real product** with its own price, per-size variants,
  SKU, stock and line in sales reports, so a price change is an Admin edit only.
- **The ₹0 parent carries the choices** that apply to the whole kit: fabric,
  thread and initials. Each is printed once rather than repeated under every
  piece.
- **`Kit: K-7Q2X` is on every line**, visibly (no underscore). It is a short
  random code that ties the lines together where nesting is lost: the Customer
  Account API (which documents no parent/child field on `LineItem`), staff
  order edits and POS (where Shopify does not keep nesting), courier exports,
  and the packing slip. The workshop can pack "everything marked K-7Q2X"
  together.
- The parent also carries the existing private `_kozy_line: <uuid>`
  (`ADDON_PARENT_ATTRIBUTE`), so two kits never merge into one line.

**Fabric is one choice per kit** (every piece in a kit shares it), and it is a
**variant option on every base product**. Each line on the order therefore
names its own fabric ("Block Printed / M"), each fabric has its own price, and
stock can be tracked per fabric if needed. The parent repeats it once as
`Fabric: …` so the kit heading reads complete on its own.

### Where the choices live in Shopify

All builder content is editable in Admin, so no copy or price is hard-coded:

| Thing | Shopify object | Holds |
| --- | --- | --- |
| 4 base products | Products, status **Unlisted**, tag `kozy-kit-piece`, options **Fabric** (+ **Size** where needed) | Price per fabric (and size), SKU, images, stock |
| Kit container | Product, status **Unlisted**, tag `kozy-kit`, ₹0 | The heading line on the order |
| `kit_builder` | Metaobject (one entry) | Kit name, container variant, min pieces, initials max length, optional initials charge, active |
| `kit_piece` | Metaobject (one per base product) | Product reference, display name, short description, embroiderable?, sort order, active |
| `kit_fabric` | Metaobject (Solid, Block Printed) | Name, the exact **option value** it selects on the products, description, swatch image, default?, sort order, active |
| `embroidery_thread` | Metaobject (one per colour) | Name, colour, optional swatch photo, sort order, active |

Why metaobjects rather than hard-coding the four handles:

1. **Unlisted products can only be fetched by handle, id or reference.** A
   reference from a metaobject is the cleanest of the three, and the builder
   needs one query, not four.
2. The owner can add a fifth piece (a hand towel, say), retire a thread colour
   or change a price **without a deploy**, within 60 seconds (the standard
   cache TTL, CLAUDE.md §4).
3. It mirrors `product_add_on` (§13), which the merchant already maintains.

### Why fabric is a variant, not a surcharge line

An earlier draft of this doc charged a flat ₹1,000 per kit through a hidden
"Block Print Fabric" product. The owner's prices (§1) differ **per piece**
(+₹1,000 / +₹300 / +₹600 / +₹200), which is exactly what variant prices
express, so that product is gone:

- **No extra product, no extra line, no extra code.** The builder picks the
  variant whose Fabric (and Size) match the shopper's choices; Shopify charges
  that variant's price.
- **A price change is one field in Admin**, per piece and per fabric.
- **The order is self-describing:** every piece line says which fabric to cut.

How the builder finds the variant: `kit_fabric.option_value` ("Block Printed")
must equal the Fabric option value on the products **exactly** (same spelling,
same capitals). The builder matches `selectedOptions` on Fabric + Size.

### Pricing shown in the builder

```text
Bathrobe (Block Printed, M)     ₹3,000
Eye Mask (Block Printed)          ₹899
Initials                       Included   (or the initials charge, §9 Q2)
──────────────
Total                           ₹3,899   × quantity
```

Under the Fabric step, each card shows the kit total in that fabric
("Solid · ₹2,699" / "Block Printed · ₹3,899"), worked out from the pieces
chosen, so the shopper sees the difference before choosing.

The builder reads every figure from Shopify. The server re-reads them all
before adding to the cart, and Shopify charges its own prices at checkout, so
**a total computed in the browser is never trusted**.

---

## 4. What already exists in this codebase

The add-on system (`docs/personalisation-add-ons.md`, CLAUDE.md §13) has
already solved the hard parts. The kit reuses it:

| Existing piece | File | Reuse for the kit |
| --- | --- | --- |
| Nested add with rollback: parent first, find it by `_kozy_line`, nest children by **line id**, remove the parent if the children fail | `addPersonalisedLine()` in `src/components/cart/actions.ts` | Same algorithm. Its parameter type narrows from `ProductAddOn` to `{ variantId; quantity; attributes }` so piece lines fit through it. |
| Quantity sync: the parent and its per-unit children in one `cartLinesUpdate`, re-synced on a stock clamp | `updateItemQuantity()` + `addOnQuantityUpdates()` | Works as is: for a child it doesn't recognise as an add-on, "per unit" falls back to `addOn.quantity === line.quantity`, which is true for every kit child. |
| Cart reshape: children nested under parents, `totalQuantity` counted from parents | `reshapeCart` / `nestCartLines` in `src/lib/shopify/index.ts` | A kit counts as **1** in the header badge with no change. |
| Lines addressed by **line id**, not variant | actions, reducer, drawer `key` | Needed for kits (two kits share variants). Already done. |
| Initials rule: NFKC, A–Z, max length | `cleanInitials` / `isValidInitials` in `src/lib/shop/add-ons.ts` | Same functions, with the kit's max length (2). |
| Hidden-product filters at the reshape choke points | `reshapeProduct`, `reshapeCatalogProduct` (`ADDON_PRODUCT_TAG`, `HIDDEN_PRODUCT_TAG` in `src/lib/constants.ts`) | Add `KIT_PIECE_TAG` / `KIT_CONTAINER_TAG` to both. |
| Metaobject query, cached and reshaped | `queries/add-ons.ts`, `getAddOns()`, `reshapeAddOn` | Template for `queries/kit-builder.ts` / `getKitBuilder()`. |
| Separate checkout cart for Buy now | `buyNow()` in `cart/actions.ts` | Optional "Buy this kit now" later (§6 Phase 6). |
| Packing slip prints every non-`_` property | Admin snippet, add-ons doc §4 Step 6 | `Kit`, `Fabric`, `Thread` and `Initials` print with no template change. |
| Customer login (Customer Account API, PKCE) and `/account` | `src/lib/customer-account.ts`, `src/app/account/page.tsx` | Order history exists but shows **only totals**. It needs line items (§6 Phase 5). |
| Copy in one file | `src/lib/site.ts` | New `kitBuilder` block, written to the VOICE note. |
| Image funnel, buttons, rails | `Plate`, `ActionButton`, `.rail`, `.chip`, `.pill` | All builder surfaces go through them (CLAUDE.md §3, §11). |

**One trap to note now:** `reshapeProduct` will drop the kit pieces once they
carry `kozy-kit-piece`, which is the point. The builder therefore **must not**
read its pieces through `reshapeProduct`. It needs its own `reshapeKitPiece`,
in the same way `reshapeAddOn` reads add-on variants without passing them
through the product filters.

---

## 5. Shopify Admin setup — step by step

Do these in order. Each step ends with a check.

### Step 0 — Before you start

1. **Confirm the plan and API version.** Unlisted needs Admin API `2025-10`+;
   the storefront is on Storefront API `2026-07` (`src/lib/constants.ts`), so
   nothing changes there. If `SHOPIFY_ADMIN_API_VERSION` (or similar) in
   `lib/shopify/admin.ts` is older than `2025-10`, Admin calls will report
   these products as `ACTIVE`. That does not affect the storefront.
2. **Find the site's sales channel.** *Settings → Apps and sales channels* →
   the **Headless** channel (or custom app) whose Storefront API token is in
   `.env`. Every product below must be published to **this channel**. Note
   its name; Step 1 refers to it as "the site's channel".
3. **Check the token's scopes** (*Headless → Storefront API → Permissions*):
   `unauthenticated_read_product_listings`,
   `unauthenticated_read_product_inventory`,
   `unauthenticated_read_metaobjects`, `unauthenticated_write_checkouts`,
   `unauthenticated_read_checkouts`. The add-ons already need all of these,
   so they should be on.

### Step 1 — Create the four base products

*Products → Add product*, four times:

| Field | Bathrobe | Slippers | Makeup Pouch | Eye Mask |
| --- | --- | --- | --- | --- |
| Title | e.g. *Kozy Ritual Bathrobe* | *Kozy Ritual Slippers* | *Kozy Ritual Makeup Pouch* | *Kozy Ritual Eye Mask* |
| Option 1 | **Fabric**: `Solid`, `Block printed` | **Fabric**: `Solid`, `Block printed` | **Fabric**: `Solid`, `Block printed` | **Fabric**: `Solid`, `Block printed` |
| Option 2 | **Size** (S-M, L-XL …) | **Size** (UK 4-5, UK 6-7 …) | none | none |
| Solid price | **₹2,000** | **₹1,199** | **₹899** | **₹699** |
| Block Printed price | **₹3,000** | **₹1,499** | **₹1,499** | **₹899** |
| SKU | `KOZY-KIT-ROBE-SOL-<SIZE>` / `KOZY-KIT-ROBE-BLK-<SIZE>` | `KOZY-KIT-SLIP-SOL-<SIZE>` / `…-BLK-<SIZE>` | `KOZY-KIT-POUCH-SOL` / `KOZY-KIT-POUCH-BLK` | `KOZY-KIT-MASK-SOL` / `KOZY-KIT-MASK-BLK` |
| Images | Studio shots of both fabrics, each attached to its variant | ↔ | ↔ | ↔ |
| Tags | `kozy-kit-piece` | `kozy-kit-piece` | `kozy-kit-piece` | `kozy-kit-piece` |
| Collections | **none** | none | none | none |
| Inventory | Track if made in advance; untracked if made to order | ↔ | ↔ | ↔ |
| Shipping | Physical product **on**, real weight | ↔ | ↔ | ↔ |

Then for each product:

1. **Status → Unlisted** (the dropdown above the title: Active / Draft /
   Unlisted) → **Save**.
2. **Sales channels / Publishing → Manage** → tick **only the site's
   channel** (Step 0.2). Untick Online Store, Google & YouTube, Facebook &
   Instagram and Shop. Unlisted already hides them from those, so this is
   belt and braces.
3. **Set the price on every variant.** Shopify creates one variant per
   combination: for the Bathrobe with 3 sizes that is 6 variants (3 Solid at
   ₹2,000, 3 Block Printed at ₹3,000). In the *Variants* list, use
   **Group by: Fabric** and set the price on the group header to fill a whole
   fabric at once. If a larger size costs more, set it on that variant; the
   builder follows the selected variant exactly.

**How to add the Fabric option** (*Variants → Add options like size or
color*):

1. Option name: **`Fabric`**. Shopify links this name to its own
   category "Fabric" list (the popup says *Fabric · by Shopify*). Each value is
   then an entry with a **Label** (what shoppers and the order see) and a
   required **Base fabric** (the material, from Shopify's list).
2. Value 1: Label **`Solid`**, Base fabric **Cotton** (or the real material).
   Value 2: Label **`Block printed`**, Base fabric **Cotton**. Searching
   "solid" in Base fabric finds nothing, because it lists materials, not
   finishes. That is expected.
3. The two entries are created **once** (on the Bathrobe, 2026-10-07). On the
   other three products, pick the existing **Solid** and **Block printed**
   from the list rather than creating new ones.
4. *Add another option* → **`Size`** with its values (Bathrobe and Slippers
   only).
5. Spell the labels the same on all four products: `Solid` and
   `Block printed` (lower-case p, as created). The builder matches these words
   (`kit_fabric.option_value`); a different spelling on one product would make
   that piece unselectable in that fabric. Phase 0 confirms the Storefront API
   returns the **Label** as the option value.

**Why the tag as well as Unlisted:** Unlisted is the platform's guarantee.
The tag is this codebase's guarantee: the reshape filters drop it even if
someone later flips a piece back to Active, and the product page 404s rather
than rendering a standalone "Add to cart" for a robe that is only sold in a
kit.

✅ *Check:* open the live shop page and search for "Ritual Bathrobe". It
must not appear. The Storefront API query in §8 returns it by handle.

### Step 2 — Create the kit container product

*Products → Add product*:

| Field | Value |
| --- | --- |
| Title | **Custom Ritual Kit** (it heads the order, the email and the account page; the copy is the owner's call) |
| Price | **₹0** |
| SKU | `KOZY-KIT` |
| Tags | `kozy-kit` |
| Status | **Unlisted** |
| Channels | the site's channel only |
| Inventory | not tracked |
| Shipping | Physical product **on**, weight **0** (so it stays on the packing slip with the kit's properties) |
| Image | One hero shot of a full kit (shown as the kit's thumbnail in checkout and on the order) |
| Collections | none |

✅ *Check:* it is not on the shop page.

### Step 3 — *(removed)*

An earlier draft created a ₹1,000 "Block Print Fabric" product here. The
fabric price now lives on each product's variants (Step 1), so there is
**nothing to do in this step**. The numbering is kept so later references
still match.

### Step 4 — Metaobject definitions

*Settings → Custom data → Metaobject definitions → Add definition*, four
times. For **every** definition:

- **Options → Storefronts: API access ON.** Without it the site sees nothing.
  This is the first thing to check if a step goes missing.
- **Active-draft status ON** (entries must be set Active to appear).
- Display name: the `title` field.

A field's type can't be changed after creation, and renaming a field does not
change its key. Get the **keys** exactly as below; the code reads them by key.

#### 4a. `kit_builder` — "Kit builder" (one entry: the settings)

| Key | Type | Validation / notes |
| --- | --- | --- |
| `title` | Single line text | "Custom Ritual Kit" (the builder's heading) |
| `container_variant` | Product variant (one) | **Required.** The ₹0 container from Step 2 |
| `min_pieces` | Integer | min 1, max 4. Set **2** |
| `initials_max_length` | Integer | min 1, max 6. Set **2** |
| `initials_variant` | Product variant (one) | **Optional.** Leave empty if initials are included (§9 Q2); set to the existing *Personalised Initials* variant to charge ₹499 per kit |
| `embroidery_note` | Multi-line text | e.g. "Hand-embroidered. Adds 5–7 days." |
| `policy_note` | Single line text | e.g. "Personalised Kompanions can't be returned." |
| `active` | True or false | Master switch for the whole builder |

#### 4b. `kit_piece` — "Kit piece"

| Key | Type | Validation / notes |
| --- | --- | --- |
| `title` | Single line text | Short tile label: "Bathrobe", "Slippers", "Makeup Pouch", "Eye Mask" |
| `product` | Product (one) | **Required.** The Unlisted base product |
| `description` | Single line text | One line under the tile |
| `embroiderable` | True or false | Does this piece get the initials? (§9 Q3) |
| `sort_order` | Integer | 1–4 |
| `active` | True or false | |

#### 4c. `kit_fabric` — "Kit fabric"

| Key | Type | Validation / notes |
| --- | --- | --- |
| `title` | Single line text | "Solid", "Block Printed" (shown on the card, and printed on the order as `Fabric: …`) |
| `option_value` | Single line text | **Required.** The Fabric option value this card selects on the products, typed **exactly** as in Step 1: `Solid` / `Block printed` |
| `description` | Multi-line text | What the fabric is. Dabu block print, made with craft clusters; no invented claims (CLAUDE.md §2) |
| `swatch` | File (image) | The square swatch on the card |
| `is_default` | True or false | **True on Solid only** |
| `sort_order` | Integer | |
| `active` | True or false | |

#### 4d. `embroidery_thread` — "Embroidery thread"

| Key | Type | Validation / notes |
| --- | --- | --- |
| `title` | Single line text | "Gold", "Silver", "Black", "Brown", "Navy", "Pink" (printed as `Thread: …`) |
| `colour` | Color | Swatch colour and the preview's letter colour |
| `swatch` | File (image) | **Optional.** A photo of the real thread, which beats a flat colour |
| `sort_order` | Integer | |
| `active` | True or false | |

#### 4e. `kit_colour` — "Kit colour" (added 2026-10-08)

The cloth colour, one per kit, chosen right after the fabric. Each colour
belongs to one fabric, so Solid and Block printed have their own lists. It is
written on the order as `Colour: …`; stock is NOT counted per colour.

| Key | Type | Validation / notes |
| --- | --- | --- |
| `title` | Single line text | The colour's name, e.g. "Sage" (printed as `Colour: Sage`) |
| `swatch` | File (image) | The studio photo of the cloth. This is what the shopper taps |
| `fabric` | Metaobject reference → **Kit fabric** | **Required.** Which fabric offers this colour |
| `colour` | Color | **Optional.** Fallback swatch when there is no photo |
| `sort_order` | Integer | Order within its fabric |
| `active` | True or false | |

### Step 5 — Create the entries

*Content → Metaobjects*:

1. **Kit builder** → *Add entry* → fill as in 4a → **Status: Active** → Save.
2. **Kit piece** → four entries, one per base product, `sort_order` 1–4,
   `embroiderable` per §9 Q3 → Active.
3. **Kit fabric** → *Solid* (`option_value` `Solid`, `is_default` true) and
   *Block Printed* (`option_value` `Block printed`, `is_default` false) →
   Active. No prices here: they are on the product variants.
4. **Embroidery thread** → one entry per colour the workshop actually
   stocks (§9 Q5) → Active.
5. **Kit colour** → one entry per cloth colour, each with its photo and its
   fabric (5 for Solid; Block printed colours to follow) → Active.

✅ *Check:* each entry shows **Active**, not Draft.

### Step 6 — Add the builder to the navigation

There is **no hard-coded nav** in this repo (CLAUDE.md §4); the header,
drawer and category rail read the Shopify menu.

*Content → Menus → **main-menu*** → *Add menu item* → Name **"Build your
kit"** (or the owner's copy) → Link: type `/kit-builder` → Save.

It reaches production within 60s (the menu's cache TTL).

### Step 7 — Shopify Flow: tag kit orders

*Apps → Shopify Flow* (already installed for the add-ons) → open the existing
**Order created** workflow → add a condition:

- *Order → Line items → SKU* — **at least one** — *is equal to* `KOZY-KIT` →
  *Add order tags* **`custom-kit`**.
- Optionally: *Line items → Variant title* **contains** `Block printed` →
  tag **`block-print`** (every block-printed piece's variant title includes
  it).

After the first kit order: *Orders* → filter *Tagged with* `custom-kit` →
*Save as* **"Custom kits"**.

### Step 8 — Packing slip and confirmation email

- **Packing slip:** the property snippet from the add-ons setup (add-ons doc
  §4 Step 6) already prints every non-underscore property, so `Kit`,
  `Fabric`, `Thread` and `Initials` appear with no change. Confirm with
  *Preview* after the test order.
- **Order confirmation email** (*Settings → Notifications*): the default
  template prints properties and nests child lines. Check it once with the
  test order (§8).

### Step 9 — Discount codes

A code set to **"Entire order"** also discounts the kit pieces. If kits
should be full price, change those codes to **Specific collections** and
leave the kit products out. They are in no collection, so that excludes them.

### Step 10 — Customer accounts

No new setting. The headless login already uses the Customer Account API
(`docs/CUSTOMER_AUTH_SETUP.md`), and its token can read the customer's
orders and their line items. The code change that shows the kit in
`/account` is §6 Phase 5.

The Shopify-hosted **order status page** (the "View order" link on
`/account`) already shows nested lines and properties.

### Don't

- Put any kit product into a collection or a menu.
- Publish them to Online Store, Google, Meta or Shop.
- Set a kit product to **Draft**: Draft products cannot be sold, so the
  builder would drop that piece. Use **Unlisted**.
- Rename the SKUs `KOZY-KIT` or `KOZY-KIT-*` (Flow and the packing workflow
  read them).
- Rename the Fabric values `Solid` / `Block printed` on one product without
  changing the `kit_fabric` entry's `option_value` to match.
- Rename a product **handle** to fix a title. The metaobject references the
  product by id, so renaming the title alone is safe.

---

## 6. Code plan

Follow CLAUDE.md throughout: copy in `site.ts`, images through `Plate`, CTAs
through `ActionButton`, GraphQL `#` comments only inside fragments, no
`data-reveal` on nodes mounted by a click, and the palette rules (sage never
carries type on cream; use `sage-deep`).

### Phase 0 — Prove the platform on a throwaway cart (before any UI)

Against the live Storefront API with the site's token, with no order:

1. `metaobjects(type: "kit_piece")` returns all four entries **with their
   Unlisted products resolved** through the reference.
2. `products(query: "tag:kozy-kit-piece")` returns **nothing** (Unlisted is
   doing its job).
3. `cartLinesAdd` accepts the ₹0 container, then the four pieces (their
   Block Printed variants) nested under it by `parent.lineId`. The cart total
   equals ₹6,897. **This proves an Unlisted product can be bought through the headless
   channel and that a ₹0 line can be a parent.** Shopify documents neither
   explicitly, so this step comes first.
4. Remove the container: every child goes with it.
5. Change the container's quantity to 2 with its children in one
   `cartLinesUpdate`: all lines are at 2.

If step 3 fails, see the fallbacks in §7 ("Admin side").

### Phase 1 — Data layer

- `src/lib/constants.ts`: `KIT_PIECE_TAG = "kozy-kit-piece"`,
  `KIT_CONTAINER_TAG = "kozy-kit"`, `KIT_ATTRIBUTE = "Kit"` (the visible kit
  code), with the usual *why* comments.
- `reshapeProduct` and `reshapeCatalogProduct`: drop both new tags,
  unconditionally, like `ADDON_PRODUCT_TAG`. The product page then 404s them
  and every listing, search, facet, recommendation, rail and sitemap skips
  them.
- `src/lib/shopify/queries/kit-builder.ts`: **one** query for
  `kit_builder`, `kit_piece`, `kit_fabric` and `embroidery_thread`, resolving
  each reference (`... on Product { id handle title featuredImage options
  variants(first: 50) { id title availableForSale selectedOptions price } }`,
  `... on ProductVariant { id availableForSale price }`, `... on MediaImage`).
  `variants(first: 50)` covers 2 fabrics × up to 25 sizes per piece.
  Image URLs through the shared image fragment (CLAUDE.md §6, *Image
  sizing*).
- `types.ts`: `KitBuilder`, `KitPiece`, `KitFabric`, `KitThread`.
- `getKitBuilder()` in `lib/shopify/index.ts`: React `cache()`, the
  standard TTL, degrades to `null` (builder hidden) on any failure.
  `reshapeKitPiece` / `reshapeKitFabric` / `reshapeKitThread` keep `active`
  entries that have what they need. A piece whose product failed to resolve
  is dropped; one whose variants are all sold out is kept but disabled. Each
  piece's variants are indexed by **Fabric + Size** (`selectedOptions`), so
  the page and the server resolve a choice to a variant the same way.
  Titles pass through `houseSpelling`.

### Phase 2 — Server action `addKitItem` (`components/cart/actions.ts`)

Payload: `{ pieces: [{ pieceId, variantId }], fabricId, threadId?, initials?, quantity }`.

Nothing from the browser is trusted:

1. Re-read `getKitBuilder()` on the server. Refuse if inactive.
2. **Fabric:** must be an active `kit_fabric`; if missing, the `is_default`
   one.
3. **Pieces:** each `pieceId` must be an active `kit_piece`; each `variantId`
   must belong to **that piece's product**, be available, and have a
   **Fabric option equal to the chosen fabric's `option_value`**. That last
   check is what stops a forged payload from buying a Block Printed robe at
   the Solid price, or mixing fabrics inside one kit. No duplicates. The
   count must be ≥ `min_pieces` and ≤ the number of pieces.
4. **Thread + initials:** both or neither. Thread must be an active
   `embroidery_thread`. Initials go through `cleanInitials` /
   `isValidInitials` with `initials_max_length`. Refuse rather than silently
   trim (the shopper must see what will be stitched). Initials with no
   embroiderable piece in the kit are refused.
5. Kit code: `K-` + 5 characters from an unambiguous alphabet (no 0/O/1/I).
6. **Parent** (container variant) attributes: `_kozy_line: <uuid>`,
   `Kit: K-7Q2X`, `Fabric: Block Printed`, and when embroidered
   `Thread: Gold` and `Initials: PD` (labels from `site.ts`, like
   `addOns.orderLabels`). Quantity as asked.
7. **Children**, nested by the parent's **line id**: each piece at the
   parent's *actual* quantity with `Kit: K-7Q2X`, and the initials charge if
   `initials_variant` is set.
8. **Rollback:** if any child fails, or Shopify clamps a piece to 0 (sold out
   between page load and click), remove the parent (which cascades) and return
   a message naming the piece. **A kit must never sit in the cart
   incomplete.**
9. Rate-limit like `buyNow` (`rate-limit.ts`, bucket `kit-builder`).

Refactor `addPersonalisedLine()` to take generic child lines
(`{ merchandiseId, quantity(parentQty), attributes }`) so the add-ons and the
kit share one implementation of steps 6–8.

**Quantity changes** work through the existing `updateItemQuantity` (§4).
Add a test for it, because the fallback path is what makes it work.
**Stock clamp:** if one piece clamps lower than the others, bring the whole
kit down to the lowest quantity, so the kit stays whole.

### Phase 3 — The `/kit-builder` page

- `src/app/kit-builder/page.tsx` + `loading.tsx` (skeleton). It would shadow a
  Shopify page of the same handle, as `/b2b-enquiries` does. Add it to
  `src/app/sitemap.ts`.
- If `getKitBuilder()` is null or inactive, render a calm "the kit builder is
  resting" panel with a link to the shop, not a 404.
- **State in the URL, except the letters** (CLAUDE.md §6, *Shop URL state*):

  ```text
  /kit-builder?pieces=robe,slipper,mask&robe=M&slipper=UK6&fabric=block-printed&thread=gold
  ```

  So the builder is server-rendered, shareable and back-button-correct, and
  steps 1–3 work without JS. **Initials stay in React state**: personal text,
  not shareable state (same reasoning as the product page).
- **Layout.** At `lg`+: steps stacked on the left (as in the mockup), with a
  sticky preview `Plate` and the running price table on the right. Below
  `lg`: collapsible steps that summarise their choice when closed ("Fabric ·
  Block Printed"), and a sticky bottom bar with the total and the primary
  action, clearing the mobile cart bar the way the newsletter teaser does
  (CLAUDE.md §12). Any reorder between breakpoints is a `grid-template-areas`
  map in `globals.css` (CLAUDE.md §11).
- **Step 1 Kompanions:** four `Plate` tiles (multi-select, a check badge on
  the selected ones) plus a **"Full Ritual Kit"** tile that selects all four.
  A size picker appears under each selected sized piece. Sold-out sizes are
  disabled, never hidden. A "Choose at least 2" hint stays until met.
- **Step 2 Fabric:** two cards; Solid preselected. Each card shows **the kit
  total in that fabric** for the pieces chosen ("Solid · ₹2,699" / "Block
  Printed · ₹3,899"), and the price table re-prices every piece when the
  fabric changes. Sizes are kept across the switch. If the chosen size is
  sold out in the new fabric, that piece's size picker flags it rather than
  silently changing it.
- **Step 3 Thread:** round swatches (a ring on the selected one) plus "No
  embroidery". Pale threads switch the preview to an indigo plate so the
  letters stay readable.
- **Step 4 Initials:** the field from `add-on-picker.tsx` (extract it rather
  than copy it): filtered as typed, `n / 2` counter, `autocapitalize`, the
  `embroidery_note` and `policy_note`. Preview: the letters in the thread
  colour on a fabric plate. Set them in the **UI face** (Franxurter is
  single-weight display type, not an embroidery stand-in), with "Letterforms
  are hand-embroidered and will vary" under it.
- **Step 5 Review:** each choice with an *Edit* link to its step; the price
  table (each piece at its size · fabric upgrade · initials · **total**);
  quantity; **Add to cart** → `addKitItem` → drawer opens with the kit
  flagged (`flagAdded`), as the product page's Add to cart does. Keep the
  choices after adding, and offer "Build another kit".
- **Price** is computed from the loaded variant prices for display only. The
  server and Shopify are the authorities.
- **Motion:** `data-reveal` only on the first fold; steps mounted on a click
  use a CSS entrance (like `.lookbook-turn` / `.mood-turn`).
- **Copy:** a new `kitBuilder` block in `site.ts`: "Kompanions", rest and
  ritual, no "elevate", no invented claims. The mockup's wording is a
  starting point, not final copy.

### Phase 4 — Cart drawer (`components/cart/modal.tsx`)

`reshapeCart` already nests the kit's children under the ₹0 parent. The drawer
needs a **kit card** in place of "product + add-ons":

- A heading with the kit title and code, the fabric / thread / initials
  properties, the pieces listed with their size, and **one total** (parent +
  children).
- A quantity stepper on the kit (moves every child, Phase 2).
- **No** remove button on individual pieces (it could drop the kit below
  `min_pieces`) and **no** `LineVariantSelect` on them (a nested line's
  relationship can't be changed; to change a size, remove the kit and rebuild).
  "Edit kit" links back to the builder pre-filled from the line's properties.
- Detect a kit by its parent's merchandise carrying the `kozy-kit` tag, or by
  the `Kit` attribute. Select the merchandise's product `tags` in
  `fragments/cart.ts` if it is not there already.
- Product cards' `CardBuyControls` ignore kit lines when looking for "this
  product in the cart" (they never match anyway: the pieces have no cards).

### Phase 5 — Customer account: show what was bought

`src/lib/customer-account.ts`, `CUSTOMER_QUERY`: add to each order

```graphql
lineItems(first: 50) {
  nodes {
    id name variantTitle quantity
    image { url altText }
    customAttributes { key value }
    totalPrice { amount currencyCode }
  }
}
```

and in `src/app/account/page.tsx` render each order's items. **Group lines
that share a `Kit` value under one "Custom Ritual Kit · K-7Q2X" heading**,
with fabric, thread and initials, and the pieces under it. The Customer
Account API documents no parent/child field on `LineItem` (`group` is for
bundles), which is why the visible kit code exists. Don't group by the
underscore attribute: underscore properties aren't guaranteed to come back.
Keep the "View order" link to the Shopify order status page.

### Phase 6 — Optional, after launch

- **Buy this kit now:** a separate cart and straight to checkout, through
  the `buyNow` path (CLAUDE.md §13).
- **Save a kit design to the account:** store the builder URL (with no
  initials) in a customer metafield through the Customer Account API's
  `metafieldsSet`. That needs a customer metafield definition with
  Customer Account API read/write access. Verify the mutation and scope
  before promising it.
- **Homepage entry point:** a band linking to `/kit-builder`.

### Phase 7 — CLAUDE.md

Add a §14 recording the model (container + nested pieces, the two tags, the
four metaobjects, the visible `Kit` code and why it exists, Unlisted + tag)
and the traps found in Phase 0.

### Files

| File | Change |
| --- | --- |
| `src/lib/constants.ts` | Kit tags and attribute |
| `src/lib/shopify/queries/kit-builder.ts` (new) | The four metaobject types with references |
| `src/lib/shopify/index.ts`, `types.ts` | Tag filters in both reshapes; kit reshapes; `getKitBuilder()` |
| `src/lib/shopify/fragments/cart.ts` | Product tags on merchandise, if missing |
| `src/components/cart/actions.ts` | `addKitItem`; `addPersonalisedLine` generalised |
| `src/components/kit-builder/*` (new) | Steps, preview, price table, mobile bar |
| `src/components/product/add-on-picker.tsx` | Extract the initials field |
| `src/app/kit-builder/page.tsx`, `loading.tsx` (new) | The route |
| `src/components/cart/modal.tsx` | Kit card |
| `src/lib/customer-account.ts`, `src/app/account/page.tsx` | Line items, kits grouped |
| `src/app/sitemap.ts` | The route |
| `src/lib/site.ts` | `kitBuilder` copy, order labels |
| `src/app/globals.css` | Builder layout classes |
| `CLAUDE.md` | §14 |

---

## 7. Edge cases

### Shopper side

| Case | Handling |
| --- | --- |
| Only one piece chosen | "Add to cart" disabled with "Choose at least 2 Kompanions"; the server refuses too |
| Sized piece chosen, no size | Step stays incomplete; the summary names what is missing |
| A size sold out | Disabled in the picker |
| Piece sells out between page load and click | Server refuses, naming the piece; nothing is added (rollback) |
| Every size of a piece sold out | Tile shown dimmed "Currently unavailable"; still buildable from the others if `min_pieces` can be met |
| Initials typed, thread "No embroidery" | Initials field hidden and cleared; nothing sent |
| Thread chosen, initials empty | Review asks for initials or "No embroidery"; the server refuses a thread without initials |
| Digits, emoji, Devanagari, 3+ letters | Filtered as typed; refused by the server |
| Same kit added twice | Two separate kits (`_kozy_line`); quantity is the way to buy two identical ones |
| Quantity 2 on a kit | Every piece goes to 2 in one call |
| Fabric switched after sizes are chosen | Every piece re-prices to the new fabric's variant; sizes are kept |
| Chosen size sold out in the other fabric only | That fabric still selectable; the piece's size picker flags the size as unavailable in it |
| Forged payload: Block Printed robe sent with "Solid" chosen, or mixed fabrics | Server refuses: every piece's Fabric option must equal the chosen fabric |
| Stock clamps one piece below the rest | Whole kit brought down to the lowest quantity |
| Remove the kit | Shopify removes every piece with it |
| Shared builder link | Opens with the same pieces, sizes, fabric and thread; initials empty by design |
| Unknown piece/fabric/thread in the URL | That step resets with a short note; never a 404 |
| Price edited in Admin while the kit is in a cart | Shopify reprices at checkout; the drawer shows live figures |
| No JS | Steps 1–3 work as links; initials and Add to cart need JS (as on the product page) |
| "Buy again" from the customer account | Shopify re-adds the lines **unnested** (a platform limit). The `Kit` code still ties them together on the order. |

### Admin side

| Case | Handling |
| --- | --- |
| A definition's Storefronts access off | That part disappears: `kit_builder` → the whole builder rests; `kit_piece` → no pieces → builder rests; `kit_fabric` → no fabric step, so the builder rests (it cannot pick a variant without one); `embroidery_thread` → no embroidery step. **First thing to check.** |
| A piece product set to Draft or archived | The reference stops resolving; that tile is dropped |
| A piece set back to Active by mistake | Still hidden on the site by the `kozy-kit-piece` tag; visible in Shopify's own surfaces until set Unlisted again |
| Someone adds a kit piece to a collection | Still hidden on the site by the tag |
| A piece has no `Block printed` variant (missing, or spelled differently) | In Block Printed, that tile shows "Not available in this fabric"; Solid still works. Fix the spelling in Admin. |
| Every Block Printed variant sold out | Block Printed card shows "Currently unavailable"; Solid still works |
| Phase 0 shows Unlisted products **can't** be added through the headless channel | Fallback: set the pieces **Active**, keep them out of every collection, publish only to the site's channel, and rely on the `kozy-kit-piece` tag (the code hides them everywhere on the site). They would then appear in Shopify's own search (unused here) and the store sitemap (not this site's). |
| Phase 0 shows a ₹0 parent is refused | Fallback: make the most expensive chosen piece the parent and the rest children; fabric/thread/initials move onto it. Same code with a different parent. |
| Staff edit the order / draft order / POS | Nesting is not kept there (platform limit); the `Kit` code on each line still groups them |
| Refund one piece | Refund that child line in Admin |
| Courier tools (Shiprocket etc.) | Every piece is a separate line with its weight; the container weighs 0 |
| Reporting | Pieces report as their own products (sales by variant splits Solid from Block Printed); `KOZY-KIT` counts kits |

---

## 8. Verification

### From the code side (no Admin login needed)

Through the Storefront API with the site's token:

```graphql
# Must be EMPTY — Unlisted pieces are not listable
{ products(first: 5, query: "tag:kozy-kit-piece") { nodes { handle } } }

# Must return the four pieces with their products resolved
{ metaobjects(type: "kit_piece", first: 10) {
    nodes { handle fields { key value reference { ... on Product { handle availableForSale } } } } } }
```

Repeat the second query for `kit_builder`, `kit_fabric` and
`embroidery_thread`. An entry left in Draft, or a definition with Storefronts
access off, returns nothing.

### Browser (CLAUDE.md §9)

Playwright on `next dev`: wait on `[data-loader]`, preset the newsletter
record, preset the viewport cookie at mobile widths, and sweep the full
breakpoint list with the `scrollWidth === clientWidth` check. Then check:

- the pieces appear on no shop, collection, search, colour or mood page, and
  `/product/<piece-handle>` shows the not-found page;
- every combination of 2, 3 and 4 pieces × both fabrics × with and without
  embroidery leaves the expected lines and properties in the Shopify cart;
- quantity 2, removing the kit, a sold-out size and a forged payload (an
  extra piece id, a variant from another product, 3 initials, a thread
  without initials) all behave as in §7.

### One real test order

Payments in test mode, or a 100%-off code: build a 3-piece Block Printed kit
with Gold "PD" → checkout. Check the nesting and properties in checkout, the
Admin order, the `custom-kit` + `block-print` tags, the confirmation email,
the packing slip, the order status page and **`/account`** (the kit grouped
under its code). Then create the "Custom kits" saved view and cancel/refund
the order. This can share the add-ons doc's still-pending Phase 5 test order.

---

## 9. Open questions (defaults are what will be built)

1. ~~Is the ₹1,000 per kit or per piece?~~ **Answered 2026-10-07:** each
   piece has its own Solid and Block Printed price (§1, *Prices*).
2. **Do initials cost extra in a kit?** Elsewhere on the site they are ₹499.
   The mockup shows no initials charge. *Default:* **included**. To charge,
   set `initials_variant` in Admin.
3. **Which pieces get embroidered?** *Default:* every piece marked
   `embroiderable` (robe, mask and pouch; the mockup shows "PD" on those). Are
   slippers embroidered?
4. ~~Stock per fabric?~~ **Settled by the prices:** fabric is now a variant
   option, so stock *can* be tracked per fabric. Whether to track it at all
   (made in advance) or leave it untracked (made to order) is an Admin
   switch per product.
4a. **Does the Bathrobe or Slipper price change by size?** *Default:* no,
   one price per fabric for every size, as given.
5. **Thread colours.** *Default:* the six in the mockup. Please confirm the
   names the workshop actually stocks, ideally with a photo of each thread
   for the swatch.
6. **Initials length.** *Default:* 2 letters (the mockup). The rest of the
   site allows 6. Editable in Admin.
7. **Kit discount?** Is a 4-piece kit cheaper than its pieces? *Default:* no
   discount. If yes, an automatic discount on the pieces' SKUs (*Discounts →
   Amount off products*) can do it on Basic.
8. **Lead time.** Does block print or embroidery add days? *Default:* the
   `embroidery_note` text only.
9. **Names.** "Custom Ritual Kit", "Build your kit": the owner's copy.

---

## 10. Implementation prompt (paste this to start the build)

> Read `CLAUDE.md` and `docs/custom-kit-builder.md` in full before
> writing anything. Build the Custom Kit Builder exactly as designed there.
>
> **Context:** headless Shopify storefront, Next.js 16 App Router, Storefront
> API `2026-07`, Basic plan (no Functions, no Plus). The add-on system in
> CLAUDE.md §13 (nested cart lines, `addPersonalisedLine`, line-id cart,
> `_kozy_line`) is the foundation. Reuse it; do not build a second cart path.
>
> **Order of work:**
> 1. **Phase 0 first.** Prove on a throwaway cart, through the live
>    Storefront API, that (a) the `kit_piece` metaobjects resolve their
>    Unlisted products, (b) `products(query: "tag:kozy-kit-piece")` is empty,
>    (c) a ₹0 `KOZY-KIT` container line accepts the pieces' Block Printed
>    variants nested by `parent.lineId` (total ₹6,897 for all four), (d) removing
>    the container cascades, and (e) a one-call quantity update moves every
>    line. Report results before building UI. If (c) fails, use the
>    fallbacks in §7.
> 2. Phase 1: constants, tag filters in `reshapeProduct` and
>    `reshapeCatalogProduct`, `queries/kit-builder.ts`, types,
>    `getKitBuilder()` with its own reshapes (never `reshapeProduct` for
>    pieces).
> 3. Phase 2: `addKitItem` with full server-side validation and rollback;
>    generalise `addPersonalisedLine` so the add-ons and the kit share it.
> 4. Phase 3: `/kit-builder` with URL state (initials in React state only),
>    `Plate` / `ActionButton` / `site.ts` copy, the mobile sticky bar, motion
>    rules.
> 5. Phase 4: kit card in the cart drawer.
> 6. Phase 5: line items in `/account`, grouped by the visible `Kit` code.
> 7. Verify per §8 (Playwright per CLAUDE.md §9, full breakpoint sweep), then
>    write CLAUDE.md §14.
>
> **Rules:** never trust prices, ids or text from the browser; never let a
> kit sit in the cart incomplete; no hard-coded nav; no invented copy or
> claims; palette and type rules from CLAUDE.md §3; comments explain *why*.
> Where an open question in §9 is unanswered, build the stated default and
> say so.

---

## 11. Sources

- [Nested cart lines — behaviour and limitations (Shopify)](https://shopify.dev/docs/apps/build/product-merchandising/nested-cart-lines)
- [Create and query nested cart lines (Shopify)](https://shopify.dev/docs/apps/build/product-merchandising/nested-cart-lines/create-nested-cart-lines)
- [CartLineInput — Storefront API](https://shopify.dev/docs/api/storefront/latest/input-objects/CartLineInput)
- [New: Unlisted product status (Shopify developer changelog)](https://shopify.dev/changelog/new-unlisted-product-status)
- [Managing searchability (Shopify Help Center)](https://help.shopify.com/en/manual/online-store/storefront-search/managing-searchability)
- [Unlisted product status — merchant guide (Craftshift)](https://craftshift.com/shopify-unlisted-product-status/)
- [Unlisted product status: hides a product everywhere (ShopifyRanked)](https://shopifyranked.com/shopify-seo/unlisted-product-status/)
- [LineItem — Customer Account API](https://shopify.dev/docs/api/customer/latest/objects/LineItem)
- [Cart Transform Function API](https://shopify.dev/docs/api/functions/latest/cart-transform)
- [Functions in custom apps need Plus; public apps don't (Shopify dev forum)](https://community.shopify.dev/t/cart-transform-discount-functions-require-plus-for-custom-apps-but-not-public-apps-need-clarification-for-single-store-wholesale-pricing/25232)
- `docs/personalisation-add-ons.md`: the measured nested-line behaviour on this store
- Deleted `docs/kit-builder.md` (in commit `0e2e45c`): the earlier single-product plan
