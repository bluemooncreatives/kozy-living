# CLAUDE.md — Kozy Living storefront

**Read this file before starting any work in this repo.** It records the things
that are not recoverable from reading the code quickly: the design system's
hard rules, which copy is ours and which is the merchant's, the motion layer's
timing constraints, and the handful of traps that silently produce a wrong
result rather than an error.

When you change something this file describes, update this file in the same
pass.

---

## 1. What this is

A headless Shopify storefront for **Kozy Living** — a craft-led Indian textile
brand. Not furniture, not lighting, not homeware generally: **textiles**.
Cotton waffle weave, slub cotton, percale, linen blends and wool, designed
in-house and made with craft clusters across India, finished with traditional
Dabu hand-block printing.

|  |  |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind 3.4 + a large hand-written `@layer components` in `globals.css` |
| Commerce | Shopify Storefront GraphQL API (`/api/2026-07/graphql.json`) |
| Motion | GSAP + ScrollTrigger, Lenis smooth scroll |
| Commands | `npm run dev` · `npm run build` · `npm run lint` |

> ⚠️ **`README.md` is stale and actively misleading.** It describes a previous
> incarnation of this project: a "Warm Ivory Oat / Terracotta / Amber Glow"
> palette, "artisanal furniture and warm ambient lighting", and FSC timber
> claims. None of that is true any more. Trust **this** file and
> `src/app/globals.css` for the design system, and `src/lib/site.ts` for the
> brand. Do not use the README as a source.

---

## 2. Brand voice — non-negotiable

Read the VOICE note at the top of `src/lib/site.ts` before writing any copy.

- **"Kompanions"**, not products, pieces or items.
- **"Krafted" with a K** is the house spelling of the branded verb. Never
  "correct" it to a C. See §6 for how this is enforced on merchant data.
  - The ordinary English word is still ordinary: "craft clusters",
    "craft-led", "handcrafted", "Craft Technique" are all correct as written.
    Only the standalone word *crafted* takes the K.
- Rest, ritual and intention. **Not** luxury, indulgence or "elevate".
- **Never invent social proof, certifications or figures.** This has been a
  real problem here: earlier copy carried an invented "4.9 / 2,400+ homes
  styled" star rating, FSC/OEKO-TEX/Fair Trade badges the brand has not
  claimed, a fabricated company timeline, and a four-person leadership team
  that does not exist. All were removed. `whyKraft.stats` now reads
  `100%` / `Dabu` / `In-House` / `Surplus` — mostly words rather than invented
  percentages, and every figure is a claim the brand actually makes.
- Unverified values are marked `TODO(brand)` in `site.ts` — placeholders that
  keep a surface from rendering empty. Do not present them as fact.
- The only named individual is the founder, **Khushi Faruqi** (Textile Design,
  NIFT Delhi). The only confirmed contact channel is Instagram
  `@kozyliving_`. Phone, email and studio address in `site.ts` are marked
  `TODO(brand)` and are **not** verified.

---

## 3. Design system

Full derivation lives in the comment block at the top of `src/app/globals.css`.
The essentials:

### Palette — four colours plus derived shades

| Token | Hex | Job |
| --- | --- | --- |
| `indigo` / `ink` / `coal` | `#23324B` | Type, wordmarks, dark panels, buttons |
| `cream` / `paper` | `#FFF6EB` | The page ground |
| `ivory` / `card` | `#F6F4F0` | Card and panel surfaces |
| `oat` / `tint` | `#E8D9C4` | Image plates, tints, type on dark |
| `sage` | `#A9BDAF` | The accent: seal, chips, statement fills |
| `sage-deep` | `#5F7178` | Hover, and small sage type on light |
| `sage-wash` | `#DBE1D9` | Soft fills |
| `muted` | `#5E6879` | Secondary copy (5.26 on cream) |

Cream is the ground and ivory the card, **not** the other way round. They sit
1.027 apart, and that sliver is what lets a rounded card read as a surface with
no border.

