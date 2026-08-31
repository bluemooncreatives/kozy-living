/**
 * Brand content for Kozy Living.
 *
 * Every piece of editorial copy on the marketing surfaces lives here rather
 * than being inlined in JSX, so the voice can be revised in one pass without
 * touching layout. Commerce data (products, collections, prices) still comes
 * from Shopify - this file covers the storytelling and brand foundation around it.
 */

export const site = {
  name: "Kozy Living",
  wordmark: "KOZY",
  wordmarkAccent: "LIVING",
  tagline: "Mindful Home · Timeless Comfort · Sustainable Craft",
  /** The single line set in the giant footer wordmark. */
  statement: "Thoughtful Objects for Mindful Sanctuaries. Crafted for Life.",
  origin: "Studio Workshop · Est. 2018",
  since: "2018",
  description:
    "Curated home decor, artisanal furniture, organic textiles, and warm ambient lighting. Crafted sustainably with natural materials for modern mindful sanctuaries.",
  freeShippingThreshold: "₹2,500",
} as const;

/**
 * Rotating hero-marquee statements. Kept as short, distinct lines rather than
 * one long sentence - at hero scale a single run-on phrase reads as a blur by
 * the time it's midway across the frame, where three short ones each get a
 * moment to actually be read.
 */
export const heroPhrases = [
  "Mindful Living in Every Space.",
  "Warmth, Comfort & Timeless Craft.",
  "Designed for Modern Sanctuaries.",
] as const;

/** Fallback navigation, used when the Shopify menu is empty or unreachable. */
export const primaryNav: { title: string; path: string }[] = [
  { title: "Shop", path: "/search" },
  { title: "Living Room", path: "/search/living-room" },
  { title: "Lighting", path: "/search/lighting" },
  { title: "Ceramics", path: "/search/ceramics" },
  { title: "Textiles", path: "/search/textiles" },
  { title: "Journal", path: "/blogs" },
  { title: "About Us", path: "/about-us" },
];

/** Scrolling announcement above the header. */
export const announcement = `Complimentary shipping on all sanctuary orders above ${site.freeShippingThreshold}`;

/**
 * Collection pills under the hero. Handles map to Shopify collections; the
 * grid degrades gracefully when a handle does not exist yet.
 */
export const collectionPills = [
  { title: "All Objects", handle: "", previewVideo: "/Coffee.mp4" },
  {
    title: "Living Room",
    handle: "living-room",
    previewVideo: "/209419_small.mp4",
  },
  {
    title: "Artisanal Lighting",
    handle: "lighting",
    previewVideo:
      "/vecteezy_slow-motion-of-raw-coffee-beans-fall-to-the-ground_1620174.mp4",
  },
  {
    title: "Ceramics & Vases",
    handle: "ceramics",
    previewVideo: "/45358-443057031.mp4",
  },
  { title: "Organic Textiles", handle: "textiles", previewVideo: "/209419_small.mp4" },
  { title: "Solid Wood", handle: "furniture", previewVideo: "/Coffee.mp4" },
  {
    title: "Dining & Tableware",
    handle: "dining",
    previewVideo:
      "/vecteezy_slow-motion-of-raw-coffee-beans-fall-to-the-ground_1620174.mp4",
  },
  {
    title: "Rugs & Throws",
    handle: "rugs",
    previewVideo: "/45358-443057031.mp4",
  },
  {
    title: "Aromatherapy & Candles",
    handle: "aromatherapy",
    previewVideo: "/209419_small.mp4",
  },
  {
    title: "Handcrafted Decor",
    handle: "decor",
    previewVideo:
      "/vecteezy_slow-motion-of-raw-coffee-beans-fall-to-the-ground_1620174.mp4",
  },
  {
    title: "New Arrivals",
    handle: "new-arrivals",
    previewVideo: "/45358-443057031.mp4",
  },
  { title: "Bestsellers", handle: "popular", previewVideo: "/Coffee.mp4" },
] as const;

/** The paired dark promo panels between the product rails. */
export const promoTiles = [
  {
    title: "Artisanal Lighting",
    handle: "lighting",
    image: null,
    labelPosition: "top",
  },
  {
    title: "Handcrafted Ceramics",
    handle: "ceramics",
    image: "/cozy-ceramics.jpg",
    labelPosition: "bottom",
  },
] as const;

