/**
 * Brand content for Kozy Living.
 *
 * Every piece of editorial copy on the marketing surfaces lives here rather
 * than being inlined in JSX, so the voice can be revised in one pass without
 * touching layout. Commerce data (products, collections, prices) still comes
 * from Shopify - this file covers the storytelling around it.
 *
 * VOICE: "Kompanions", not products or pieces. Rest, ritual and intention,
 * not luxury or indulgence. "Krafted" with a K is the house spelling and is
 * used deliberately - never correct it to "crafted" in brand lines.
 *
 * UNVERIFIED VALUES are marked `TODO(brand)`. They are placeholders that keep
 * a surface from rendering empty; replace them before launch.
 */

export const site = {
  name: "Kozy Living",
  wordmark: "KOZY",
  wordmarkAccent: "LIVING",
  tagline: "Krafted to Give You Moments of Rest",
  /** The brand's own closing line. Used wherever one sentence has to carry it. */
  statement:
    "You don't need to add more to your day. Just do what you do with more intention.",
  origin: "India",
  description:
    "Craft-led, conscious textiles from India. Cotton waffle weaves, slub cottons, percale, linen blends and wool - designed in-house, made with craft clusters across the country, and finished with traditional Dabu hand-block printing.",
  founder: "Khushi Faruqi",
  founderCredential: "Textile Design, NIFT Delhi",
  /** Khushi's own account - distinct from `instagram` below, which is the
      brand's. Used only on `/founders-note`, where the byline is hers. */
  founderInstagram: "@khushifaruqii",
  founderInstagramUrl: "https://www.instagram.com/khushifaruqii/",
  instagram: "@kozyliving_",
  instagramUrl: "https://www.instagram.com/kozyliving_/",
} as const;

/**
 * Photographs of the founder herself - real stills, not studio product shots
 * standing in for a portrait. Used on `/founders-note` (masthead, the letter's
 * side column, the closing panel) and as the founder's card on `/about-us`.
 *
 * These are raw Shopify file URLs, not the transformed CDN images the
 * Storefront API returns, so `ShopImage`'s loader rewrites them by `?width=`
 * rather than by the `_NNNNx` filename suffix - see the note in
 * `shop-image.tsx`. Capped at 2048 there either way.
 */
export const founderImages = [
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/WhatsApp_Image_2026-02-08_at_11.59.15_PM.jpg?v=1790369996",
    alt: "Khushi Faruqi, founder of Kozy Living.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1171_43dfc109-e3d3-4a11-b902-f6443ff961fa.jpg?v=1790369997",
    alt: "Khushi Faruqi at work in the Kozy Living studio.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_6338_eea1aae1-4c9b-4571-8f07-f080a9d1fbeb.jpg?v=1790369997",
    alt: "Khushi Faruqi with Kozy Living textiles.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_2755_9be99538-96aa-4529-a92c-1c67d6431b73.jpg?v=1790369997",
    alt: "Khushi Faruqi, founder of Kozy Living.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_6412_d18c7de3-251f-46e0-9763-eb814a5fa2a5.jpg?v=1790370000",
    alt: "Khushi Faruqi in the studio with the craft clusters' work.",
  },
] as const;

/**
 * The reel on `/founders-note` - `founderImages` plus a silent clip and one
 * more still, for the auto-scrolling column beside the letter.
 *
 * One entry is a VIDEO, not a photograph - `FounderReel` renders it as a
 * silent, looping `<video>` rather than through `ShopImage`, which only
 * handles Shopify's image transform. Its `poster` is the one non-portrait
 * still in the set (a product promo frame): named `..._Poster_...` on
 * Shopify, and used here for exactly that job, so the reel never shows a
 * blank tile before the clip has a frame to paint.
 */
export const founderReel = [
  ...founderImages,
  {
    type: "video" as const,
    url: "https://cdn.shopify.com/videos/c/o/v/806a125208a44b90ad1c2e7ae99d6494.mp4",
    poster:
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/NEW_PRODUCT_WATCH_SALE_PROMO_Poster_25bd1395-74aa-4e03-8808-487406600e3f.png?v=1788636327",
    alt: "A moment from the Kozy Living studio, in motion.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_8778.jpg?v=1788636329",
    alt: "Khushi Faruqi with Kozy Living textiles.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1235.jpg?v=1788636320",
    alt: "Kozy Living Textiles, styled.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/NEW_PRODUCT_WATCH_SALE_PROMO_Poster_-_4.jpg?v=1788636319",
    alt: "A Kozy Living Kompanion.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1214.jpg?v=1788636316",
    alt: "Kozy Living Textiles, styled.",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/NEW_PRODUCT_WATCH_SALE_PROMO_Poster_-_10.jpg?v=1788636316",
    alt: "A Kozy Living Kompanion.",
  },
] as const;

/*
 * NOTE: navigation lives in Shopify, not here.
 *
 * The header, the mobile drawer, the search overlay and the homepage category
 * rail all read the "main-menu" menu through `getPrimaryMenu()`. There is
 * deliberately no hard-coded nav in this file: a fallback list silently
 * replaced the real menu for months here, and shipped links to collection
 * handles the store never had.
 */

/** The quiet line above the header. */
export const announcement = "Krafted to give you moments of rest";

/* ------------------------------------------------------------------ homepage
   The sections below map one-to-one onto the homepage layout, in page order.
------------------------------------------------------------------------- */

/**
 * Hero. One photographic frame carrying a flagged blurb top-left, a black pill
 * CTA top-right, and the wordmark bleeding across its bottom edge.
 *
 * There is deliberately no star rating here. The previous copy carried an
 * invented "4.9 / 2,400+ homes styled" - social proof is the one thing a
 * storefront must never make up, so the slot carries a factual origin flag
 * instead.
 */
