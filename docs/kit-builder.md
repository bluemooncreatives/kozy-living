# Kit Builder: plan

A dedicated page where a shopper personalises **one** Kompanion in five steps:
**product → fabric → thread → initials → review**, then adds it to the cart as
one personalised line that Shopify charges correctly and prints on the order.

This runs on the Shopify **Basic** plan: no app, no Plus features. It is built
on the add-on system already in production (`docs/personalisation-add-ons.md`,
CLAUDE.md §13), which has already proven the hard part: paid nested cart lines
that carry text into checkout, the Admin order, the email and the packing slip.

The Admin half is in **`docs/kit-builder-shopify-admin.md`**.

**Status (2026-10-04):** planned. Nothing built. Admin setup not started.

---

## 1. Decisions

| # | Decision | Source |
| --- | --- | --- |
| 1 | **One product per build.** The builder personalises a single Kompanion; it does not assemble several products into a kit. | Owner, 2026-10-04 |
| 2 | **Step 1 offers** the Kessentials ritual kits, bathrobes, slippers, eye masks and pouches. | Owner |
| 3 | **Fabric has two choices, and both are paid.** *Solid* and *Block Printed* each add their own charge **on top of the product's price** (₹500 in the mockup; the real prices are whatever the two fabric products cost in Admin). The step is **optional**: picking neither means the product as listed, at no extra charge. | Owner, 2026-10-04 |
| 4 | **Initials cost ₹499**, the same add-on as the rest of the site. They are optional. | Owner |
| 5 | **Initials are 1-6 letters, A-Z**, the same rule as the rest of the site, read from the Initials entry's *Max length* in Admin. | Owner |
| 6 | **Thread colour is free** and only asked for when initials are on. It travels on the initials line as `Thread: Gold`. | Proposed; see §9 |

### What Basic cannot do, and what we do instead

The mockup shows the kit as **one line at ₹6,999** in the Shopify cart,
checkout and order. On Basic, Shopify shows the product at its own price with
each paid extra **indented under it**:

```text
Rose Tea Ritual Kit · S-M / Open Wide Sleeve         ₹6,500
  ↳ Block Printed Fabric · Fabric: Block Printed        ₹500
  ↳ Personalised Initials · Initials: PD · Thread: Gold ₹499
```

Folding those into one line needs a Cart Transform function, and custom apps
containing Functions are Plus-only. The total charged is identical. The
builder's review step and our cart drawer still show **one total** for the
personalised Kompanion (the drawer already sums a line with its add-ons).

---

## 2. Mockup → Shopify mapping

| Mockup step | What it becomes | Shopify mechanism |
| --- | --- | --- |
| 1 Choose product | Category tiles → products in that category → **size and other options** (missing from the mockup; every robe and kit has Size, most have Sleeve, slippers have a UK size) | Categories are `kit_builder_category` metaobjects, each pointing at a collection |
| 2 Choose fabric | Solid (+₹) / Block Printed (+₹), or neither | `kit_fabric` metaobjects, each pointing at its own hidden fabric product (**Solid Fabric**, **Block Printed Fabric**) |
| 3 Choose thread | Swatches, only when initials are on | `embroidery_thread` metaobjects (name + colour) |
| 4 Initials | The existing Initials add-on, field and rules | `product_add_on` entry `initials` (unchanged) |
| 5 Review & cart | Line-by-line price, one total, optional gift box, Add to cart | Existing nested-line add (`addPersonalisedLine`) |
| Shopify cart / checkout / order | Parent product + nested paid lines with properties | Nested cart lines, Storefront API `2026-07` |

**Step order note.** The mockup asks for thread *before* initials. Thread
means nothing without letters, so the build asks **initials first, then
thread**, and skips thread when the shopper chooses no initials. The five
numbered steps stay five.

---

## 3. Data model

### New in Shopify (details in the Admin doc)