**ONE HARD RULE: oat against sage measures 1.43.** They may sit beside each
other as blocks; neither may ever carry type on the other.

Measured pairs in use: indigo/cream 12.05 · indigo/ivory 11.73 · indigo/oat
9.30 · oat/indigo 9.30 · sage/indigo 6.50 · indigo/sage 6.50 · sage-deep/cream
4.77 · muted/cream 5.26.

Flat `sage` measures **1.85 on cream** — it disappears on light grounds. Sage
type is only allowed on indigo. On cream use `sage-deep`.

### Type — two faces, two jobs

- **Franxurter** (`--font-display`, `.display-face`, `.wordmark`) — the display
  face. **Single weight.** Never apply a bold utility to it; the browser
  synthesises one and it is immediately visible at hero scale. This is why the
  `text-display-*` size utilities deliberately carry **no** `fontWeight`.
  **It has no italic.**
- **Plus Jakarta Sans** (`--font-ui`, `.serif`, `.body-mono`, `.ui-mono`, …) —
  everything else: nav, buttons, labels, body, product titles, captions, and
  every heading below `display-lg`. It ships a **real italic** variable font,
  so any italic emphasis must live on this face.

`.serif` is a legacy name. It is the **UI face at bold**, not a serif.

### Reusable classes (all in `globals.css`)

Layout `.shell` `.shell-tight` `.rule-x/y/t/b` ·
Type `.eyebrow` `.body-mono` `.ui-mono` `.spec-mono` `.micro-mono` `.serif`
`.display-face` `.wordmark` `.on-dark` ·
Controls `.btn-solid` `.btn-outline` `.btn-sage` `.action-btn(-solid/-glass)`
`.circle-btn` `.arrow-btn` `.link-arrow` `.chip` `.pill` `.badge` `.field-bare` ·
Surfaces `.plate` `.panel` `.panel-ink` `.panel-sage` `.panel-sage-wash`
`.glass` `.notch-tr` ·
Motion `.marquee-track` `.seal` `.seal-ring` `.rail`

**Prefer these over new one-off utilities.** Several are load-bearing geometry,
not convenience:

- `.notch-tr` is three tangent arcs composed as mask layers, sized to receive
  an `.arrow-btn` exactly. Do not replace it with a radial-gradient.
- A mask applies to an element *and its descendants*, which is why the corner
  arrow is a **sibling** of the masked plate, never a child.
- `.rail` sets `scroll-padding-inline: var(--gutter)` so the first cell lands
  on the page grid rather than flush to the screen edge.

### The social card renders outside the browser

`src/components/opengraph-image.tsx` has no access to `globals.css` or to
`next/font`, so it repeats the palette by hand - which is exactly how it spent
months drawn in the *previous* project's colours (espresso ground, amber
accent) with the title set in a generic `serif` this brand does not own.
`.serif` here is the UI face at bold, not a serif, which is very likely how
that got in. It is now indigo / oat / sage, set in Franxurter.

**`next/og` cannot use Plus Jakarta Sans.** It rasterises through satori,
which parses fonts with opentype and does not handle **variable** fonts -
handing it one fails deep in the parser and, because the image is streamed,
surfaces as a 500 on the route rather than as a catchable error. Both Jakarta
files here are variable. `staticFont()` in that file reads the sfnt table
directory and refuses anything carrying `fvar`, so a variable face degrades to
the default rather than taking the route down.

If you touch the palette, these two files do not follow automatically:
`src/components/opengraph-image.tsx` and `src/app/manifest.ts` (whose
`theme_color` tints the browser chrome on Android).

### Signature motifs

The giant lowercase `.wordmark` bleeding past its frame · the rotating sage
`.seal` (only over the hero wordmark, the closing CTA, and as back-to-top) ·
the hand-drawn ellipse `CircledWord` · the `.arrow-btn` parked in a notched
card corner · the `Plate` photographic card.