export const hero = {
  flag: "Handcrafted in India",
  /**
   * The same claim, split for the two-line origin mark on the hero plate.
   * Kept beside `flag` rather than derived from it: the social card (which
   * cannot read this layout) still wants the sentence whole.
   */
  flagMark: { lead: "Handcrafted", place: "in India" },
  blurb:
    "Kozy Living Textiles are your in-between Kompanions - krafted from 100% natural fibres to turn everyday moments into mindful daily rituals.",
  /** The statement panel in the top-right of the bento. */
  statement: {
    lines: ["Kraft-led & Koncious", "textiles for", "everyday rituals"],
    /** Ringed by the hand-drawn ellipse. Must appear in `lines` verbatim. */
    circled: "everyday rituals",
    body: "Designed in-house, shaped by the hands and heritage of India’s craft clusters. From tactile cottons to linen blends and wool, every weave carries a story of place, patience, and craft.",
  },
  /** The two small plates that close the bento. */
  tiles: [
    {
      tag: "#KRAFTEDBYHAND",
      handle: "kessentials",
      images: [
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1675.jpg?v=1788636340",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1695.png?v=1788636343",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1677.jpg?v=1788636340",
      ],
    },
    {
      tag: "#MOMENTSOFREST",
      handle: "kozy-lounge",
      images: [
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/900E9CCD-5302-4863-A642-251A2207515C.jpg?v=1788636354",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/85aeb9ef-fd0d-4cf2-a72f-af881a17b4fb.jpg?v=1788636352",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1033.jpg?v=1788636330",
      ],
    },
  ],
  primary: { label: "Shop Kompanions", href: "/search" },
  secondary: { label: "Our story", href: "/about-us" },
  /** The circular button that sits on the feature photograph. */
  circle: { label: "Shop now", href: "/search" },
  /** Set in the display face in the band below the frame. */
  wordmark: "kozy living",
  seal: "krafted for moments of rest · ",
  metaLeft: "Rooted in Indian Kraft",
  metaRight: "100% Natural Fibres",
} as const;

/**
 * Every film the hero bento plays, in one list.
 *
 * All three plates draw from THIS list and nothing else - there are no
 * per-plate clips. Each starts on its own entry (the first three, in order)
 * and then takes the next free film from the shared queue, so the reel runs
 * end to end across the bento rather than each box looping a playlist of its
 * own. Two plates can never land on the same film: a film is checked out
 * while it is on screen and checked back in when it leaves, in
 * `@/lib/hero-clips`.
 *
 * Ordering matters twice over. The first three are what the page paints
 * before any JavaScript runs, so they are the ones worth leading with; and
 * because the queue is walked in order, the list is also the running order.
 * Keep at least one more film here than there are plates, or the queue has
 * nothing free to hand out.
 */
export const heroFilms = [
  // Local H.264/fast-start rendition of the 46.3 MB HEVC Shopify original.
  // At 6.3 MB it starts reliably across browsers and costs far less to decode.
  "/media/hero-main.mp4",
  "https://cdn.shopify.com/videos/c/o/v/3329bb6694284f05be3d3ff8a0bb6f22.mp4",
  "https://cdn.shopify.com/videos/c/o/v/65fa358ea2ec488f9c62e7f86d758f3c.mp4",
  "https://cdn.shopify.com/videos/c/o/v/e78b76a026054863975d667b63071a21.mp4",
  "https://cdn.shopify.com/videos/c/o/v/d761713a789d44c3bb7f5b6686912560.mp4",
  "https://cdn.shopify.com/videos/c/o/v/754450888c474683bb51918287cdcdca.mp4",
  "https://cdn.shopify.com/videos/c/o/v/4c106e1353e5404dbc1622f13a2de9d2.mp4",
] as const;

/** The oversized statement that opens the editorial half of the page. */
export const boldStatement = {
  title: ["Do Less,", "With Intention"],
  body: "Rooted in Indian craft and expressed through a modern design language - colour, print and organic form that refresh your space and enhance daily living.",
} as const;

/**
 * The staggered lookbook cluster, read four at a time. The arrows above the
 * cluster page through this list in fours, so its length should stay a
 * multiple of four - a short last page leaves a hole in the zigzag.
 *
 * The zigzag itself belongs to the four SLOTS, not to these entries (see
 * `LookbookDeck`), so reordering this list never changes the shape.
 *
 * `handle` does two jobs, as in the story band: it is the destination (only
 * when the collection is live - a dead handle opens the full catalogue) and,
 * where `images` is empty, the source of the plate's photography, borrowed
 * from that collection's products. Configured stills win over live ones.
 *
 * Tags name the fibre or the craft where the brand has named one; they feed
 * the alt text and the placeholder's ghost type, not the visible card.
 */
export type LookbookEntry = {
  tag: string;
  title: string;
  description: string;
  handle: string;
  /**
   * A product handle, for a card that is ONE Kompanion rather than a shelf -
   * the His & Her kit is a product in Shopify, not a collection. When set, the
   * card links to that product and borrows its photographs; `handle` is only
   * the fallback destination if the product has been removed.
   */
  product?: string;
  images: readonly string[];
};

