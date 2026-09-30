# Personalisation add-ons: Initials (₹499) and Gift Box (₹999)

On any product on the site, a shopper can optionally add **initials**
(+₹499 per unit) and/or a **gift box** (+₹999 per unit). Both are charged by
Shopify at checkout and appear on the order in Shopify Admin, indented under
the product they belong to, with the letters beside them.

This runs on the Shopify **Basic** plan: no app, no Plus features.

**Status (2026-10-01):** **Shopify Admin setup is complete** (§4, Steps 1–7).
**No code has been written yet.** Next: Phase 2, the cart refactor (§5).

---

## 1. Decisions

| # | Decision |
| --- | --- |
| 1 | **Both add-ons are optional on every product on the site.** No product is set up individually. |
| 2 | **Initials cost ₹499** and are never included in a product's price. |
| 3 | **The gift box costs ₹999.** |
| 4 | **Both are charged per unit**: two totes with initials and a box = 2 × ₹499 + 2 × ₹999. |
| 5 | **Initials are 1–6 letters, A–Z only.** No spaces, dots, ampersands, digits, emoji or other scripts. |
| 6 | **The old workaround is gone.** The fake "Initials" option ("Write your initials in notes at check out pls") was deleted from every product on 2026-10-01. Verified: none of the store's 92 products carries it. |

### Still open

- **Gift message.** Should the gift box come with an optional message? It
  would cost nothing to build: a text field on the Gift Box entry.
- **The 3 "Initial Twin" kits** (`initial-twin-bandana-kit`,
  `neelu-twin-initial-kit`, `bandana-1`) are sold as initialled products.
  Under decision 1, initials are optional (+₹499) on them like everywhere
  else, so a shopper can buy one without entering any. If those three should
  *require* initials, see §8.

### Until the code ships

With the old option deleted, **the live site currently has no way for a
shopper to ask for initials.** If that matters before launch, add a line such
as "For initials, DM @kozyliving_" to the relevant product descriptions.

---

## 2. How it works

Each add-on is a hidden Shopify product. When a shopper picks one, the site
adds it to the cart as a **nested cart line**: a child line attached to the
product it belongs to (`CartLineInput.parent`, Storefront API `2025-10`+; this
repo uses `2026-07`). The letters travel on the child line as a line-item
property, `Initials: KF`.

Shopify then:

- charges the add-on's real price at checkout;
- shows it **indented under its product** in checkout, in the Admin order, in
  confirmation emails and on the order status page;
- **removes it automatically** if the product is removed from the cart.

### Why not something else

| Option | Why not |
| --- | --- |
| Line-item properties alone | Can carry the letters, **can't change the price**. |
| A "with initials" variant on every product | Doubles the variant count, uses one of only 3 options, and still can't carry the letters. |
| Cart Transform (Shopify Functions) | Custom apps containing Functions are **Plus-only**. |
| Product-options apps (Globo, Infinite Options…) | Built for Liquid themes. This storefront is headless. |
| Checkout UI extensions | Plus-only beyond the thank-you and order-status pages. |

### Tested on the live store (throwaway cart, no order)

| Behaviour | Result | What the code must do |
| --- | --- | --- |
| Parent/child link with a property on the child | ✅ Works | — |
| Remove the parent | ✅ Children removed too | Nothing extra |
| Parent quantity 1 → 2 | ⚠️ **Child stayed at 1** | Update both in one call |
| Two plain lines of the same variant | ⚠️ **Merged into one line** | Give each personalised line a hidden `_kozy_line` UUID so two totes with different initials stay separate |
| Querying the link | `parentRelationship` is on `CartLine`, not `BaseCartLine` | Use `... on CartLine { … }` in the fragment |

---

## 3. What Shopify Admin controls

Nothing about the add-ons is hard-coded in the site:

| To… | Do this in Admin |
| --- | --- |
| Change a price | Edit the add-on product's price. Live on the site within 60 s. |
| Turn an add-on off everywhere | Set the entry's **Active** to False, or its status to Draft |
| Change the wording | Edit the entry's Title, Text label, Help text or Policy note |
| Change the letter limit | Edit **Max length** on the Initials entry (the site still allows A–Z only) |
| Stop offering gift boxes when stock runs out | Track inventory on the Gift Box product; the option greys out at 0 |
| Add a new add-on later | Create a product and an entry, same as below |