/** Centred statement set in the display serif above the about rail. */
export const aboutStatement =
  "Kozy Living started with a simple belief: home is not just where you dwell, it is the sanctuary that shapes your peace. We create mindful, honest objects that bring quiet luxury, tactile warmth, and timeless comfort to everyday life.";

/** Alternating text cells in the about carousel. */
export const aboutCards = [
  "Every piece is handcrafted by master artisans in ethical workshops using responsibly harvested FSC-certified hardwoods, organic unbleached linen, and mineral-rich clay.",
  "We obsess over tactile textures, sculptural silhouettes, and durable finishes that develop a richer, deeper patina with every year of use in your home.",
  "Shipped directly from our maker studios to your living space—zero single-use plastics, fully recyclable packaging, and verified carbon-neutral transit.",
] as const;

/** Guides teaser - image right, copy left. */
export const guidesFeature = {
  eyebrow: "Living Guides",
  title: "Creating spaces of warmth and serenity",
  body: "Explore our curated interior styling notes on layering ambient lighting, mixing tactile natural textures, and selecting timeless furniture silhouettes that elevate everyday comfort.",
  cta: "Read design guides",
  href: "/blogs",
} as const;

/** Brew-of-the-month / Spotlight band copy. */
export const featureBand = {
  label: "Design of the Month",
  eyebrow: "Curated Spotlight",
} as const;

/**
 * Fallback journal entries. The homepage and `/blogs` read real articles from
 * the Shopify Storefront API; these only render when the store has no blog
 * configured yet, so the section never collapses to empty scaffolding.
 */
export const journalPosts = [
  {
    slug: "layering-ambient-lighting",
    title: "The Art of Layered Ambient Lighting for Cozy Evenings",
    excerpt:
      "Lighting is the single most transformative element of any interior. Discover how low-temperature luminescence, brass accents, and diffused paper lamps turn rooms into soothing evening havens...",
  },
  {
    slug: "tactile-materials-linen-wood-clay",
    title: "Tactile Harmony: Blending Raw Clay, Solid Oak & Stonewash Linen",
    excerpt:
      "When textures speak, color takes a graceful step back. Learn how pairing warm natural timber with hand-thrown ceramics and organic textiles creates instant visual depth and physical serenity...",
  },
  {
    slug: "mindful-morning-rituals-home",
    title: "5 Mindful Decor Rituals to Transform Your Home into a Sanctuary",
    excerpt:
      "Your living environment profoundly influences your morning headspace. A few intentional changes—from dedicated tea nooks to natural aroma diffusers—cultivate lasting calm and focus...",
  },
] as const;

/** Footer shipping ticker. */
export const shippingTicker = `Complimentary insured shipping on all orders over ${site.freeShippingThreshold}`;

/** Living-format / Space grid. Handles map to Shopify collections where they exist. */
export const brewFormats = [
  {
    title: "Living Room",
    handle: "living-room",
    note: "Sofas, lounge chairs, coffee tables, and ambient accents.",
  },
  {
    title: "Artisanal Lighting",
    handle: "lighting",
    note: "Pendant lamps, table lanterns, and warm brass fixtures.",
  },
  {
    title: "Ceramics & Vases",
    handle: "ceramics",
    note: "Hand-thrown stoneware, sculptural vessels, and earthy planters.",
  },
  {
    title: "Organic Textiles",
    handle: "textiles",
    note: "Pure linen throws, cushions, and tactile wool rugs.",
  },
  {
    title: "Dining & Tableware",
    handle: "dining",
    note: "Solid wood dining, stoneware plates, and linen napkins.",
  },
  {
    title: "Bedroom & Rest",
    handle: "bedroom",
    note: "Linen bedding, bedside timber, and soothing nightlights.",
  },
] as const;