export const lookbook: readonly LookbookEntry[] = [
  {
    tag: "dabu",
    description:
      "Our Dabu hand-block printed line - robes, slippers, pillows and kits.",
    title: "Krafted by Kozy",
    handle: "crafted-by-kozy",
    images: [],
  },
  {
    tag: "waffle",
    description: "Everyday waffle-weave staples in easy, honest cotton.",
    title: "Kessentials",
    handle: "kessentials",
    images: [
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1675.jpg?v=1788636340",
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1695.png?v=1788636343",
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1677.jpg?v=1788636340",
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1694_d0fd0a48-49cb-46ac-a8ec-fbf065b857f6.jpg?v=1788636341",
    ],
  },
  {
    tag: "pets",
    description:
      "Carriers, seating and clothing for the companion who shares your slow hours.",
    title: "Pet Kollection",
    handle: "pet-collection",
    images: [],
  },
  {
    tag: "rituals",
    description:
      "A his & hers set in natural cotton, Natural Indigo and Tulsi - robes, slippers and more.",
    title: "His & Her Ritual Kit",
    // A single Kompanion rather than a shelf - see `product` on the type.
    product: "neelu-tulsi-his-hers-ritual-kit",
    handle: "ritual-kits",
    images: [],
  },
  {
    tag: "dabu",
    description:
      "Dabu-printed carriers and matching pieces for both ends of the leash.",
    title: "Pet & Parent",
    handle: "pet-parent",
    images: [
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_4035.png?v=1788636358",
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/CEDD7B20-D83F-4050-9CEB-D693C7AE6269.jpg?v=1788636170",
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/5A7D8EAA-E90A-4449-B0C0-4C7C5CA38535.jpg?v=1788636170",
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/DB2B40CD-1A34-48FC-98D5-63220DD3DD2B.jpg?v=1788636171",
    ],
  },
  {
    tag: "waffle",
    description:
      "Soft layers for slow mornings, long evenings and everything between.",
    title: "Bathrobes",
    handle: "bathrobes",
    images: [],
  },
  {
    tag: "dabu",
    description:
      "Hand-block printed pillows that bring a quiet, artful mood to a corner.",
    title: "Dabu Pillows",
    handle: "dabu-printed-pillows",
    images: [],
  },
  {
    tag: "slippers",
    description: "Soft slippers for the unhurried hours between rooms.",
    title: "Slippers",
    handle: "slippers",
    images: [],
  },
  {
    tag: "rituals",
    description:
      "Kompanions gathered into one set for a slower morning ritual.",
    title: "Ritual Kits",
    handle: "ritual-kits",
    images: [],
  },
  {
    tag: "dabu",
    description: "Dabu-printed carriers for the outings you take together.",
    title: "Pet Karrier",
    handle: "pet-carrier",
    images: [],
  },
  {
    tag: "pets",
    description:
      "Low, soft seating so your companion has a corner of their own.",
    title: "Pet Seating",
    handle: "pet-seating",
    images: [],
  },
  {
    tag: "pets",
    description: "The same fibres and prints as their parent's, scaled down.",
    title: "Pet Klothing",
    handle: "pet-clothing",
    images: [],
  },
];

/**
 * The homepage story band - the brand's own section, sitting between the
 * icon ticker and the studio quote.
 *
 * FOUR PILLARS, and every claim here is one the brand already makes on
 * `/about-us` (see `whyKraft` and `sustainability`): the fibre, the makers,
 * the print and the purpose. Nothing invented, nothing certified that has not
 * been earned.
 *
 * `collection` is a Shopify handle and does two jobs: the card borrows that
 * collection's live product photography, and - only when the handle actually
 * exists on the store - the card links into it. A handle the merchant has not
 * built falls back to `href` and to the stills below, so the band never ships
 * a dead link or an empty frame.
 *
 * `lede.accent` is set in the UI face's true italic, in sage. Franxurter has
 * one upright weight and no italic, so the emphasis lives on Jakarta - and
 * sage measures 6.50 on the indigo scrim these cards carry, which is where
 * flat sage is allowed to hold type.
 */
export const aboutStory = {
  eyebrow: "About Kozy Living",
  /**
   * Broken by hand, and kept SHORT on purpose: this heading sets in Franxurter
   * inside the narrow left column of a two-column band, where a long line
   * simply rewraps and the hand-set rag stops meaning anything. The ellipse
   * loops the phrase below, so keep it verbatim and keep it on one line.
   */
  title: ["Behind your", "quietest hour"],
  summary:
    "Designed in-house and made with craft clusters across India. We bring natural fibres and thoughtful design to the little rituals that make you feel at home.",
  circled: "quietest hour",
  body: "Kozy Living began with one idea: you don't need to add more to your day. Everything we make is designed in-house, worked in 100% natural fibres, and made with craft clusters across India - so the ten minutes you already take feel like a ritual rather than a gap.",
  /** Sits under the meter on wide screens, where the left column has room. */
  meterNote:
    "Four things we don't compromise on - the cloth, the hands, the print, and what the Kompanion is actually for.",
  primary: { label: "Read our story", href: "/about-us" },
  secondary: { label: "Meet the Kompanions", href: "/search" },
  /** The panel that closes the rail - see the note in `story-board.tsx`. */
  closing: {
    label: "The long version",
    title: "Everything behind the cloth",
  },
  pillars: [
    {
      index: "01",
      kicker: "The cloth",
      lede: { lead: "Natural fibres,", accent: "only" },
      body: "Cotton waffle weave, slub cotton, percale, linen blends and wool - consciously sourced, including surplus fabric kept in use.",
      cta: "See the weaves",
      collection: "kessentials",
      href: "/about-us",
      alt: "Waffle weave and slub cotton Kompanions folded on the studio table.",
      images: [
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1675.jpg?v=1788636340",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1695.png?v=1788636343",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1694_d0fd0a48-49cb-46ac-a8ec-fbf065b857f6.jpg?v=1788636341",
      ],
    },
    {
      index: "02",
      kicker: "The hands",
      lede: { lead: "Made with", accent: "craft clusters" },
      body: "Designed in-house by Khushi Faruqi, then made in collaboration with craft clusters across India - artisanal processes, not volume machinery.",
      cta: "Meet the collective",
      /* No handle: the makers are not a shelf. This card always goes to the
         story, and always uses the studio stills. */
      collection: null,
      href: "/about-us",
      alt: "Cloth on the studio table part-way through a hand-block print run.",
      images: [
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/9774ec93-dce6-49a1-ba50-ec350ae25b8b.jpg?v=1788636351",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1876_d3c112d9-c774-458b-b8a9-fd12fc7e056e.jpg?v=1788636349",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1880.jpg?v=1788636348",
      ],
    },
    {
      index: "03",
      kicker: "The print",
      lede: { lead: "Dabu,", accent: "block by block" },
      body: "A mud-and-gum resist is stamped onto the cloth by hand before it ever meets the dye, so no two repeats are identical.",
      cta: "See Dabu pieces",
      collection: "dabu-printed-pillows",
      href: "/blogs",
      alt: "A Dabu hand-block print in indigo, close on the weave.",
      images: [
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1895_c94dd5b4-daca-47b9-94aa-d5aa31527cd5.jpg?v=1788636351",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_4035.png?v=1788636358",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/CEDD7B20-D83F-4050-9CEB-D693C7AE6269.jpg?v=1788636170",
      ],
    },
    {
      index: "04",
      kicker: "The point",
      lede: { lead: "Used,", accent: "not looked at" },
      body: "Every Kompanion is built multipurpose and made to be leaned on daily - which is why we don't call them decor.",
      cta: "Shop Kompanions",
      collection: "kozy-lounge",
      href: "/search",
      alt: "A floor lounge layered with biscuit pillows and a linen blend throw.",
      images: [
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/900E9CCD-5302-4863-A642-251A2207515C.jpg?v=1788636354",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1033.jpg?v=1788636330",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_0129.jpg?v=1788636349",
      ],
    },
    {
      index: "05",
      kicker: "The ritual",
      lede: { lead: "Slow mornings,", accent: "soft layers" },
      body: "Robes, slippers and thoughtful sets for the small moments of rest already in your day.",
      cta: "Explore ritual kits",
      collection: "ritual-kits",
      href: "/search",
      alt: "Soft cotton pieces for everyday moments of rest.",
      images: [
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1695.png?v=1788636343",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1675.jpg?v=1788636340",
      ],
    },
    {
      index: "06",
      kicker: "The companions",
      lede: { lead: "Together,", accent: "at home" },
      body: "Carriers, seating and clothing for the companion who shares your slow hours.",
      cta: "Meet the pet kollection",
      collection: "pet-collection",
      href: "/search",
      alt: "Hand-block printed pieces for pets and their people.",
      images: [
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_4035.png?v=1788636358",
        "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/CEDD7B20-D83F-4050-9CEB-D693C7AE6269.jpg?v=1788636170",
      ],
    },
  ],
} as const;