---

## 4. Shopify Admin setup

### Progress

Last checked 2026-10-01 against the live Storefront API.

- [x] **Step 1 — Add-on products** ✅ verified
- [x] **Step 2 — Metaobject definition** ✅ verified (all 12 keys correct)
- [x] **Step 3 — The two entries** ✅ verified field by field
- [x] **Step 4 — "Apply to all" on** ✅ verified: both entries read
  `apply_to_all: true`
- [x] **Step 5 — Shopify Flow order tags** — built (from screenshot; Flow
  isn't visible to the Storefront API). Check both conditions use **At least
  one of**, and that the workflow is **turned on**. It gets its real test with
  the Phase 5 test order. The saved order views wait for that order too:
  Shopify hides the Orders filters while the store has no orders.
- [x] **Step 6 — Packing slip** — done in Admin (reported; not visible to the
  API). Checked by the Phase 5 test order.
- [x] **Step 7 — Discount codes** — done in Admin (reported; not visible to
  the API).

### Step 1 — Add-on products ✅

Two products exist and are verified:

| | Personalised Initials | Kozy Gift Box |
| --- | --- | --- |
| Handle | `personalized-initials` | `kozy-gift-box` |
| SKU | `KOZY-ADDON-INITIALS` | `KOZY-ADDON-GIFTBOX` |
| Price | ₹499 | ₹999 |
| Status | Active | Active |
| Tag | `kozy-addon` | `kozy-addon` |
| Collections | none | none |
| Inventory | not tracked | not tracked (track it if boxes are limited stock) |
| Shipping | Physical product **on**, weight 0 | Physical product **on**, weight 0 or the box's weight |
| Category | Uncategorized | Gift Boxes & Tins |
| Sales channel | The one the website uses; not Online Store, Google or Meta | Same |

The handle `personalized-initials` keeps the original z spelling. Shoppers
never see it, so it isn't worth a redirect.

**Why "physical product" stays on:** items that don't need shipping can drop
out of the fulfilment, and so off the packing slip. The packer must see the
initials. At 0 g it doesn't change courier rates.

**Tax:** ask the CA which GST rate and HSN code apply. The HSN code goes in
**Shipping → HS Code**.

### Step 2 — Metaobject definition "Product add-on" ✅

*Settings → Custom data → Metaobject definitions → Product add-on*
(type `product_add_on`).

| Key | Type | Notes |
| --- | --- | --- |
| `title` | Single line text | Display name |
| `variant` | Product variant (one) | The charged SKU; the price is read from here. A product with no options has one hidden variant, listed in the picker under the product's name. |
| `kind` | Single line text | Regular expression `^(initials\|gift_box)$`. Metaobject fields have no "preset choices" option. |
| `text_label` | Single line text | |
| `text_required` | True or false | |
| `max_length` | Integer, 1–10 | |
| `help_text` | Multi-line text | |
| `policy_note` | Single line text | |
| `charge_per_unit` | True or false | |
| `required` | True or false | |
| `apply_to_all` | True or false | |
| `active` | True or false | |

Options: **Active-draft status on** (entries must be Active), **Storefronts API
access on** (without it the site sees nothing), Translations on, everything
else off. Display name: Title.

A field type can't be changed after creation, and renaming a field does
**not** change its key. To change either, delete the field, save, and add it
again.

### Step 3 — The two entries ✅

| Field | Add Your Initials | Add a Gift Box |
| --- | --- | --- |
| variant | Personalised Initials (`KOZY-ADDON-INITIALS`) | Kozy Gift Box (`KOZY-ADDON-GIFTBOX`) |
| kind | `initials` | `gift_box` |
| text_label | Your initials | *(empty)* |
| text_required | true | false |
| max_length | 6 | *(empty)* |
| help_text | Up to 6 letters, hand-embroidered. Adds 5–7 days | Wrapped in our signature box. |
| policy_note | Personalised Kompanions can't be returned. | *(empty)* |
| charge_per_unit | true | true |
| required | false | false |
| apply_to_all | true | true |
| active | true | true |

Optional polish: the titles are in title case ("Add Your Initials", "Add a
Gift Box") and the site shows them as written. Change them to "Add your
initials" / "Add a gift box" for sentence case. The Initials help text also
lacks a closing full stop.

### Step 4 — Turn on "Apply to all" ✅

1. **Content → Metaobjects → Product add-on → Add Your Initials** →
   **Apply to all: True** → **Save**.
2. **Add a Gift Box** → **Apply to all: True** → **Save**.

This is what puts both add-ons on every product. No product needs editing.

### Step 5 — Auto-tag orders with Shopify Flow (free on Basic) ✅

1. **Apps → Shopify App Store** → install **Shopify Flow**.
2. **Flow → Create workflow** → trigger **Order created**.
3. **Condition:** *Order → Line items → SKU*, **at least one** item **is
   equal to** `KOZY-ADDON-INITIALS` → **Then** *Add order tags*
   `personalised`.
4. **Second condition** on the same trigger: SKU equals `KOZY-ADDON-GIFTBOX`
   → **Then** *Add order tags* `gift-box`.
5. Turn the workflow **on**.
6. **Saved views: after the first order.** Shopify hides the Orders filters
   until the store has an order, so this happens after the Phase 5 test
   order: **Orders** → filter **Tagged with** `personalised` → **Save as**
   "To embroider". Same for `gift-box` → "To gift-box".

### Step 6 — Show the initials on the packing slip ✅

1. **Settings → Shipping and delivery → Packing slips → Edit.**
2. Find `{{ line_item.title }}` inside the
   `{% for line_item in line_items_in_shipment %}` loop.
3. Paste directly under it:

   ```liquid
   {% for property in line_item.properties %}
     {% assign first_char = property.first | slice: 0 %}
     {% unless first_char == '_' or property.last == blank %}
       <p class="line-item-property">{{ property.first }}: {{ property.last }}</p>
     {% endunless %}
   {% endfor %}
   ```

4. **Save**, then **Preview**.

The **order confirmation email** already prints properties and hides the `_`
ones in its default template. Check it once with the test order.

### Step 7 — Check discount codes ✅

A code set to **"Entire order"** also discounts initials and gift boxes. To
charge add-ons at full price, change those codes to **"Specific
collections"** and pick the product collections. The add-ons are in none.

### Don't

- Add the add-on products to any collection or menu.
- Publish them to Online Store, Google or Meta.
- Rename the SKUs `KOZY-ADDON-INITIALS` / `KOZY-ADDON-GIFTBOX` (Flow and the
  packing workflow depend on them).

---

## 5. Code plan

### Phase 1 — Data layer

- One cached Storefront query, `metaobjects(type: "product_add_on")`, returns
  the entries with their fields and referenced variant (`id`, `price`,
  `availableForSale`, `product { handle }`). It runs on the standard TTL and
  is wrapped in React `cache()`: one Shopify round trip per minute, not one
  per page. GraphQL `#` comments only (CLAUDE.md §6).
- A new `reshapeAddOns` in `lib/shopify/index.ts` returns a typed
  `ProductAddOn[]` (in `types.ts`). It keeps entries that are `active` and
  `apply_to_all`, and drops any with no variant or an unavailable variant.
- **Never offer add-ons on:** products tagged `kozy-addon` (no add-on on an
  add-on), gift cards (`isGiftCard`), or a product with every variant sold out.
- **Hide products tagged `kozy-addon`** from the catalogue, search, facets,
  recommendations, collection pages and sitemap, at the reshape choke points.
  `/product/<addon-handle>` returns 404.

### Phase 2 — Cart refactor (highest risk; done first, tested alone)

Today the cart identifies every line by **variant id** (`cart/actions.ts`,
`cart/cart-math.ts`, `cart/cart-context.tsx`, the drawer `key`) and collapses
repeated lines of one variant. Two totes with different initials are the same
variant, so this has to change first.

- `fragments/cart.ts`: add `attributes { key value }` and
  `... on CartLine { parentRelationship { parent { id } } }`.
- `reshapeCart`: nest child lines under their parent as `item.addOns`, keep
  only parents at top level, and **recompute `totalQuantity` from parents**.
  Shopify counts add-ons, so the header badge would otherwise say "2" for
  one tote.
- Switch actions, reducer, `intentRef` and the drawer `key` from variant id
  to **line id**. Duplicate-collapsing applies only to lines without
  attributes.
- `addItem({ merchandiseId, quantity, addOns: [{ id, text? }] })`:
  1. Re-read the allowed add-ons from Shopify **on the server**; never trust
     ids, prices or rules sent from the browser.
  2. Validate the letters on the server: trim, uppercase, `/^[A-Z]{1,6}$/`
     (the length comes from `max_length`).
  3. Add the parent with `_kozy_line: <uuid>` (only when add-ons are chosen,
     so plain lines still merge), then find it by that UUID.
  4. Add the children with `parent: { lineId }`, not `merchandiseId`, so a
     child can never attach to an older line of the same variant. The child
     carries `Initials: KF`, and its quantity equals the parent's.
  5. If step 4 fails, **remove the parent** and return an error. A
     personalised item must never be in the cart without its paid add-on.
- `updateItemQuantity(lineId, qty)`: update the parent and its children in
  one `cartLinesUpdate` call.
- `removeItem(lineId)`: removing a parent is enough (Shopify cascades);
  removing a child alone is allowed.
- Optimistic reducer: an add with add-ons always creates a new optimistic line
  (temp id), with children priced from the add-on variant.

### Phase 3 — Product page

- New client `AddOnPicker` between `VariantSelector` and `AddToCart` in
  `components/product/product-description.tsx`:
  - one checkbox card per add-on: "Add your initials · + ₹499", "Add a gift
    box · + ₹999";
  - Initials opens a letters field with a live preview and an `n / 6`
    counter; `autocapitalize="characters"`, `autocomplete="off"`, and
    anything other than A–Z is ignored as it is typed;
  - the entry's help text and policy note beneath it;
  - a running total beside the button (₹4,500 + ₹499 + ₹999).
- The letters live in React state, **never in the URL**: personal text, not
  shareable shop state.
- `VariantSelector`: auto-select options that have a single value, so the
  shopper never has to click a lone pill before Add to cart enables.
- Copy the site owns (button text, errors) goes in a new `addOns` block in
  `site.ts`, following the VOICE note. Palette per CLAUDE.md §3: sage never
  carries type on light; use `sage-deep`.

### Phase 4 — Cart drawer and quick-add

- `cart/modal.tsx`: render add-ons under their item, e.g.
  *Initials · KF … ₹499 [remove]* and *Gift box … ₹999 [remove]*. No quantity
  stepper on add-on lines; the item's shown total includes its add-ons.
- `ui/quick-add.tsx` / `product-card.tsx`: quick add stays as it is and adds
  the plain product. Add-ons are optional, so they are chosen on the product
  page or not at all.

### Phase 5 — Verification

- Playwright across the CLAUDE.md §9 breakpoint sweep: add with initials; add
  the same variant again with different initials; change quantity; remove the
  item; remove only an add-on; invalid letters.
- A **real test order** in test mode (the store identifies as "Kozy Living
  Dev"). Check Admin → Orders (nesting and the Initials property), the
  confirmation email, the packing slip and the Flow tags. Then create the two
  saved order views (§4 Step 5.6), which Shopify only allows once an order
  exists.
- Update CLAUDE.md with the add-on model and the line-id cart.

### Files touched

| File | Change |
| --- | --- |
| `src/lib/shopify/queries/` (new query) | the `product_add_on` metaobjects |
| `src/lib/shopify/fragments/cart.ts` | `attributes`, `parentRelationship` |
| `src/lib/shopify/index.ts` | `reshapeAddOns`, nested `reshapeCart`, `kozy-addon` exclusion |
| `src/lib/shopify/types.ts` | `ProductAddOn`, `CartItem.attributes` / `addOns` |
| `src/components/cart/actions.ts` | line-id actions, add-on add with rollback, quantity sync |
| `src/components/cart/cart-math.ts`, `cart-context.tsx` | line-id reducer and intents |
| `src/components/cart/modal.tsx`, `delete-item-button.tsx`, `edit-item-quantity-button.tsx` | nested rendering, line-id controls |
| `src/components/product/add-on-picker.tsx` (new) | the picker |
| `src/components/product/product-description.tsx`, `variant-selector.tsx` | mount the picker; auto-select single values |
| `src/lib/site.ts` | `addOns` copy |
| `CLAUDE.md` | document the model |

---

## 6. Edge cases

### Shopper side

| Case | Handling |
| --- | --- |
| Same product twice, different initials | Separate lines via `_kozy_line` (tested: without it they merge) |
| Quantity changed on a line with add-ons | Children synced in the same call (tested: Shopify won't do it) |
| Product removed | Add-ons removed with it (tested) |
| Remove only the initials or the gift box | Allowed |
| Change the initials in the cart | v1: remove and re-add. v2: edit in place (child properties can be updated). |
| Initials ticked but empty | Add to cart blocked with a message |
| Digits, spaces, symbols, emoji, Devanagari, more than 6 letters | Ignored while typing; rejected by the server if sent anyway |
| Lowercase letters | Uppercased |
| Add-on turned off or sold out before the page loads | Not offered, or shown greyed "currently unavailable" |
| …between page load and click | The server re-check rejects it with a message; nothing is added |
| Price changed in Admin while in a cart | Shopify reprices; the drawer shows the live figure |
| Add-on deleted or archived while in a cart | The line shows as unavailable with "remove to continue" |
| Initials and gift box on the same item | Both are children of one parent. One parent with two children is checked first in Phase 2. |
| Quick add from a product card | Adds the plain product; no add-ons |
| Header count | Counts products, not add-on lines |
| Line hits `MAX_LINE_QUANTITY` | Parent and children capped together |
| Cart cookie points to an expired cart | Existing recovery path; parent and children re-added together |
| Returns | The policy note is shown before adding. Enforcing it is policy, not code. |
| "Buy again" from the customer account | Shopify re-adds add-ons as separate, unlinked items (a platform limitation) |

### Admin side

| Case | Handling |
| --- | --- |
| Storefronts access turned off on the definition | Add-ons disappear from the site; nothing breaks. First thing to check. |
| An entry set to Draft, or Active = false | That add-on disappears site-wide |
| An add-on product set to Draft or unpublished from the site's channel | That add-on disappears site-wide |
| An add-on product put into a collection | Still hidden from listings by the `kozy-addon` tag |
| Gift Box stock tracked and reaches 0 | Option greys out "currently unavailable" |
| Someone uses the public API to put initials on a line without paying | The letters exist **only on the paid child line**. Workshop rule: no `personalised` tag, no embroidery. |
| An add-on bought on its own | Impossible through the site; Flow can flag it (paid, harmless) |
| Staff edit an order, or create a draft / POS order | Shopify doesn't keep nesting there. Staff add the add-on SKU as a normal line and type the property. |
| Refund only the add-on | Refund that child line from the order |
| Courier tools (e.g. Shiprocket) | Add-ons appear as extra lines at 0 g |
| Reporting | Add-on revenue shows as its own product in sales reports |

---

## 7. Verifying the Admin setup from the code side

Everything in §4 can be checked through the Storefront API with the site's own
token, without logging in to Admin:

- `products(query: "tag:kozy-addon")`: both products, SKUs, prices,
  availability, no collections.
- `metaobjects(type: "product_add_on")`: every entry, field by field. An
  entry in Draft, or a definition with Storefronts access off, returns
  nothing.

---

## 8. If some products ever need different add-ons

Not built, and not needed for decision 1. If, say, the Initial Twin kits
should *require* initials at no charge, the route is a product metafield
`custom.add_ons` (a list of `Product add-on` entries, Storefronts access on)
that overrides "apply to all" on the products that carry it, plus a ₹0
initials product and a `required` entry. That is roughly half a day of extra
code on top of this plan.

---

## Sources

- [Create and query nested cart lines – Shopify](https://shopify.dev/docs/apps/build/product-merchandising/nested-cart-lines/create-nested-cart-lines)
- [Nested cart lines – behaviour and limitations](https://shopify.dev/docs/apps/build/product-merchandising/nested-cart-lines)
- [Changelog: support for nested cart lines](https://shopify.dev/changelog/new-support-for-nested-cart-lines)
- [CartLineInput – Storefront API](https://shopify.dev/docs/api/storefront/latest/input-objects/CartLineInput)
- [Nested cart lines for add-ons – community findings](https://community.shopify.dev/t/nested-cart-lines-for-addons-now-works/20784)
- [About Shopify Functions (Plus-only for custom apps)](https://shopify.dev/docs/apps/build/functions)
- [Hidden line item properties (underscore prefix)](https://www.printitmyway.com/blog/shopify-hidden-line-item-properties-underscore)