| Thing | Type | Holds |
| --- | --- | --- |
| **Solid Fabric**, **Block Printed Fabric** | Two hidden products, tag `kozy-addon`, SKUs `KOZY-ADDON-FABRIC-SOLID` / `KOZY-ADDON-FABRIC-BLOCK` | Each fabric's price. Tagged `kozy-addon`, so the existing reshape filters already keep them out of every listing, search and page. Two products rather than one with two variants, so each has its own line, price and SKU on the order and in sales reports. |
| `kit_builder_category` | Metaobject definition | `title`, `collection` (collection reference), `image` (file, optional), `sort_order`, `active` |
| `kit_fabric` | Metaobject definition | `title`, `description`, `swatch` (file), `variant` (variant reference, **required**: the charged fabric product), `sort_order`, `active` |
| `embroidery_thread` | Metaobject definition | `title`, `colour` (Color), `swatch` (file, optional), `sort_order`, `active` |
| `eye-masks`, `pouches` | Collections | Masks and pouches are in no collection today |

**Why the fabrics are not `product_add_on` entries.** That definition means
"offer this on every product page" (`apply_to_all`), its `kind` field is
regex-locked to `initials|gift_box` in Admin, and `getAddOns()` drops anything
else. The fabrics belong to the builder only. Putting them in their own
definition leaves the live add-on system untouched.

**Why categories point at collections.** No product has a product type today,
and the merchant already curates collections. A category is "this collection,
under this name, in this order", so Admin can move a product between
categories, or add one, without a code change. The existing **guard the
handle** rule applies: a category whose collection is gone is dropped, never
rendered empty.

### New in code

```ts
// lib/shopify/types.ts
type KitCategory = { id; title; collectionHandle; image?: Image; products: Product[] };
type KitFabric   = { id; handle; title; description; swatch?: Image;
                     variantId; price: Money; available: boolean };
type KitThread   = { id; handle; title; colour: string; swatch?: Image };
type KitBuilderData = { categories: KitCategory[]; fabrics: KitFabric[];
                        threads: KitThread[]; initials?: ProductAddOn; giftBox?: ProductAddOn };
```

- `queries/kit-builder.ts`: **one** query for the three metaobject types, with
  each category's collection products (`productCardFragment` plus `options`
  and `variants`). GraphQL `#` comments only (CLAUDE.md §6).
- `getKitBuilder()` in `lib/shopify/index.ts`: React `cache()`, standard TTL
  (60s in production), degrades to empty lists. New `reshapeKitCategory` /
  `reshapeKitFabric` / `reshapeKitThread` keep `active` entries with what they
  need. A fabric entry with no variant is dropped (there is nothing to
  charge). One whose variant is unavailable is shown greyed, not dropped, so
  the step never silently loses an option.
- House spelling: every title passes through the existing reshape choke
  points, so "Crafted" still becomes "Krafted".

---

## 4. The page

### Route and entry points

- **`/kit-builder`** (app route; it would shadow a Shopify page of the same
  handle, as `/b2b-enquiries` does).
- Entry points: a **menu link added in Admin** (there is no hard-coded nav,
  CLAUDE.md §4), and optionally a homepage band later. No homepage change in
  v1.
- All copy (headline, step names, helper lines, errors) goes in a new
  `kitBuilder` block in `site.ts`, written to the VOICE note: "Kompanion", rest
  and ritual, no "elevate". The mockup's wording is a starting point, not
  final copy.

### State: the URL, except the letters

Following the shop's rule (CLAUDE.md §6, *Shop URL state*), every choice except
the initials is in the URL, and every choice is a link:

```text
/kit-builder?category=<id>&product=<handle>&Size=M-L&Sleeve+Detail=...&fabric=<handle>&thread=<handle>
```

So the builder is server-rendered, shareable, back-button-correct and works
without JS up to step 4. **The initials stay in React state only**: personal
text, not shareable state (same reasoning as the product page).

Selecting the product in step 1 resets everything after it. Options reuse the
product page's `VariantSelector` conventions, and **`useSelectedVariant()`
remains the one resolver** for the price and the add (CLAUDE.md §6).

### Layout

- **`lg` and up:** two columns. Left: the five steps stacked as numbered
  sections, as in the mockup. Later steps are visible but inactive until the
  earlier ones are done. Right: a sticky preview `Plate` (the chosen product's
  photograph, then the embroidery preview) and the running price.