/**
 * The dark quote card. This is the brand's own closing line, so it is
 * attributed to the studio rather than to a named person - putting invented
 * words in a real founder's mouth is not a thing a storefront should do.
 *
 * TODO(brand): swap for a real line from Khushi if one is on record.
 */
export const testimonial = {
  quote: site.statement,
  name: site.name,
  role: "The studio philosophy",
  image:
    "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1876_d3c112d9-c774-458b-b8a9-fd12fc7e056e.jpg?v=1788636349",
} as const;

/**
 * Scrolling strip between the quote and the closing CTA.
 *
 * Carries a brand line rather than a discount: the previous "Discount 20%"
 * ticker advertised an offer that does not exist.
 */
export const restTicker = {
  label: "Moments of Rest",
  repeat: 8,
} as const;

/** The closing call-to-action band that mirrors the hero. */
export const ctaBand = {
  pill: "Get started",
  body: "Meet the Kompanions krafted to sit alongside the routines you already have - and to make them feel like rituals.",
  wordmark: "shop now",
  href: "/search",
  seal: "krafted for moments of rest · ",
  image:
    "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1876_d3c112d9-c774-458b-b8a9-fd12fc7e056e.jpg?v=1788636349",
} as const;

/** Journal teaser - copy left, image right. */
export const guidesFeature = {
  eyebrow: "The Journal",
  title: "Notes on rest, ritual and kraft",
  body: "How a waffle weave earns its texture, what Dabu hand-block printing actually involves, and how to care for natural fibres so they soften rather than wear out.",
  cta: "Read the journal",
  image:
    "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1880.jpg?v=1788636348",
  href: "/blogs",
} as const;

/** Spotlight band copy. */
export const featureBand = {
  label: "Kompanion of the Month",
  eyebrow: "In the Spotlight",
} as const;

/**
 * Fallback journal entries. The homepage and `/blogs` read real articles from
 * the Shopify Storefront API; these only render when the store has no blog
 * configured yet, so the section never collapses to empty scaffolding.
 */
export const journalPosts = [
  {
    slug: "why-waffle-weave",
    title: "Why Waffle Weave Belongs in Your Slowest Hour",
    image:
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1695.png?v=1788636343",
    excerpt:
      "The honeycomb structure holds air, which is what makes a waffle robe dry quickly and breathe against skin. A look at how the weave is built and why it suits an unhurried morning...",
  },
  {
    slug: "dabu-hand-block-printing",
    title: "Dabu: The Mud-Resist Print Behind Our Indigo",
    image:
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1895_c94dd5b4-daca-47b9-94aa-d5aa31527cd5.jpg?v=1788636351",
    excerpt:
      "Before dye touches cloth, a mud-and-gum resist is hand-stamped onto it block by block. Nothing about the process is fast, and every repeat carries the hand that placed it...",
  },
  {
    slug: "in-between-moments",
    title: "The In-Between Moments Are the Ritual",
    image:
      "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_0129.jpg?v=1788636349",
    excerpt:
      "Not the grand reset, but the ten minutes on the floor before the day starts. A case for textiles that support the routines already in your day rather than asking for new ones...",
  },
] as const;

