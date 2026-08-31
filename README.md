# Kozy Living — Headless Ecommerce Storefront

A high-performance, server-rendered Next.js (App Router) ecommerce storefront for **Kozy Living**—a curated brand for mindful home decor, artisanal furniture, organic textiles, and warm ambient lighting.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS, Headless UI, and Shopify Headless Storefront GraphQL API.

---

## 🌿 Brand Concept & Design System

- **Brand:** Kozy Living
- **Tagline:** Mindful Home · Timeless Comfort · Sustainable Craft
- **Aesthetic:** Warm minimalism, Japandi & organic modern sanctuaries, tactile materials, and clean hairline layout grid.
- **Palette:**
  - **Paper:** `#FAF8F5` (Warm Ivory Oat)
  - **Ink:** `#2A221E` (Warm Espresso Charcoal)
  - **Terracotta / Accent:** `#8C4328` (Warm Clay Rust)
  - **Amber Glow:** `#E9B973` (Soft Honey Luminescence)

---

## 🚀 Key Features

- ⚡ **Next.js 16 App Router & Server Components**: Instant page streaming, fast initial load, and SEO-optimized metadata.
- 🛍️ **Shopify Headless Commerce**: Real-time product catalog, variant selection, optimistic cart drawer, and secure checkout.
- 🛋️ **Curated Category & Space Filtering**: Browse by Room (Living Room, Bedroom, Dining, Lighting, Ceramics, Textiles) and Material (Solid Oak, Linen, Stoneware Clay).
- 📖 **Living Journal & Guides**: Editorial storytelling, interior styling advice, and craftsmanship notes.
- 🌍 **100% Sustainable & Plastic-Free**: Showcasing ethical artisan workshops, FSC timbers, and mindful delivery.
- 📱 **Fully Responsive & Accessible**: Built with Headless UI dialogs, smooth Lenis scrolling, and micro-animations.

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory:
```env
COMPANY_NAME='Kozy Living'
SITE_NAME='Kozy Living'
TWITTER_CREATOR='@KozyLiving'
TWITTER_SITE='https://kozyliving.com'

SHOPIFY_STORE_DOMAIN='your-store.myshopify.com'
SHOPIFY_STOREFRONT_ACCESS_TOKEN='your_storefront_token'
SHOPIFY_ADMIN_ACCESS_TOKEN='shpat_...'
SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID='...'
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the storefront in your browser.

---

## 📦 Build for Production

```bash
npm run build
npm run start
```