/** Homepage FAQ. */
export const faqs = [
  {
    question: "What makes Kozy Living pieces different from mass decor?",
    answer:
      "We reject disposable fast-decor. Every Kozy Living piece is created in small artisan batches using solid FSC-certified timber, natural stoneware clay, and hand-loomed organic textiles. We design for longevity, tactile pleasure, and timeless beauty that outlasts fleeting trends.",
  },
  {
    question: "How do you ensure ethical and sustainable craftsmanship?",
    answer:
      "We partner directly with multigenerational artisan guilds and ethical family-run workshops. Our makers receive fair living wages, safe working environments, and credit for their artistry. We use only non-toxic plant oils, mineral glazes, and 100% plastic-free packaging.",
  },
  {
    question: "How do I care for solid wood and handcrafted ceramics?",
    answer:
      "Solid hardwoods thrive when wiped with a soft, slightly damp cloth and treated with natural beeswax once or twice a year. Our high-fired stoneware ceramics are dishwasher-safe, food-grade, and lead-free, designed for daily mindful use.",
  },
  {
    question: "What is your shipping and return policy?",
    answer:
      "We offer complimentary shipping across India on orders above ₹2,500. Every fragile and large furniture piece is custom-crated in protective recycled materials. If an item doesn't fit your space perfectly, we offer hassle-free 14-day returns.",
  },
  {
    question: "Do you offer interior styling advice or custom orders?",
    answer:
      "Yes. Our in-house design studio collaborates with homeowners, architects, and interior designers on bespoke furniture finishes, custom textile sizing, and complete sanctuary curation. Contact us to schedule a design consultation.",
  },
] as const;

export const footerColumns = [
  {
    title: "Collections",
    links: [
      { title: "All Objects", path: "/search" },
      { title: "Living Room", path: "/search/living-room" },
      { title: "Lighting", path: "/search/lighting" },
      { title: "Ceramics", path: "/search/ceramics" },
      { title: "Organic Textiles", path: "/search/textiles" },
    ],
  },
  {
    title: "Studio",
    links: [
      { title: "Our Story", path: "/about-us" },
      { title: "Living Journal", path: "/blogs" },
      { title: "Design Guides", path: "/blogs" },
      { title: "Contact Us", path: "/contact" },
      { title: "Sustainability", path: "/about-us" },
    ],
  },
] as const;

export const socialLinks = [
  { title: "Instagram", href: "https://instagram.com" },
  { title: "Pinterest", href: "https://pinterest.com" },
  { title: "YouTube", href: "https://youtube.com" },
  { title: "WhatsApp", href: "https://wa.me/918494907007" },
  { title: "Email", href: "mailto:care@kozyliving.com" },
] as const;

/* ------------------------------------------------------------------ contact */

/**
 * The studio addresses, inbox, and client helpline. Held here rather than in
 * the contact page so the footer, JSON-LD in `layout.tsx`, and order copies
 * read the same single source of truth.
 */
export const contact = {
  eyebrow: "Connect with Us",
  title: "Get in touch with the studio",
  body: [
    "Have a question about a piece, custom sizing, trade inquiries, or need styling advice for your space? Our studio team is here to help you curate your ideal sanctuary.",
    "Submit the form below or write directly to our care team. We respond thoughtfully to every inquiry within one business day.",
  ],
  email: "care@kozyliving.com",
  phone: "(+91) 8494 907 007",
  phoneHref: "+918494907007",
  locations: [
    {
      label: "Design Studio & Workshop",
      lines: [
        "Kozy Living Studio",
        "Craft Guild Enclave, Indiranagar",
        "Bengaluru, Karnataka 560038",
      ],
    },
    {
      label: "Artisan Ceramic & Wood Guild",
      lines: [
        "Artisan Quarter, Sanganer",
        "Jaipur Heritage Craft Zone",
        "Rajasthan 302029",
      ],
    },
  ],
} as const;

/* ----------------------------------------------------------------- heritage */

/**
 * Photography for `/about-us`.
 */
export const aboutImages = {
  /** Square. Tray, ceramics and natural light. */
  morning: {
    src: "/cozy-living-room.jpg",
    alt: "A cozy living sanctuary with warm linen throws, handcrafted ceramic vase, and natural timber coffee table in morning sunlight.",
    aspect: "1/1",
  },
  /** Square. Handcrafted natural decor. */
  grounds: {
    src: "/cozy-ceramics.jpg",
    alt: "Artisan hands shaping warm terracotta pottery and smoothing solid oak timber in the Kozy Living workshop.",
    aspect: "1/1",
  },
  /** Portrait 2:3. Minimalist sculptural interior hero. */
  pouch: {
    src: "/cozy-ceramics.jpg",
    alt: "Sculptural ceramic vase and organic linen cushion styled on a minimalist solid wood bench.",
    aspect: "2/3",
  },
} as const;

/**
 * The About page, section by section.
 */