/** Homepage / support FAQ. */
export const faqs = [
  {
    question: "What are Kompanions?",
    answer:
      "It is what we call our textiles. They are not decor objects to be looked at - they are krafted to be used, leaned on and lived with, supporting the moments of rest already in your day.",
  },
  {
    question: "What are your textiles made from?",
    answer:
      "100% natural fibres. Our material palette is cotton waffle weave, slub cotton, cotton percale, linen blends, wool and other premium natural Indian textiles. We use consciously sourced natural dyes and surplus fabric from the industry.",
  },
  {
    question: "Who makes them?",
    answer:
      "Every Kompanion is designed in-house and made in collaboration with craft clusters across India, using artisanal processes including traditional Dabu hand-block printing.",
  },
  {
    question: "How do I care for natural fibres?",
    answer:
      "Wash cool and gently, dry in shade, and skip the fabric softener - it coats the fibre and flattens a waffle weave's texture. Naturally dyed and hand-printed pieces will soften and settle with use; that shift is the material behaving as it should.",
  },
  {
    question: "Do you take bulk or private label orders?",
    answer:
      "Yes. Alongside retail we run bespoke bulk production partnerships, tailoring custom textile concepts for luxury boutiques, interior studios and premium hospitality brands. Write to us with your brief to start a conversation.",
  },
] as const;

export const footerColumns = [
  {
    title: "Shop",
    links: [
      { title: "Kozy Lounge", path: "/search/kozy-lounge" },
      { title: "Kessentials", path: "/search/kessentials" },
      { title: "Morning Luxuries", path: "/search/morning-luxuries" },
      { title: "Pet & Parent", path: "/search/pet-parent" },
    ],
  },
  {
    title: "Studio",
    links: [
      { title: "About", path: "/about-us" },
      { title: "Kraft & Materials", path: "/about-us" },
      { title: "Journal", path: "/blogs" },
      { title: "B2B & Private Label", path: "/contact" },
    ],
  },
  {
    title: "Contact",
    links: [
      { title: site.instagram, path: site.instagramUrl },
      { title: "care@kozyliving.com", path: "mailto:care@kozyliving.com" },
      { title: "Get in touch", path: "/contact" },
    ],
  },
  {
    title: "Social Media",
    links: [
      { title: "Instagram", path: site.instagramUrl },
      { title: "Pinterest", path: "https://pinterest.com" },
      { title: "YouTube", path: "https://youtube.com" },
    ],
  },
] as const;

/** The two links that close the page, beside the copyright. */
export const legalLinks = [
  { title: "Terms & Condition", path: "/terms-of-service" },
  { title: "Privacy Policy", path: "/privacy-policy" },
] as const;

export const socialLinks = [
  { title: "Instagram", href: site.instagramUrl },
  { title: "Pinterest", href: "https://pinterest.com" },
  { title: "YouTube", href: "https://youtube.com" },
  { title: "Email", href: "mailto:care@kozyliving.com" },
] as const;

/* ------------------------------------------------------------------ gi tag */

/**
 * The GI mark on the product buy panel.
 *
 * Every line here is the artwork's own wording, transcribed - including
 * "Kraft", which is the badge's spelling and must not be normalised away.
 *
 * `note` is the only line that is not on the badge, and it deliberately
 * explains what a Geographical Indication IS rather than making any further
 * claim about this product. A GI is a legal certification; the badge asserts
 * one, and this file does not get to add to it. See the note in CLAUDE.md
 * about the mark currently rendering on every product unconditionally.
 */
export const giTag = {
  title: "Jodhpur Block Print",
  /* Sits on the same line as the title, in caption size. */
  subtitle: "A GI Registered Kraft",
  note: "A Geographical Indication is a legal mark that ties a craft to the place it is made and the method registered to it. Jodhpur block print carries one.",
  /** Alt text for the mark itself, for anyone who cannot see it. */
  alt: "Jodhpur Block Print - a GI registered Kraft",
} as const;

/* ------------------------------------------------------------------ contact */

/**
 * TODO(brand): the email, phone and studio addresses below are placeholders
 * carried over from the site scaffold and have NOT been verified. Instagram is
 * the only channel confirmed. Replace before launch - these also feed the
 * footer and the organisation JSON-LD in `layout.tsx`.
 */
export const contact = {
  eyebrow: "Get in touch",
  title: "Say hello to the studio",
  body: [
    "Questions about a Kompanion, fabric and care, custom sizing, or a bulk and private label brief? The studio reads everything that comes in.",
    "Send the form below, write to us directly, or reach us on Instagram - whichever is easiest for you.",
  ],
  email: "care@kozyliving.com",
  instagram: site.instagram,
  instagramUrl: site.instagramUrl,
  phone: "(+91) 8494 907 007",
  phoneHref: "+918494907007",
  locations: [
    {
      label: "Design Studio",
      lines: ["Kozy Living Studio", "India"],
    },
    {
      label: "B2B & Private Label",
      lines: [
        "Bespoke bulk production for boutiques,",
        "interior studios and hospitality.",
        "Share your brief to begin.",
      ],
    },
  ],
} as const;

/* ------------------------------------------------------------- newsletter */

/** Copy for the ritual signup card. The two body lines follow the artwork. */
export const newsletter = {
  title: "Shall we share a ritual",
  /** Two lines, broken by hand - the rag is part of the drawing. */
  body: [
    "Sign up and we shall send you",
    "a little Kozy ritual, every now & then.",
  ],
  placeholder: "your email",
  cta: "Begin your ritual",
  sending: "Joining…",
  /** The card after Shopify has the address. */
  thanks: "Welcome to the ritual.",
  thanksBody:
    "A little Kozy ritual will find its way to your inbox, every now & then.",
} as const;

/* ---------------------------------------------------------------- about page */

/**
 * Photography for `/about-us`. `src: null` renders the designed placeholder
 * plate rather than a broken image - drop real paths in as shoots land.
 */
