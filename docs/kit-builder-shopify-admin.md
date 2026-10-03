# Kit Builder: Shopify Admin setup

What to do in Shopify Admin so the Kit Builder page can work. Everything here
is free on the **Basic** plan. No app to install, nothing to pay for.

The code plan is in `docs/kit-builder.md`. The initials and gift box from the
existing add-ons are **reused as they are**; their setup
(`docs/personalisation-add-ons.md`) is already done and does not change.

**Time needed:** about 1-2 hours, most of it Step 4.

**Status (2026-10-04):** not started.

---

## Progress

- [ ] Step 1 — Two fabric products (Solid, Block Printed)
- [ ] Step 2 — Eye mask and pouch collections
- [ ] Step 3 — Three metaobject definitions
- [ ] Step 4 — Entries: categories, fabrics, threads
- [ ] Step 5 — Tag each product's own fabric *(only if decided; see Step 5)*
- [ ] Step 6 — Shopify Flow: one more order tag
- [ ] Step 7 — Menu link
- [ ] Step 8 — Check discount codes
- [ ] Step 9 — Clean up two leftover products
- [ ] Step 10 — Product data fixes *(recommended, not blocking)*
- [ ] Step 11 — Test order *(after the code is live)*

Steps 1-4 must be done before the page can be built against real data. The
rest can follow.

---

## Step 1 — Two fabric products

Both fabric choices in the builder are **paid**. Picking *Solid* or *Block
Printed* adds that fabric's price on top of the product's price. A shopper who
picks neither gets the product as listed, at no extra charge.

Each fabric is a hidden product. That is what Shopify charges, and it is what
appears on the order, indented under the Kompanion. Set both up exactly like
the existing **Personalised Initials** product.

**Products → Add product**, twice:

| Field | Solid fabric | Block printed fabric |
| --- | --- | --- |
| Title | Solid Fabric | Block Printed Fabric |
| Description | *(empty; shoppers never see these pages)* | *(empty)* |
| Price | **₹ to confirm** | ₹500 in the mockup; **confirm** |
| SKU | `KOZY-ADDON-FABRIC-SOLID` | `KOZY-ADDON-FABRIC-BLOCK` |
| Inventory | Not tracked | Not tracked |
| Physical product | **On**, weight 0 | **On**, weight 0 |
| Tags | `kozy-addon` | `kozy-addon` |
| Collections | **None** | **None** |
| Status | Active | Active |
| Sales channels | The one the website uses only. **Not** Online Store, Google or Meta. | Same |
| Image | A close-up of the solid fabric | A close-up of the Dabu block print |

- **Two products, not one product with two variants**, so each fabric has its
  own SKU, its own line on the order and its own row in sales reports.
- **The tag `kozy-addon` is what hides them** from shop pages, search and
  recommendations. Without it they would show up as Kompanions.
- **Physical product stays on** so the line stays on the packing slip; at 0 g
  it does not change shipping.
- **Tax:** ask the CA for the GST rate and HSN code; the HSN code goes in
  *Shipping → HS Code*.
- **Never rename the SKUs.** The order tags in Step 6 depend on them.

---

## Step 2 — Eye mask and pouch collections

Today the eye mask and the pouch are in **no collection**, so the builder has
nothing to list for those two tiles.

**Products → Collections → Create collection**, type **Manual**:

| Title | Handle | Products |
| --- | --- | --- |
| Eye Masks | `eye-masks` | Polka Eye Mask |
| Pouches | `pouches` | Kloud Pouch & Mask - sunshine oversized |

- `Kloud Pouch & Mask` is a mask **and** pouch sold together. Put it under
  Pouches, or in both if you prefer; both work.
- Make the handles **exactly** as above, or note the ones you used for Step 4.
- Publish both to the website's sales channel. They also become normal shop
  pages (`/search/eye-masks`), which is fine.

The other three categories use collections that already exist:
`kessentials-ritual-kit`, `bathrobes`, `slippers`.

---

## Step 3 — Three metaobject definitions

**Settings → Custom data → Metaobject definitions → Add definition**, three
times.

For **each** of the three, under *Options*:

- **Active-draft status: on** (entries must be set to Active).
- **Storefronts API access: on.** ⚠️ Without this the website sees nothing.
  It is the first thing to check if the builder is empty.
- Translations on; everything else off.

Field **keys** must match exactly (the key is set when you create the field).
A field's type can't be changed later, and renaming a field does **not**
change its key. To fix either, delete the field, save, and add it again.

### 3a. "Kit builder category" (type `kit_builder_category`)

The tiles in step 1. Display name: **Title**.

| Name | Key | Type | Notes |
| --- | --- | --- | --- |
| Title | `title` | Single line text | What the tile says, e.g. "Ritual Kit" |
| Collection | `collection` | Collection (one) | Which products the tile opens |
| Image | `image` | File (images only) | Optional; the tile's picture |
| Sort order | `sort_order` | Integer | 1 = first |
| Active | `active` | True or false | Off hides the tile |

### 3b. "Kit fabric" (type `kit_fabric`)