export const heritage = {
  eyebrow: "Our Heritage",
  title: "Rooted in Craft. Designed for Modern Living.",
  body: "From a bespoke woodwork and ceramic studio in 2018 to homes across the world—crafting cozy, mindful living spaces one piece at a time.",
  timeline: [
    {
      year: "2018",
      title: "The Studio Begins",
      body: "Kozy Living is founded as a bespoke woodwork and pottery studio, creating handcrafted solid oak dining tables and organic clay vessels for intimate living spaces.",
    },
    {
      year: "2020",
      title: "Artisan Collective Formed",
      body: "We expanded our horizons to collaborate directly with generational textile weavers and master ceramicists across renowned regional craft communities.",
    },
    {
      year: "2022",
      title: "100% Sustainable Materials Pledge",
      body: "We transitioned our entire material supply chain to FSC-certified timber, natural plant-based finishes, organic cottons, and completely plastic-free shipping.",
    },
    {
      year: "2024",
      title: "Sculptural Lighting & Seating",
      body: "Launched our acclaimed ambient lighting and textured bouclé & linen seating line, merging sculptural Japandi aesthetics with plush comfort.",
    },
    {
      year: "2026",
      title: "Direct to Your Sanctuary",
      body: "Delivering heirloom-quality homeware, timeless furniture, and curated decor directly to discerning homes with transparent pricing and carbon-neutral transit.",
    },
  ],
} as const;

/**
 * Sustainability and craft metrics.
 */
export const whyRobusta = {
  eyebrow: "Why Mindful Living",
  title: "Why choose slow, sustainable craftsmanship?",
  body: "Fast furniture and synthetic decor end up in landfills. We design enduring pieces with natural materials that breathe warmth and age gracefully in your home.",
  stats: [
    {
      value: "100%",
      label: "FSC-Certified Timbers & Organic Linens",
      note: "Ethically harvested, zero toxic coatings",
    },
    {
      value: "0%",
      label: "Single-Use Plastics in Packaging",
      note: "100% biodegradable and recyclable materials",
    },
    {
      value: "40+",
      label: "Master Artisan Maker Guilds",
      note: "Preserving heritage woodworking and pottery",
    },
    {
      value: "10+",
      label: "Years of Built-to-Last Durability",
      note: "Heirloom construction that endures daily life",
    },
  ],
  comparison: [
    { trait: "Materials", arabica: "Particle board & veneers", robusta: "Solid FSC hardwoods & pure clay" },
    { trait: "Finishing", arabica: "Synthetic chemical lacquers", robusta: "Natural plant oils & beeswax" },
    { trait: "Packaging", arabica: "Plastic bubble wrap & foam", robusta: "100% plastic-free recycled paper" },
    { trait: "Longevity", arabica: "2-3 years before wear", robusta: "Generations of lasting beauty" },
    { trait: "Artisan Fair Pay", arabica: "Mass automated factory", robusta: "Fair living wages for all makers" },
  ],
} as const;

/** Five numbered steps from studio to home. */
export const farmToCup = {
  eyebrow: "Studio to Sanctuary",
  title: "Five steps. Zero compromises.",
  steps: [
    {
      title: "Conscious Sourcing",
      body: "We select responsibly harvested solid hardwoods, organic unbleached flax linen, and mineral-rich local clays.",
    },
    {
      title: "Artisan Handcrafting",
      body: "Every piece is shaped, hand-joined, wheel-thrown, or loomed by experienced master artisans in small batches.",
    },
    {
      title: "Non-Toxic Finishing",
      body: "Finished with natural cold-pressed plant oils, organic beeswax, and low-VOC mineral glazes safe for your family.",
    },
    {
      title: "Structural Quality Testing",
      body: "Each creation undergoes rigorous checks for joinery strength, tactile smoothness, and ergonomic comfort.",
    },
    {
      title: "Mindful Delivery",
      body: "Carefully protected in custom plastic-free packaging and dispatched with carbon-neutral transit to your door.",
    },
  ],
} as const;

export const sustainability = {
  eyebrow: "Sustainability",
  title: ["We build for spaces that last", "and a planet that endures."],
  body: "Every object we create is designed to live in harmony with nature—using renewable earth materials, zero toxic emissions, and plastic-free packaging.",
  pillars: [
    {
      title: "Renewable Materials",
      body: "Solid oak, teak, pure Belgian linen, and high-fired stoneware clay from responsible earth-conscious sources.",
    },
    {
      title: "Zero Plastic Transit",
      body: "100% recyclable corrugated board, water-activated kraft tape, and reusable cotton dust bags for all orders.",
    },
    {
      title: "Artisan Empowerment",
      body: "Direct maker partnerships ensuring fair living wages, healthcare support, and preservation of age-old craft techniques.",
    },
    {
      title: "Circular Longevity",
      body: "Timeless silhouettes designed to be loved, maintained, and passed down rather than discarded after a season.",
    },
  ],
} as const;