export const aboutImages = {
  studio: {
    src: null,
    alt: "Waffle weave and slub cotton Kompanions laid out on the studio table.",
    aspect: "1/1",
  },
  kraft: {
    src: null,
    alt: "A Dabu hand-block being pressed into mud resist before the indigo dye bath.",
    aspect: "1/1",
  },
  lounge: {
    src: null,
    alt: "A floor lounge setup with biscuit floor pillows and a linen blend throw.",
    aspect: "2/3",
  },
} as const;

/**
 * The About masthead and the four collections beneath it. The numerals are the
 * ordering of the verticals - this section used to carry a fabricated
 * year-by-year company timeline.
 */
export const heritage = {
  eyebrow: "What we make",
  title: "Krafted to Give You Moments of Rest.",
  body: "Kozy Living Textiles are your in-between Kompanions - designed in-house, made with craft clusters across India, and krafted to turn everyday moments into mindful daily rituals.",
  collections: [
    {
      index: "01",
      title: "The Kozy Lounge",
      body: "Low seating built for the floor - mini soft floor lounge seating, structured biscuit floor pillows, and playful throw pillows and plush textile shapes that stand in for fragile ceramic decor.",
    },
    {
      index: "02",
      title: "Kessentials & Morning Luxuries",
      body: "A lifestyle vertical built around the first hour of the day: high-absorbency natural waffle weave robes, ritual kits and everyday loungewear.",
    },
    {
      index: "03",
      title: "Pet & Parent",
      body: "Dabu-printed artisan pet carriers, pet clothing and matching parent accessories - the same fibres and prints, scaled for both ends of the leash.",
    },
    {
      index: "04",
      title: "B2B & Private Label",
      body: "Bespoke bulk production partnerships, tailoring custom textile concepts for luxury boutiques, interior studios and premium hospitality brands.",
    },
  ],
} as const;

/**
 * Why craft-led textiles. The stat values are words, not invented percentages
 * - every figure here is a claim the brand actually makes.
 */
export const whyKraft = {
  eyebrow: "Why kraft-led",
  title: "Why slow, natural and made by hand?",
  body: "Synthetic decor is made to be looked at and replaced. Natural fibres worked by hand are made to be used, and they get better at it.",
  stats: [
    {
      value: "100%",
      label: "Natural Fibres",
      note: "Cotton, linen blends and wool - no synthetics",
    },
    {
      value: "Dabu",
      label: "Hand-Block Printed",
      note: "Traditional mud-resist printing, block by block",
    },
    {
      value: "In-House",
      label: "Designed in the Studio",
      note: "Made with craft clusters across India",
    },
    {
      value: "Surplus",
      label: "Consciously Sourced",
      note: "Natural dyes and surplus industry fabric",
    },
  ],
  comparison: [
    {
      trait: "Fibre",
      conventional: "Synthetic blends and microfibre",
      kozy: "100% natural fibres",
    },
    {
      trait: "Print",
      conventional: "Bulk machine screen printing",
      kozy: "Dabu hand-block printing with craft clusters",
    },
    {
      trait: "Sourcing",
      conventional: "Virgin fabric ordered in volume",
      kozy: "Consciously sourced natural and surplus fabric",
    },
    {
      trait: "Purpose",
      conventional: "Decor that is looked at",
      kozy: "Kompanions that are used, every day",
    },
    {
      trait: "Function",
      conventional: "One styled position, one job",
      kozy: "Multipurpose by design",
    },
  ],
} as const;

/** Five numbered steps from the studio to your everyday. */
export const studioToEveryday = {
  eyebrow: "Studio to everyday",
  title: "Five steps. No shortcuts.",
  steps: [
    {
      title: "Designed In-House",
      body: "Every print, form and Kompanion starts in our own studio, drawn around a routine somebody already has.",
    },
    {
      title: "Natural Fibres Only",
      body: "Cotton waffle weave, slub cotton, cotton percale, linen blends and wool - consciously sourced, including surplus fabric from the industry.",
    },
    {
      title: "Made With Craft Clusters",
      body: "Production happens in collaboration with craft clusters across India, using artisanal processes rather than volume machinery.",
    },
    {
      title: "Hand-Block Printed",
      body: "Dabu mud-resist printing is stamped block by block before dyeing, so no two repeats are identical.",
    },
    {
      title: "Built Multipurpose",
      body: "Each Kompanion is designed to do more than one job, so it fits into everyday living instead of waiting for an occasion.",
    },
  ],
} as const;

export const sustainability = {
  eyebrow: "Conscious by default",
  title: ["Kraft that respects the hand", "and the material."],
  body: "Being conscious is not a line on our packaging - it decides which fibre we buy, who makes the cloth, and how long the Kompanion is expected to last.",
  pillars: [
    {
      title: "Natural Fibres Only",
      body: "100% natural Indian textiles - cotton waffle weave, slub cotton, percale, linen blends and wool.",
    },
    {
      title: "Surplus & Natural Dyes",
      body: "Consciously sourced natural dyes and surplus fabric from the industry, kept in use rather than discarded.",
    },
    {
      title: "Craft Cluster Collaboration",
      body: "Made with craft clusters across India, sustaining artisanal processes like Dabu hand-block printing.",
    },
    {
      title: "Multipurpose Longevity",
      body: "Designed to be multipurpose and lived with daily, so one Kompanion replaces several single-use pieces.",
    },
  ],
} as const;

/**
 * Who makes it. Only the founder is a named individual - the previous version
 * of this section invented a four-person leadership team.
 */