`Plate` (`src/components/ui/plate.tsx`) is the single funnel for **every**
image on the site — radius, notch, corner arrow, caption, scrim and the toned
placeholder all live there. `src` is optional on purpose: without one it
renders a designed oat placeholder carrying the plate's label as ghost display
type, so a missing shoot reads as a graphic panel rather than a broken image.

---

## 4. Content model — know which half you are editing

**Roughly half the words on this storefront are not in this repo.**

| Source | What it holds |
| --- | --- |
| `src/lib/site.ts` | All editorial/marketing copy. Hero, statements, lookbook, about page, FAQ, footer, newsletter, the homepage story band. One file so the voice can be revised in one pass. |
| **Shopify Admin** | Product titles and descriptions, collection titles and descriptions, **the entire navigation menu**, blog articles, images, prices, colour metaobjects. |

**There is deliberately no hard-coded nav in this repo.** The header, mobile
drawer, search overlay and homepage category rail all read the Shopify menu via
`getPrimaryMenu()`, which tries `NEXT_PUBLIC_SHOPIFY_MENU_HANDLE`, then
`main-menu`, then `kozy-living-menu` (this store uses `main-menu`). A
hard-coded fallback list silently replaced the real menu for months and shipped
links to collection handles the store never had — do not reintroduce one.

### Handles vs titles

A **handle** is an identifier that appears in URLs and in Shopify lookups. A
**title** is copy. Never rewrite a handle in code to fix a spelling — the
lookup will 404. Handles are renamed in Shopify Admin, with a redirect.

---

## 5. Homepage section order

`src/app/page.tsx`. Sections are mostly `Suspense`-streamed server components.

```text
Hero (bento + wordmark band)
BoldStatement (+ staggered lookbook)
StandardsTicker
CollectionShowcase        ← Suspense
CollectionFilters         ← Suspense
Bestsellers               ← Suspense
ShopByColour              ← Suspense
ExperienceBand
MaterialStrip
StoryBand  ("Our story")  ← Suspense   ★ added in this session
Testimonial
RestTicker
CuratedEdits              ← Suspense
Spotlight                 ← Suspense
Guides
Journal                   ← Suspense
StandardsTicker (reverse)
ClosingBand
```

The story band sits where it does on purpose: the material strip names the
fibres, the band says who works them and why, and the quote that follows is the
studio's own line. The hairline strip above it also keeps the band off the back
of the experience band's photography.

---

## 6. The Shopify layer

`src/lib/shopify/index.ts`. Everything from the API passes through a
`reshape*` function on the way in — these are the choke points, and the right
place to add anything that must apply site-wide:

`reshapeProduct` · `reshapeCatalogProduct` · `reshapeCollection` ·
`reshapeMenuItem` · `reshapeArticle` · `reshapeCart` · `reshapeImages`

### House spelling normalisation

`src/lib/shopify/house-spelling.ts` enforces **Krafted-with-a-K** on merchant
copy as it crosses into the app, applied at the reshape choke points above.

This exists because the spelling problem is in **Shopify data, not the code**.
The store carries a collection titled `Crafted by Kozy bathrobes` one click
away in the nav from `Krafted by Kozy`. Normalising centrally covers the shop
heading, breadcrumb, nav, search results, cards and the `<title>` sent to
Google in one rule.

There are **two** rules, both narrow and case-preserving:

```text
Crafted      → Krafted     crafted → krafted     CRAFTED → KRAFTED
Pet Collection → Pet Kollection  (only after "Pet", only as whole words)

untouched: handcrafted · hand-crafted · craft · craft clusters ·
           Craft Technique · "this collection is empty" · carpet collection ·
           Pet Collections · handles like crafted-by-kozy and pet-collection
```

The bare noun is never touched. "Kollection" is the name of one shelf, not a
replacement for a word the storefront's own chrome says constantly.