/**
 * Creative collective & founding designers.
 */
export const family = {
  eyebrow: "The Collective",
  title: "Passionate about craft and quiet living.",
  strapline: "Design Philosophy: Warmth & Intention",
  members: [
    {
      name: "Aria Thorne",
      generation: "Co-Founder · Creative Director",
      credential: "M.Arch, Sustainable Architecture",
      body: "Architect and spatial designer dedicated to creating peaceful, light-filled sanctuaries through natural materials.",
    },
    {
      name: "Rohan Varma",
      generation: "Co-Founder · Head of Craft",
      credential: "Master Woodworker & Guild Lead",
      body: "Second-generation timber craftsman specializing in traditional joinery and tactile organic finishes.",
    },
    {
      name: "Meera Sen",
      generation: "Lead Ceramic Artist",
      credential: "Fine Arts & Ceramic Sculpting",
      body: "Sculpts hand-thrown stoneware vessels and earthy lamps inspired by wabi-sabi textures and raw mineral pigments.",
    },
    {
      name: "Devan Thorne",
      generation: "Head of Sustainable Logistics",
      credential: "Circular Supply Chain & Logistics",
      body: "Pioneered our 100% plastic-free packaging standard and verified carbon-neutral transit network.",
    },
  ],
} as const;

/** The signed note that closes the story before the shop CTA. */
export const familyNote = {
  eyebrow: "A note from the studio",
  title: "We believe your home should be your sanctuary.",
  body: [
    "We started Kozy Living because we wanted our own living spaces to feel grounding, warm, and deeply restful. We wanted furniture and objects made with real heart, by real hands.",
    "We hope our pieces bring warmth, calm, and beauty into your everyday rituals. If you ever have a question or need assistance with your home curation, we're always here for you.",
  ],
  signature: "Aria & Rohan",
  signatureRole: "Founders · Kozy Living Design Studio",
} as const;

/** Closing band on `/about-us` - the handoff to the shop. */
export const aboutCta = {
  eyebrow: "Handcrafted · Sustainable",
  title: ["Bring warmth to", "your sanctuary."],
  body: "Crafted in small artisan batches with natural materials and shipped directly to your door with plastic-free care.",
  cta: "Explore the collection",
  href: "/search",
} as const;

/**
 * Living philosophy band.
 */
export const estatePhilosophy = {
  eyebrow: "Living Philosophy",
  title: ["We believe home is", " a living sanctuary"],
  body: [
    "At Kozy Living, every piece begins with an appreciation for slow craftsmanship, natural textures, and the quiet luxury of comfort. From solid FSC-certified hardwoods and hand-thrown stoneware to hand-loomed organic linens, our designs bring warmth, calm, and grounded elegance to everyday living. Nothing here is rushed. Designed with intention, finished with natural plant oils, and packaged plastic-free.",
  ],
  cta: "Discover our story",
  href: "/about-us",
} as const;

/**
 * Living reel: four staggered plates.
 */
export const estateReel = [
  {
    kind: "image",
    src: "/cozy-living-room.jpg",
    alt: "A minimalist living space featuring a solid oak low table, organic linen seating, and warm ambient light.",
    label: "the material",
    caption: "Solid oak, washed linen, raw clay",
  },
  {
    kind: "video",
    src: "https://cdn.shopify.com/videos/c/o/v/643e30e15c364663860fded49117578a.mp4",
    label: "the craft",
    caption: "Hand-thrown pottery, wheel to kiln",
  },
  {
    kind: "image",
    src: "/cozy-ceramics.jpg",
    alt: "Artisan ceramics and warm linen cushions styled on a warm timber surface.",
    label: "the ambient glow",
    caption: "Soft lighting that warms the evening",
  },
  {
    kind: "video",
    src: "https://cdn.shopify.com/videos/c/o/v/81da4c142d584a23b09d68399eff9a18.mp4",
    label: "the sanctuary",
    caption: "Spaces that invite rest and deep calm",
  },
] as const;