export const collective = {
  eyebrow: "The collective",
  title: "Designed in-house. Made by hand.",
  strapline:
    "Rooted in Indian kraft, expressed through a modern design language",
  members: [
    {
      name: site.founder,
      role: "Founder & Design Lead",
      credential: site.founderCredential,
      body: "A textile design graduate of NIFT Delhi, Khushi founded Kozy Living on the belief that intention doesn't come from adding more, but from engaging deeply with the routines that already exist.",
    },
    {
      name: "Craft Clusters",
      role: "Makers across India",
      credential: "Artisanal processes, including Dabu",
      body: "Our Kompanions are made in collaboration with craft clusters across the country, whose hand-block printing and finishing carry techniques no machine reproduces.",
    },
    {
      name: "The Studio",
      role: "Design & Development",
      credential: "In-house print and product design",
      body: "Prints, organic forms and colour are developed in-house, then worked out on the cloth itself - so what ships is what the material actually wants to do.",
    },
  ],
} as const;

/**
 * The signed note that closes the story.
 *
 * TODO(brand): written in studio voice and signed by the studio on purpose.
 * If Khushi wants this in first person, replace the body with her own words
 * before changing the signature to her name.
 */
export const studioNote = {
  eyebrow: "A note from the studio",
  title: "Intention doesn't come from adding more.",
  body: [
    "It comes from engaging deeply with the routines that already exist. The ten minutes on the floor before the day starts. The robe after a shower. The corner you keep coming back to.",
    "We krafted Kozy Living Textiles to sit inside those moments rather than ask for new ones - your in-between Kompanions, made from natural fibres by hands we know.",
  ],
  signature: `The ${site.name} Studio`,
  signatureRole: `Founded by ${site.founder} · ${site.founderCredential}`,
} as const;

/** Closing band on `/about-us` - the handoff to the shop. */
export const aboutCta = {
  eyebrow: "Natural fibres · Hand-block printed",
  title: ["Meet your", "in-between Kompanions."],
  body: "Krafted in small batches from 100% natural fibres, in collaboration with craft clusters across India.",
  cta: "Shop all Kompanions",
  href: "/search",
} as const;

/* ------------------------------------------------------- the kozy story page */

/**
 * `/the-kozy-story` - the brand's own account of itself, in the founder’s
 * words rather than the studio's.
 *
 * The handle is a Shopify page (`pages/the-kozy-story`, linked from the live
 * menu), so this copy DELIBERATELY shadows whatever body that page carries:
 * the route is a designed one, the same way `/shop-by-colour` is. See §4 of
 * CLAUDE.md.
 *
 * House spelling applied to the source copy: companions -> Kompanions, and
 * the standalone verb crafted -> krafted. The ordinary noun is left alone -
 * "Indian craft", "craft clusters" and "colour, craft & consciousness" are
 * correct as written.
 */