Applied at every reshape choke point, **including the nested `collections`
array on a product** — those titles travel with the product and get rendered
downstream as badges and labels, and they were missed on the first pass.

### Known Shopify data defects (fix in Admin, not in code)

- Handles still read `crafted-by-kozy` and `kozy-by-crafted-bathrobes` — these
  show in the address bar. The second is also scrambled (`kozy-by-crafted`
  rather than `krafted-by-kozy`). Renaming needs a Shopify redirect, and
  `KRAFTED_BY_KOZY_COLLECTION_HANDLE` in
  `src/components/product/product-description.tsx` must be updated to match.
- Collection `slippers-copy-1` is titled `Krafted by  kozy Slippers` — double
  space, lowercase k.
- In `main-menu`, **Krafted by Kozy → Slippers** points at
  `/collections/crafted-by-kozy` (the parent) rather than at the slippers
  collection.
- Collections `kozy-lounge` and `blend` do not exist; `popular` does not
  exist. Code that references them already falls back — see below.

### Guard the handle, always

This storefront **404s an unknown collection** (a typo must not render as "this
collection is empty"). So any hard-coded handle must be checked before it
becomes a link:

```ts
const live = new Set((await getCollections().catch(() => [])).map(c => c.handle));
href = live.has(handle) ? `/search/${handle}` : fallbackHref;
```

`BoldStatement`, `HeroProductTiles` and `StoryBand` all do this. Keep it.

### Image sizing — set once, in the fragment

`src/lib/shopify/fragments/image.ts` is the single choke point every image URL
passes through, and it carries
`url(transform: { maxWidth: 2048, preferredContentType: WEBP })`.

This is not a nicety. The originals on this store are enormous — a product
shot measured 3375x4219 and **9.44 MB** — and Next's optimiser has to download
the whole file before it can resize it, once per width variant. A product page
asks for a dozen of those at several widths, the optimiser gives up at 7s, and
the page fills with `/_next/image … 500` and broken frames. Shopify's own CDN
does that first resize in about a second instead.

Both arguments are load-bearing: capping alone left PNGs as PNGs, and a 2048px
PNG of a photograph is still 6.55 MB. WEBP rather than JPG because these
images have alpha.

`fragments/cart.ts` spells its image fields out instead of spreading this
fragment, so it repeats the cap at 512 (a cart thumb renders at ~64px). If you
add another place that selects `Image.url` by hand, cap it there too.

⚠️ **Comments inside these fragments must be GraphQL `#` comments.** They live
inside a JS template literal, and a `/* */` comment containing backticks
closes the string early — which is a parse error that points at the wrong
line.

⚠️ `width` and `height` still describe the **original**, not the transformed
URL. Nothing reads them today — every surface renders through `next/image`
with `fill` — but do not assume they match the bytes you fetched.

### Shop URL state

`src/lib/shop/filters.ts` — **every** piece of shop state (collection, query,
sort, each facet, price band, page) lives in the URL and nowhere else. A filter
is a link, not a click handler. That is what makes the shop server-rendered,
shareable, back-button-correct and functional without JS. Do not move shop
state into React state.

---

## 7. Motion — and the rules that keep breaking

`src/components/motion/motion-provider.tsx` drives motion from **data
attributes scanned from the DOM**, not from wrapper components:

```text
data-reveal         fade + rise on enter
data-reveal-group   stagger this element's children instead
data-magnetic       leans toward the cursor (fine pointers only)
data-parallax       drifts against scroll, for large photography
```

Reveal targets start hidden **in CSS**, under `prefers-reduced-motion:
no-preference`, so the hidden state is correct before first paint with no class
on `<html>`. A head-script watchdog force-shows everything if the motion layer
never reports in — a JS failure degrades to an unanimated page, never a blank
one.

### ⚠️ Rule 1 — never put `data-reveal` inside a `Suspense` boundary

Streamed HTML is in the DOM before React hydrates it. The DOM-scanning motion
layer can reach that node in the gap and write inline styles React never
rendered — a genuine hydration mismatch, after which the tree is not patched.

This has bitten twice. `Spotlight` passes `reveal={false}` for this reason.
**If a streamed section needs an entrance, run it from inside a client
component with `useGSAP`** (post-hydration by construction) and ship the markup
visible so a GSAP failure costs the animation, not the content.
`StoryBoard` is the worked example, including the "already on screen, don't
hide it now" guard.

### Rule 2 — the DOM is watched, not scanned once

Suspense boundaries resolve after the first pass. A `MutationObserver`
re-scans, coalesced to one pass per frame. An element hidden by CSS but never
claimed by a trigger stays at `opacity: 0` forever — i.e. a whole product rail
silently missing.

Also: the reveal's **translate** is disabled on touch devices (fade only), so a
rail does not travel under the finger that is scrolling it.

### Rule 3 — bootstrap scripts go through `next/script`

A bare `<script>` in a component tree only ever executes from the
server-rendered HTML — React does not run one it renders on the client — and
React 19 warns about exactly that ("Encountered a script tag while rendering
React component"). The two bootstrap scripts in `layout.tsx` (the motion
watchdog and the viewport-cookie sync) use `next/script` with
`strategy="beforeInteractive"` and a stable `id`. The JSON-LD block stays a
raw `<script>` because it is data, not code.

### Draw-on SVG strokes — do not use `getTotalLength()`

`CircledWord` (the hand-drawn ellipse) stretches a `0 0 200 60` viewBox to the
word's box with `preserveAspectRatio="none"`, and carries
`vector-effect: non-scaling-stroke`. That combination means the browser
generates the stroke — **dashes included** — in *screen* space, while
`getTotalLength()` reports *user* space. Around a long phrase those were 388 vs
660, so the ring drew ~60% of the way round and left the last word outside it.

`pathLength` is the textbook fix and **does not work here**: Chrome normalises
it against the user-space length while still dashing in screen space.

The working approach, and the one to copy for any future draw-on stroke:
sample the path with `getPointAtLength()`, push each point through
`getScreenCTM()`, and sum the screen-space distances. Measure again in
`onEnter` (fonts and Suspense can resize the word after mount), and **drop the
dasharray entirely on complete** — a stale dasharray measured against an old
width re-opens the ring on the next resize.

---

## 8. The story band (homepage "Our story")

Added in this session. Files:

- `src/components/home/story-band.tsx` — async server component: resolves live
  Shopify photography + destinations, exports `StoryBandFallback`.
- `src/components/home/story-board.tsx` — client component: the grid, meter,
  rail, arrows, entrance.
- `aboutStory` in `src/lib/site.ts` — all copy and fallback stills.
- `.story-grid` / `.story-card-shade` / `.story-card-icon` etc. in
  `globals.css`.

**The closing sage panel is load-bearing, not decoration.** A snap rail can
only park a cell at its start while a viewport of scrolling remains. With four
cards and two visible, the fourth could never reach the snapport and `04` would
sit dead in the meter forever. The fifth cell is what the last card scrolls
against.

The constraint that follows, and that any width change must respect:

> With **n** cells and a cell width **w** (as a fraction of the rail viewport),
> card **k** can reach the snapport iff `k·w ≤ n·w − 1`.
> For k=3, n=5 that means **w ≥ 50%**. Cells may not be narrower than half the
> rail.

Because width is pinned by that rule, **height below `lg` comes from an aspect
ratio, not a step scale** (`aspect-[2/3] min-h-[24rem]`). With a fixed height
the card flattened as the viewport grew and went *landscape* (1.15:1 at 600px),
which this composition cannot survive — it stacks a lede over a body and a pill
and needs the photograph between them. At `lg` the rail is in a fixed
two-column grid, so heights are pinned there instead.

Italic emphasis on the cards is **Jakarta italic in sage on the indigo scrim**
(6.50), because Franxurter has no italic and sage may not carry type on light.

### The staggered card — `is-active`

Two cards are on screen and they are deliberately not the same. The card the
meter is on carries `is-active` and everything else follows from that class:

| | leading (`is-active`) | queued |
| --- | --- | --- |
| copy block | at the foot (`bottom: 1.25/1.5rem`) | raised (`bottom: 26%`) |
| card height | `100%` of the cell | `91%`, centred by the cell |
| photograph | clear | ivory haze (`.story-card-veil`) |
| scrim | bottom-weighted | plus `.story-card-shade-raised` |

Pressing an arrow moves the class and the two trade states — that travelling
copy is the movement the band is built around, and it is what the reference
layout is actually doing.

Three things are load-bearing here and easy to break:

- **The copy block is absolutely positioned**, not the tail of a flex column.
  It travels relative to the *card's* height, and a percentage `translateY`
  resolves against the element's own height instead.
- **`.story-card-shade-raised` exists because raised copy leaves the dark
  band.** The standing gradient is open at ~35% where the raised block lands,
  which measured about 3.4 for cream type. If you change the raise distance,
  move that gradient's stops with it.
- **The veil is ivory and sits *under* the scrim**, so it softens the
  photograph without lifting the ground the copy is read against.

### Card proportions

The card must stay portrait. Height below `lg` comes from `aspect-[2/3]`;
at `lg`/`xl` it is pinned (`31rem` / `35rem`) so the rail balances the
editorial column beside it. The verified range is **0.57–0.78** across
320→2560. Two numbers are coupled and drift apart if you touch one alone:

- shorten the cards and the left column develops a void under the meter
  (it was ~280px before this was tuned; it is now 50–70px);
- lengthen them and the widest breakpoints go square.

`.story-copy` is `align-self: center` at `lg` for the same reason — anchoring
it to the bottom put the entire surplus into one gap.

The headline rings "quietest hour" with `CircledWord`. Building this band is
what exposed the screen-space dash bug in that shared component (§7) — the
hero's shorter "real rest" was only ~17% short and nobody had noticed.

---

## 9. Verifying UI work — read this before screenshotting

`npm run dev` + Playwright (already in `node_modules`, no install needed).

1. **The loading curtain** holds the page up to 5.6s cold (`MIN_MS` 3200 /
   `MAX_MS` 5600 in `components/motion/loading-screen.tsx`) and **swallows
   clicks**. Do **not** use a fixed wait — under several browser contexts in one
   run it overruns and a click silently does nothing, which reads exactly like a
   dead control. Wait for it to leave:

   ```js
   await page.waitForFunction(() => !document.querySelector("[data-loader]"));
   ```

2. **The newsletter popup** fires 15s after arrival and intercepts every tap
   (Headless UI portal). Suppress it in `page.addInitScript`:

   ```js
   localStorage.setItem("kozy:newsletter",
     JSON.stringify({ state: "subscribed", at: Date.now() }));
   ```

3. **Node resolves `require("playwright")` from the script's own directory**,
   not the cwd. A script in a temp dir cannot see the project's
   `node_modules` — write throwaway scripts to the repo root and delete them
   after.
4. **Element screenshots are not inert.** `locator.screenshot()` on a box
   taller than the viewport re-snapped a `scroll-snap-type: mandatory` rail
   mid-test and reset its `scrollLeft`. Assert interaction state *before*
   taking the picture.
5. `next dev` backgrounded through a tool may report "exited with code 0" while
   still listening; and a killed session leaves a lock so it refuses to start,
   naming a **dead** PID. Check the port
   (`netstat -ano | Select-String ":3000"`) rather than believing either.
6. **Never leave two dev servers running against this repo.** Turbopack keeps a
   persistent cache in `.next`, and a second server on another port writes to
   the same one. The symptoms do not name the cause:
   - `Persisting failed: Another write batch or compaction is already active`
     repeating in the log, and
   - **metadata routes 404 for no reason** - `/manifest.webmanifest` served a
     404 from a corrupted cache while `next build` happily listed it as a
     static route.
   Check the port before starting one, and if the cache is already poisoned:
   stop every server, `rm -rf .next`, start one.

Check real breakpoints, not just two. The sweep that caught the landscape-card
bug: 320 / 360 / 390 / 414 / 480 / 540 / 600 / 640 / 700 / 767 / 768 / 820 /
912 / 1024 / 1180 / 1280 / 1366 / 1440 / 1536 / 1920 / 2560. Assert
`document.documentElement.scrollWidth === clientWidth` at each — the layout has
`overflow-x: clip` on `html`/`body`, which hides overflow rather than fixing
it.

---

## 10. Known pre-existing issues (not yours unless asked)

- **`npm run lint` fails** on
  `src/components/ui/product-image-rotator.tsx:38` — `react-hooks/refs`,
  "Cannot access refs during render". Pre-existing; `npm run build` is clean.
- **A few Shopify originals are too big for Shopify itself to resize.** This
  was "the image optimiser 500s everywhere"; most of it is fixed — see
  *Image sizing* in §6 — but files around 18 MB come back untransformed and
  still time out. Fixing those means re-uploading the assets smaller in
  Shopify; there is nothing left to do in code. Known offenders:
  `Simple_Aesthetic_Fashion_Brand_Photo_Collage_Instagram_Post_-_14/-_15.png`
  (3375x4219, 18.38 MB) and `IMG_1283.png`.
- `README.md` is stale — see §1.
- `scripts/` is empty despite a commit adding Shopify test scripts.
- **There are two GI tag assets, on purpose.** `public/icons/gi-tag.png` is
  the original: 2528x4288 and **7.64 MB**, with the badge occupying only the
  middle ~54% of a mostly-transparent canvas — so at any height you set, the
  mark renders about half the box and sits off-centre.
  `public/icons/gi-tag-mark.png` is that artwork trimmed to its ink box
  (2184x2329, nearly square) and resized, at **299 KB**. The product buy panel
  uses the trimmed one; `gallery.tsx` and `product-card.tsx` still position
  the original by hand and were left alone. Move them over when you next touch
  them — that file is also a prime candidate for the image-optimiser timeouts
  noted above.
- **The GI mark is shown on every product, unconditionally** — in the gallery,
  on the card, and now beside the price. A GI registration is a legal
  certification for *Jodhpur block print* specifically, so this is a real
  claim about provenance, not decoration. If the catalogue ever carries a
  product that is not block print, this needs gating on the collection or a
  tag. Flagged, not changed: all three placements predate and match each
  other.
- **The PWA manifest has no usable icon.** `src/app/manifest.ts` points its
  only icon at `/logo/Kozy Logo.png` — 3836x2160, non-square, 3.18 MB. Chrome
  wants a square 192 and a square 512 to offer an install prompt, so it
  currently offers none. This needs real square assets cut from the mark; it
  is not something to fake. The colours in that file were the dead palette too
  and have been fixed.

---

## 11. Conventions

- **Comments explain *why*, not *what*.** This codebase's comments carry
  derivations, measured contrast ratios, and the bug that motivated the code.
  Match that register — a comment that restates the line below it is noise
  here; one that records why the obvious approach failed is the house style.
- Copy goes in `src/lib/site.ts`, never inlined in JSX.
- New photographic surfaces go through `Plate`; new CTAs through
  `ActionButton`; new rails through `.rail` or `Carousel`.
- Layouts that *reorder* between breakpoints get an explicit
  `grid-template-areas` map in `globals.css` (`.hero-bento`, `.story-grid`),
  not a pile of `order-*` utilities.
- Never nest an `<a>` or `<button>` inside a card that is itself a link —
  render the pill as a styled `<span>`. Invalid markup and a duplicate tab stop.
- Prefer native scrolling + scroll-snap over transform tracks: touch,
  trackpad, keyboard and the scrollbar then work for free.