The two fabric cards in step 2. Display name: **Title**.

| Name | Key | Type | Notes |
| --- | --- | --- | --- |
| Title | `title` | Single line text | "Solid", "Block Printed". Also what prints on the order: `Fabric: Solid` |
| Description | `description` | Multi-line text | One or two lines under the name |
| Swatch | `swatch` | File (images only) | A close-up of the fabric |
| Variant | `variant` | Product variant (one) | The fabric product from Step 1. **Required**: an entry without it is not shown. |
| Sort order | `sort_order` | Integer | |
| Active | `active` | True or false | |

### 3c. "Embroidery thread" (type `embroidery_thread`)

The swatches in the thread step. Display name: **Title**.

| Name | Key | Type | Notes |
| --- | --- | --- | --- |
| Title | `title` | Single line text | What prints on the order: `Thread: Gold` |
| Colour | `colour` | Color | The swatch colour on screen |
| Swatch | `swatch` | File (images only) | Optional photo of the real thread; used instead of the flat colour |
| Sort order | `sort_order` | Integer | 1 is preselected |
| Active | `active` | True or false | Off when that thread runs out |

---

## Step 4 — Entries

**Content → Metaobjects**, choose the definition, **Add entry**. Set each
entry's status to **Active** before saving.

### Kit builder category (5 entries)

| Title | Collection | Sort order | Active |
| --- | --- | --- | --- |
| Ritual Kit | Kessentials Ritual kit | 1 | true |
| Bathrobe | Bathrobes | 2 | true |
| Slipper | Slippers | 3 | true |
| Eye Mask | Eye Masks *(Step 2)* | 4 | true |
| Pouch | Pouches *(Step 2)* | 5 | true |

To include the Krafted ritual kits as well, point *Ritual Kit* at **Ritual
Kits** (all kits) instead of *Kessentials Ritual kit*.

### Kit fabric (2 entries)

| Title | Variant | Sort order | Active |
| --- | --- | --- | --- |
| Solid | Solid Fabric *(Step 1)* | 1 | true |
| Block Printed | Block Printed Fabric *(Step 1)* | 2 | true |

The **handle** of each entry (shown under the title) appears in the builder's
web address. Keep them as `solid` and `block-printed`.

### Embroidery thread (one entry per thread)

The six in the mockup, as a starting point. **Replace with the threads the
workshop really stocks, using their real names.**

| Title | Colour | Sort order |
| --- | --- | --- |
| Gold | `#C9A227` | 1 |
| Silver | `#BFC1C2` | 2 |
| Black | `#1F1F1F` | 3 |
| Brown | `#7A4A2A` | 4 |
| Navy | `#23324B` | 5 |
| Pink | `#E7A1A0` | 6 |

The title is what the workshop reads on the order, so use the name they use
when picking the thread.

---

## Step 5 — Tag each product's own fabric ⏸

*Only if decided (`docs/kit-builder.md` §9, question 1). By default nothing
is needed here.*

By default both fabric cards are offered on every product and charged as
chosen. Some products already *are* one of the two fabrics: the Neelu and
Tulsi robes and kits are Dabu block printed, and the Kessentials waffle robes
are solid. If the builder should **hide** the card for the fabric a product
already is, tag each product in the builder with its own fabric:

| Tag | Products (in the builder's categories) |
| --- | --- |
| `fabric-block-printed` | Neelu Indigo Ritual Robe, Tulsi Ritual Robe, Neelu Indigo Ritual Kit, Tulsi Ritual Kit, The Ritual Companion Set, and any block-printed slipper (e.g. *Kloud Komfort Slipper - Indigo Flow Print*) |
| `fabric-solid` | The solid waffle robes, kits and slippers |

A product with neither tag shows both cards.

---

## Step 6 — Shopify Flow: tag orders by fabric

The workflow built for the add-ons already tags `personalised` and
`gift-box`. Add two more conditions to it:

1. **Apps → Flow →** the existing *Order created* workflow → **Edit**.
2. **Add condition:** *Order → Line items → SKU*, **at least one** item **is
   equal to** `KOZY-ADDON-FABRIC-SOLID` → **Then** *Add order tags*
   `fabric-solid`.
3. **Add condition:** SKU **is equal to** `KOZY-ADDON-FABRIC-BLOCK` →
   *Add order tags* `fabric-block-printed`.
4. **Optional:** if the condition picker offers *Line items → Custom
   attributes*, add: key **is equal to** `_kozy_source` and value **is equal
   to** `kit-builder` → *Add order tags* `kit-builder`. If it does not offer
   it, skip this. Builder orders are still recognisable by their lines.
5. Save; make sure the workflow is **on**.

After the first order, save Orders views filtered by each tag, e.g. "Solid
fabric" and "To block print".

**The packing slip needs no change.** The snippet added for initials prints
every line property, so `Fabric: Block Printed` and `Thread: Gold` appear
automatically. Check it on the test order (Step 11).

---

## Step 7 — Menu link

There is no hard-coded menu on the website; it reads **Online Store →
Navigation → main-menu**.

- **Add menu item:** name it as you like (the copy is yours, e.g. "Build your
  Kit"), link **`/kit-builder`**. Choose *Web address* and type the path.
- Do this **after the code is live**, or the link opens a "page not found".

---

## Step 8 — Check discount codes

A code that applies to the **Entire order** also discounts the fabric lines,
just as it already discounts initials and gift boxes. If the fabrics should
always be full price, set those codes to **Specific collections** and pick the
product collections. The fabric products, like the other add-ons, are in no
collection.

---

## Step 9 — Clean up two leftover products

Both look like remains of an earlier attempt at a customiser.

| Product | What it is | Do |
| --- | --- | --- |
| `__Customized-Items` (₹1) | The hidden product a third-party **Product Options** app creates. Its description says so. | If that app is still installed (**Apps**), uninstall it, then delete this product. The headless site can't use it. |
| `Kustom Kozy Kit` (₹0, type `custom`, 8 in stock) | Unknown. ⚠️ **It is live on the website**: it has no hidden tag, so it shows up in search as a ₹0 Kompanion. | If unused: set it to **Draft**. If it's still needed but must not be listed, add the tag `nextjs-frontend-hidden`. |

---

## Step 10 — Product data fixes (recommended, not blocking)

The builder shows each product's real options, so these will be visible to
shoppers there, as they already are on the product pages.

| Product | Problem | Suggested fix |
| --- | --- | --- |
| Milk Froth Kessentials Kit - scallop (`milk-froth-kit-ritual-kit`) | ₹1,499 for a kit whose description includes a robe. It has **two** slipper options: "Slipper size" with one value (UK 3-4) and "Slipper" with UK 5-6 to 11-12. | Check the price; merge into one slipper size option |
| Milk Froth Kessentials Kit (`milk-froth-kessentials-kit`) | Sold out, ₹1,499 | Restock or set to Draft |
| Neelu Indigo Ritual Kit | Option value "Attached **Srunchie** Detail"; every Blue Belt variant is sold out | Fix the spelling; hide Blue Belt if discontinued |
| Neelu Kloud Slippers | Sizes `uk-3-4 / uk-5-6 / uk-6-7 / uk-9-10 / uk-11-12`: 6-7 overlaps 5-6 and 7-8 is missing | Match the other slippers: UK 3-4 … UK 11-12 |
| Polka Shine Slipper | Sizes `uk-3-4 / uk-4-5 / uk-5-6 / uk-6-7 / uk-8-9` | Same |
| Kloud Komfort Slipper - Indigo Flow Print | Sizes without "UK" (`3-4` …) | Same |
| Several robes | Sizes in lowercase (`s-m`) on some products, uppercase on others; the sleeve option is named five different ways ("Sleeve Detail", "Sleeve Style", "sleeve", "Sleeve Details") | Pick one spelling for each |
| Every product | **No variant has a SKU** | Optional, but SKUs make the workshop's and courier's lists far easier to read |

---

## Step 11 — Test order (after the code is live)

This can be the same order as the add-ons' pending test order.

1. Payments in test mode (**Settings → Payments**), or a 100%-off discount
   code.
2. In the Kit Builder, two Kompanions in one order:
   - a ritual kit, **Block Printed**, initials `PD`, thread **Gold**, a gift
     box;
   - a slipper, **Solid**, no initials.

   Add both to the cart → checkout → place the order.
3. Check:
   - checkout shows each fabric line, the initials and the gift box
     **indented under** their Kompanion;
   - **Orders →** the same nesting, with `Fabric: Block Printed`,
     `Fabric: Solid`, `Initials: PD`, `Thread: Gold`;
   - tags `fabric-block-printed`, `fabric-solid`, `personalised` and
     `gift-box` (Step 6);
   - the confirmation email lists the properties;
   - the packing slip prints them.
4. Save the Orders views (Step 6).
5. Cancel and refund the test order.

---

## Afterwards: what Admin controls

| To… | Do this in Admin |
| --- | --- |
| Change a fabric's price | Edit that fabric product's price (Solid Fabric / Block Printed Fabric). Live within a minute. |
| Stop offering a fabric | Set that *Kit fabric* entry's Active to false. With both off, the fabric step disappears. |
| Add, rename or retire a thread | Add an Embroidery thread entry, or set Active false when it runs out |
| Add a product to the builder | Add it to the category's collection |
| Add a category | New collection + new Kit builder category entry |
| Reorder tiles, fabrics or threads | Change *Sort order* |
| Change the initials price or letter limit | The existing **Add Your Initials** entry and product (shared with the product pages) |

## Don't

- Put either fabric product in any collection or menu, or publish it to
  Online Store, Google or Meta.
- Remove the `kozy-addon` tag from either.
- Rename the SKUs `KOZY-ADDON-FABRIC-SOLID` / `KOZY-ADDON-FABRIC-BLOCK`.
- Turn off Storefronts API access on any of the three definitions.
- Rename a category's collection **handle** without updating that category
  entry (the tile disappears).