export const kozyStory = {
  eyebrow: "The Kozy Story",
  title: "Designed to give you moments of rest.",
  lede: "Kozy Living Textiles are your in-between Kompanions, krafted to turn everyday moments into mindful daily rituals.",
  /** The band that closes the masthead - the site's signature bleeding line. */
  wordmark: "moments of rest",
  seal: "the kozy story · krafted for rest · ",
  /** Studio stills, used when the live collection photography is unavailable. */
  alt: "Waffle weave and Dabu hand-block printed Kompanions in the studio.",
  collection: "kessentials",
  /**
   * The chapters: how a Kompanion is made, told through the brand's own
   * process photography, in the order the work happens - the cloth is
   * printed as yardage, then patterned and cut, then finished.
   *
   * EVERY LINE HERE IS EITHER WHAT ITS PHOTOGRAPH SHOWS OR WHAT THE STORE
   * ALREADY SAYS. The maker credits are the merchant's own product copy in
   * Shopify: "Printed by Artisans of Yaseen Bhai Block Print Craft Cluster"
   * (Tulsi Ritual Robe), Dabu "of Jodhpur" (Sunshine Floor Pillow, the Flow
   * Kloud slippers), natural indigo and "Syahi (Iron Black)" (Dabu Speckled
   * Cushion, Polka Kloud Komfort). Nothing else is named: headcounts, years
   * and the individuals in these frames have not been given to us.
   *
   * TODO(brand): the copy credits the cluster for the work, NOT for these
   * particular photographs. Confirm with the studio before tying a named
   * printer or cluster to a specific frame.
   *
   * `media` is a raw Shopify file URL (resized by `ShopImage`'s loader - the
   * pattern photo is a HEIC, which only Safari can show as-is, and Shopify
   * converts it to WebP/JPEG as soon as a width is asked for) or a clip.
   * The clip's poster is a frame of it saved locally, so the card is never
   * an empty tint before the video decodes.
   */
  chaptersEyebrow: "How it is made",
  chaptersTitle: "Made by hand, with craft clusters across India.",
  chapters: [
    {
      index: "01",
      kicker: "Hand-block printing",
      title: "One block, pressed by hand.",
      body: "Every repeat is printed by hand, by block-print artisans in Jodhpur - among them the Yaseen Bhai Block Print Craft Cluster. The printer sets a carved wooden block against the last impression and presses it in, square by square, down a long padded table.",
      media: {
        type: "image",
        url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1664_cc6a4799-b520-4db1-b9d2-bab197e0d74c.jpg?v=1790369997",
        alt: "A printer pressing a carved wooden block into white cloth, building a checked repeat by hand.",
      },
    },
    {
      index: "02",
      kicker: "Dabu mud-resist",
      title: "Printed in mud, before the dye.",
      body: "Dabu is a mud resist. The block is lifted from a tray of mud paste and laid down line by line; wherever the paste sits, the dye - natural indigo, or syahi, an iron black - cannot reach, and the pattern shows once the cloth is washed.",
      media: {
        type: "image",
        url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/PHOTO-2026-04-25-15-43-08_34c1e353-99d4-49b1-a326-7c28afb0d0cd.jpg?v=1790369996",
        alt: "A printer lifting a wooden block from a tray of mud paste to print striped chevrons in Dabu resist.",
      },
    },
    {
      index: "03",
      kicker: "Pattern & cutting",
      title: "Drafted on paper, then cut.",
      body: "Before any cloth is cut, each piece is drafted as a paper pattern - squared with a ruler, measured with the tape and checked against its spec sheet - so every Kompanion is cut to the same line.",
      media: {
        type: "image",
        url: "https://cdn.shopify.com/s/files/1/0700/6476/7047/files/IMG_1641.heic?v=1790369998",
        alt: "A pattern master drafting a paper pattern with an L-square, a tape measure around his neck.",
      },
    },
    {
      index: "04",
      kicker: "The finished cloth",
      title: "Krafted for your daily rituals.",
      body: "Printed, washed and finished, the cloth keeps the small shifts only a hand-pressed block leaves - then it is stitched into a Kompanion, labelled, and sent on to your everyday.",
      media: {
        type: "video",
        url: "https://cdn.shopify.com/videos/c/o/v/806a125208a44b90ad1c2e7ae99d6494.mp4",
        poster: "/media/finished-cloth-poster.jpg",
        alt: "Close-up of finished hand-printed cloth, green rings around a blue flower, with a Kozy Living label tape.",
      },
    },
  ],
  /**
   * The fibres, named and nothing more. Every weave here is one the brand
   * lists; no hand or weight counts, because none have been given to us.
   */
  fibresEyebrow: "The material palette",
  fibresTitle: "Five natural Indian textiles.",
  /** Follows the count ("5 weaves, all natural."). */
  fibresNote: "weaves, all natural.",
  /** Desktop only - it describes the hover card, which phones do not get. */
  fibresHint: "Hover or pick a row to see the cloth.",
  /**
   * The notes describe the WEAVE, not the product: "plain weave" and "slub"
   * are what those cloths are, which is checkable, where a hand-feel or a GSM
   * would be a claim nobody has given us. Keep them definitional.
   */
  fibres: [
    /*
     * `product` is the Kompanion the card shows for this weave - a handle
     * picked because the product's own Shopify copy names the fabric, so
     * the photograph is of the cloth the row describes. Waffle: the Kozy
     * Kloud Robe ("Fabric: 100% Natural Cotton Waffle"). Slub: the Kozy
     * Biscuit Floor Pillow ("breathable cotton slub").
     *
     * Percale, linen blends and wool have NO product in the catalogue yet,
     * so they carry none and the card shows the weave's name on an oat panel
     * rather than a borrowed photograph of some other cloth - that mismatch
     * is exactly what this list used to show. Add the handle here when one
     * ships. A handle that stops resolving falls back to the same panel.
     */
    { index: "01", name: "Cotton waffle weave", note: "Textured and highly absorbent", product: "hoodie-robe" },
    { index: "02", name: "Slub cotton", note: "Irregular slub, woven in", product: "biscuits-floor-pillow-with-gusset" },
    { index: "03", name: "Cotton percale", note: "Plain weave, crisp and closed" },
    { index: "04", name: "Linen blends", note: "Linen worked with natural fibres" },
    { index: "05", name: "Wool", note: "Naturally insulating" },
  ],
  /** Card caption and the line under the list, when the weave has a Kompanion. */
  fibreSeenIn: "Seen in the",
  /** The same, for a weave with no Kompanion in the catalogue yet. */
  fibreInPalette: "Part of the material palette",
  /** The control under the list that steps to the next weave. */
  fibreNext: "Next weave",
  /**
   * The collage band. One solid line and three ghosted ones, with small
   * photographs scattered between them - the page's loudest gesture, and the
   * reason the story does not open on a column of body copy.
   */
  collage: {
    lead: "Kraft-led & Konscious",
    ghosts: ["Natural fibres", "Dabu hand-block", "Colour & comfort"],
    note: "Four things the cloth carries before it ever reaches a room.",
    /** The lines switch the photographs; ghosted type does not say so alone. */
    hint: "Choose one to see it.",
  },
  /** The line the whole page is built to arrive at. */
  close: {
    eyebrow: "A reminder",
    /** Joined and set as one balanced run - the breaks are not kept. */
    lines: ["You don’t need to add", "more to your day. Just do", "what you do with more intention."],
    /** Ringed by the hand-drawn ellipse. Must appear in `lines` verbatim. */
    circled: "more intention",
    body: "Kozy Living Textiles is a reminder that intention is not another thing to add. It is the way you do what you already do.",
    primary: { label: "Read the founder’s note", href: "/founders-note" },
    secondary: { label: "Shop all Kompanions", href: "/search" },
  },
} as const;

/* ------------------------------------------------------- founder’s note page */

/**
 * `/founders-note` - Khushi's own letter, first person.
 *
 * `studioNote` on `/about-us` says a version of this in studio voice and is
 * signed by the studio; this is the founder speaking, and is the only place
 * on the site that does. Keep the two in step if either is revised.
 *
 * "Kozy Klub" is the brand's own term for its readers and is spelled that way
 * on purpose.
 */
export const foundersNote = {
  eyebrow: "Founder’s note",
  /** Set as display type, split word by word. */
  title: "I realised intention doesn’t come from adding more.",
  standfirst: "It comes from engaging deeply with the routines that already exist.",
  body: [
    "Having studied Textile Design at NIFT Delhi, and being grateful for the recognition my work has received, I’ve always been drawn to how textiles shape emotion, atmosphere and everyday living.",
    "While creating my own space, I found myself looking for home textiles that felt joyful and expressive, contemporary yet rooted in Indian craft. When I couldn’t find them, I began to create them.",
    "Kozy Living grew from that exploration. A journey to bring colour, craft and consciousness into daily life. We turn familiar routines into moments of restful intention.",
  ],
  pull: "This is your gentle invitation to be mindful, present and full of colour.",
  welcome: "Welcome to your Kozy Klub",
  signature: site.founder,
  signatureRole: site.founderCredential,
  cta: { label: "Meet the Kompanions", href: "/search" },
  back: { label: "The Kozy Story", href: "/the-kozy-story" },
} as const;