- **Below `lg`:** one column of collapsible steps, each summarising its choice
  when closed ("Fabric · Block Printed"), and a sticky bottom bar with the
  total and the primary action. That bar clears the existing mobile cart bar
  the way the newsletter teaser does (§12).
- Every image goes through `Plate` (CLAUDE.md §3); category tiles and product
  cards use the shop's card styles; buttons use `ActionButton`; swatches reuse
  the shop-by-colour swatch styles.
- Motion: only the first fold carries `data-reveal`. Step bodies mounted on
  a click use a CSS entrance, as the lookbook and mood index do.

### Step by step

1. **Kompanion.** Category tiles (from `kit_builder_category`), then that
   collection's products as cards with price and sold-out state, then the
   options. Sold-out variants are disabled, never hidden. A product with every
   variant sold out is shown dimmed and cannot be chosen.
2. **Fabric.** Two cards, Solid and Block Printed: swatch, name, description
   and each one's own price ("+ ₹500"). **Nothing is preselected**, because
   either choice is a charge. Tapping the chosen card again clears it, and a
   line under the cards says what no choice means ("Leave both unselected to
   keep the fabric as listed"). A card shows "currently unavailable" if its
   fabric product is off.
3. **Initials** (the mockup's step 4). A "No initials" / "Add initials · +₹499"
   choice, then the existing letters field: A-Z, NFKC-folded, uppercased as
   typed, `n / 6` counter, the entry's help text and **policy note**
   ("Personalised Kompanions can't be returned"). The input and rules are the
   ones in `add-on-picker.tsx` / `lib/shop/add-ons.ts`, extracted rather than
   copied.
4. **Thread** (the mockup's step 3), shown only with initials. Swatches from
   `embroidery_thread`; the first is preselected so the review is never
   incomplete. The preview draws the letters in the thread colour on a fabric
   plate, switching to an indigo plate for pale threads.
5. **Review.** Product, options, fabric, initials, thread, each with an
   *Edit* link back to its step; the optional gift box (the existing site-wide
   add-on); quantity; the price table (base · fabric · initials · gift box ·
   total); **Add to cart**.

The preview is **indicative**: it shows the chosen product's own photograph and
the letters set in type. The site has no photograph of each product in block
print, and the embroidered letterforms are the workshop's (see §9).

---

## 5. Adding to the cart

### Server action `addKitItem` (`components/cart/actions.ts`)

Payload: `{ productHandle, merchandiseId, quantity, fabric?, initials?: { text, thread }, giftBox? }`.
Nothing from the browser is trusted:

1. Re-read `getKitBuilder()` and `getAddOns()` on the server.
2. The variant must belong to `productHandle`, and that product must be in
   one of the **active categories' collections** (a forged handle is
   refused). The variant must be available.
3. `fabric`, when sent, must be an active `kit_fabric` whose variant is
   available. It becomes a child line charged at that variant's price, with
   `Fabric: Solid` or `Fabric: Block Printed`. No `fabric` means the product
   as listed, and no fabric line.
4. `initials.text` goes through the existing validation (`resolveAddOnLines`
   logic: NFKC, uppercase, `/^[A-Z]+$/`, `max_length`). `initials.thread` must
   be an active `embroidery_thread`; the initials child carries **two**
   properties: `Initials: PD` and `Thread: Gold`. A thread without initials is
   refused.
5. The gift box goes through the existing add-on resolution.
6. Parent attributes: `_kozy_line: <uuid>` (as today, so two personalised
   kits never merge) and `_kozy_source: kit-builder` (private, for the drawer
   badge and order filtering).
7. `addPersonalisedLine()` does the rest, unchanged: parent first, children
   nested by **line id**, per-unit quantities from the parent's *actual*
   quantity, and **rollback** of the parent if a child fails.

`addPersonalisedLine` today takes `ProductAddOn` objects. It needs only
`{ variantId, chargePerUnit }` plus attributes, so its parameter type narrows
to that and the fabric line (always per unit) fits without a second code
path.

A shopper who picks no fabric, no initials and no gift box has built a plain
product. That goes through the plain add (it merges with an identical plain
line), so the builder never creates a "personalised" line with nothing
personal on it.

### After the add

The drawer opens with the line flagged (`flagAdded`), as the product page's
Add to cart does. The builder **keeps its choices** so a second, different
kit is one edit away, and offers "Start a new kit" to reset.

### What already works with no change

- Drawer nesting, per-line totals, removing a single add-on, quantity
  changes syncing children, and the header count of products, not lines
  (CLAUDE.md §13).
- Changing the size in the drawer (`LineVariantSelect`) keeps the nested
  lines: measured on 2026-10-01, attributes and children survive a
  `merchandiseId` change.
- The packing slip and confirmation email print every non-`_` property, so
  `Thread: Gold` and `Fabric: Block Printed` appear without template changes.

### Small changes elsewhere

- `modal.tsx`: a "Kit" or "Kustom" label on lines with `_kozy_source:
  kit-builder` (the copy is the owner's call), and `visibleAttributes` already
  shows the second property on the initials line.
- `reshapeCart`: no change. A fabric line is a `kozy-addon` child like the
  others.

---

## 6. Edge cases

### Shopper side

| Case | Handling |
| --- | --- |
| Fabric chosen that the product already is (Block Printed on the Neelu robe, Solid on a waffle robe) | **Open, see §9.** Default: both fabrics are offered on every product and charged as chosen; the description on each card says what the fabric is. |
| Variant price differs by size (₹6,000 → ₹7,500) | Base price follows the selected variant through `useSelectedVariant()`, the same as `ProductPrice` |
| Sold-out size | Disabled in the picker. If stock clamps at add time, children follow the parent's real quantity (existing code). |
| Product sold out between page load and add | Server rejects it with a message; nothing is added |
| One fabric product drafted or unpublished | That card shows "currently unavailable"; the other still works; no fabric still works |
| Shopper skips the fabric step | Product as listed, no fabric line, no charge |
| Fabric price changed in Admin | Live in 60s; a cart already holding it is repriced by Shopify |
| Thread colour retired while chosen | Server rejects it; the step shows the remaining swatches |
| Initials ticked but empty, digits, emoji, more than 6 letters | Existing behaviour: filtered as typed, rejected by the server |
| Thread chosen, then initials turned off | Thread cleared and not sent |
| Shared builder link | Opens at the same product, options, fabric and thread; initials are empty by design |
| Unknown or removed product / category in the URL | That step resets with a short note; never a 404 for the whole page |
| Two kits of one product with different initials | Separate lines (`_kozy_line`) |
| Same build added twice | Two separate lines, not merged (as with personalised products today). Quantity is the way to buy two identical ones. |
| Removing the fabric line in the drawer | Allowed; the Kompanion goes back to its fabric as listed. The fabric exists only on the paid line, so the workshop never sees a fabric nobody paid for. |
| Quantity 2 | Fabric, initials and gift box all go to 2 (per unit) |
| No JS | Steps 1-3 work as links; the letters field and Add to cart need JS, as on the product page |
| Discount code "Entire order" | Also discounts the fabric lines. See Admin doc, Step 8. |

### Admin side

| Case | Handling |
| --- | --- |
| Storefronts access off on a new definition | That part of the builder disappears (categories → no builder; fabrics → no fabric step; threads → no thread step). First thing to check. |
| A category's collection deleted or renamed | Category dropped (handle guard) |
| A product in two categories (e.g. a ritual kit also in Bathrobes) | Shown in both; harmless |
| A fabric product put in a collection | Still hidden everywhere by the `kozy-addon` tag |
| Someone adds a fabric line without a product via the public API | Paid and harmless; Flow can flag an order with a `KOZY-ADDON-FABRIC-*` SKU but no parent |
| Staff edit or draft orders | Nesting is not kept there (platform limit); staff add the SKU and type the property, as with initials |

---

## 7. Work breakdown

| Phase | Work | Estimate |
| --- | --- | --- |
| 0 | Admin setup (Admin doc), then verify it from code through the Storefront API (as in the add-ons doc §7) | Admin: 1-2 h |
| 1 | Types, query, reshapes, `getKitBuilder()` | 0.5 day |
| 2 | `addKitItem`, narrowing `addPersonalisedLine`, extracting the initials input from `add-on-picker.tsx` | 0.5 day |
| 3 | `/kit-builder` page: steps, URL state, preview, price table, mobile bar, `site.ts` copy | 1.5-2 days |
| 4 | Drawer label, loading skeleton, metadata, sitemap entry | 0.25 day |
| 5 | Verification (below) and CLAUDE.md §14 | 0.5 day |

### Verification

- Playwright on `next dev`, following CLAUDE.md §9 (curtain wait, newsletter
  suppressed, viewport cookie), across the full breakpoint sweep with the
  `scrollWidth === clientWidth` check.
- Against the live cart API: each combination (plain; each fabric alone; initials +
  thread; all + gift box; quantity 2; size change in the drawer; remove the
  fabric line; remove the parent) leaves the expected lines and properties.
- **One real test order** (payments in test mode or a 100% code): checkout
  nesting, Admin order, `fabric-block-printed` + `personalised` tags, the email, and
  the packing slip showing `Thread:` and `Fabric:`. Then cancel and refund.
  This can share the still-pending add-ons test order (add-ons doc, Phase 5).

### Files

| File | Change |
| --- | --- |
| `src/lib/shopify/queries/kit-builder.ts` (new) | the three metaobject types and category products |
| `src/lib/shopify/index.ts`, `types.ts` | reshapes, `getKitBuilder()`, kit types |
| `src/components/cart/actions.ts` | `addKitItem`; `addPersonalisedLine` param narrowed |
| `src/components/kit-builder/*` (new) | steps, preview, price table, mobile bar |
| `src/components/product/add-on-picker.tsx` | extract the initials field for reuse |
| `src/app/kit-builder/page.tsx`, `loading.tsx` (new) | the route |
| `src/components/cart/modal.tsx` | builder label |
| `src/app/sitemap.ts` | add the route |
| `src/lib/site.ts` | `kitBuilder` copy |
| `src/app/globals.css` | builder layout classes (`grid-template-areas` for the reorder, CLAUDE.md §11) |
| `CLAUDE.md` | new §14 |

---

## 8. Not in scope

- One merged line in Shopify checkout (needs Plus; §1).
- Assembling several products into one kit (decision 1).
- A photograph of each product in block print, or a true-to-stitch embroidery
  render.
- Editing initials in place in the drawer (remove and re-add, as today).
- Buy now from the builder. `buyNow` already handles nested add-ons, so this
  is a small addition later if wanted.

---

## 9. Open questions (defaults are what will be built if unanswered)

1. **A fabric the product already is.** The Neelu and Tulsi robes and kits
   are Dabu block printed already, and the Kessentials robes are solid
   waffle. If a shopper picks *Block Printed* on the Neelu robe, is that a
   different block print (charged), or should that card be hidden for it?
   *Default:* both fabrics are offered on every product and charged as
   chosen. *Alternative:* tag each product with its own fabric in Admin
   (`fabric-solid` / `fabric-block-printed`) and the builder hides the
   matching card.
2. **Thread colours.** *Default:* free, the six in the mockup (gold, silver,
   black, brown, navy, pink), edited in Admin. Please confirm the real thread
   names the workshop stocks.
3. **Letterforms in the preview.** What do stitched initials actually look
   like? *Default:* set in the display face with a "letterforms are
   hand-embroidered and will vary" line under the preview. A photograph of
   real stitched initials would let the preview match.
4. **Which ritual kits.** You named the **Kessentials** ritual kit collection.
   The Krafted ritual kits (Neelu, Tulsi, The Ritual Companion Set) also
   appear through Bathrobes. *Default:* the Ritual Kit category points at
   `kessentials-ritual-kit`; switching it to `ritual-kits` is an Admin edit.
5. **Fabric prices by category.** *Default:* each fabric has one price,
   whatever the product (₹X for Solid, ₹Y for Block Printed, both set in
   Admin). If a robe's fabric should cost more than a pouch's, that needs one
   fabric product per price and a category on each `kit_fabric` entry (a
   small change to the model). **Please send the two prices.**
6. **Lead time.** The initials help text says "Adds 5-7 days". Does making a
   Kompanion in a chosen fabric add more? *Default:* the fabric card says nothing about time until
   told.
