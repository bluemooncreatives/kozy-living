import type { Product, ProductAddOn } from "@/lib/shopify/types";
import { faq } from "@/lib/site";

/**
 * The FAQ board's data: which questions, under which topics, in which order.
 * Server-only in practice (it is fed live collections and add-ons), but kept
 * free of Shopify calls so the two callers decide what to fetch.
 *
 * A product's CATEGORY comes from its collections, because every product on
 * this store has an empty `productType` - checked 2026-10-04, 92 of 92. The
 * collections are many and overlapping (a ritual kit sits in Bathrobes too, a
 * pet floor pillow in Krafted by Kozy), so the categories are tried in a fixed
 * precedence and the first one the product belongs to wins:
 *
 *   pet  >  ritual kits  >  bathrobes  >  slippers  >  pillows
 *
 * Pet leads because its shelves hold pillows and seating that are the pet's,
 * not the sofa's; kits lead robes because a kit's questions are about the box,
 * not the sleeve. About fifteen products are in no collection at all, so the
 * title is the fallback, read with the same precedence.
 */

export type FaqCategoryKey = keyof typeof faq.categories;

type Category = {
  key: FaqCategoryKey;
  collections: readonly string[];
  /** Tried against the title only when no collection matched. */
  words: RegExp;
  /** The shelf the "Shop ..." link opens - the menu's own choice of page. */
  shelf: string;
  /** Generic answers that become product-specific, or go, on a product page. */
  swaps: Partial<Record<OptionKind, string>>;
};

/* Handles, not titles: these are identifiers (§4 of CLAUDE.md). The
   misspelled ones are the store's real handles - see "Known Shopify data
   defects" - and must be renamed in Admin, with a redirect, before here. */
const CATEGORIES: readonly Category[] = [
  {
    key: "pet",
    collections: ["pet-collection", "pet-carrier", "pet-seating", "pet-clothing", "pet-parent"],
    words: /\b(pets?|karrier|carrier|furrie|cat|dog)\b/i,
    shelf: "pet-collection",
    swaps: { sizes: "pet-karrier-size" },
  },
  {
    key: "ritual-kits",
    collections: ["ritual-kits", "kessentials-ritual-kit", "krafted-rituals-kit"],
    words: /\b(kit|ritual (companion|kompanion) set)\b/i,
    shelf: "ritual-kits",
    swaps: {},
  },
  {
    key: "bathrobes",
    collections: ["bathrobes", "kessentials-bathrobes", "kozy-by-crafted-bathrobes"],
    words: /\brobes?\b/i,
    shelf: "bathrobes",
    swaps: { sizes: "robe-sizes", sleeves: "robe-sleeves" },
  },
  {
    key: "slippers",
    collections: ["slippers", "slippers-copy", "slippers-copy-1"],
    words: /\bslippers?\b/i,
    shelf: "slippers",
    swaps: { sizes: "slipper-sizes" },
  },
  {
    key: "pillows",
    collections: ["dabu-printed-pillows", "decorative-pillows"],
    words: /\b(pillows?|cushions?)\b/i,
    shelf: "dabu-printed-pillows",
    swaps: { filler: "pillow-filler" },
  },
];

export type FaqTag = { label?: string; values: string[] };

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  /** Option values shown as tags under the answer - a product's real sizes. */
  tags?: FaqTag[];
  link?: { label: string; href: string };
};

export type FaqTopic = {
  key: string;
  label: string;
  group: "topics" | "categories";
  /** One line over the rows. Categories carry one; shared topics do not. */
  blurb?: string;
  items: FaqItem[];
  /** Closes the list: the category's shelf, when it resolves. */
  shop?: { label: string; href: string };
};

export type FaqBoardData = {
  eyebrow: string;
  title: string;
  lede: string;
  topics: FaqTopic[];
};

/* ----------------------------------------------------------- categories */

export function faqCategoryFor(
  product: Pick<Product, "title" | "collections">,
): Category | null {
  const handles = new Set(product.collections.map((c) => c.handle));

  return (
    CATEGORIES.find((c) => c.collections.some((h) => handles.has(h))) ??
    CATEGORIES.find((c) => c.words.test(product.title)) ??
    null
  );
}

/* -------------------------------------------------------------- options */

type OptionKind = "sizes" | "sleeves" | "filler";

/* "His Size" and "Her Size" are both sizes; "Sleeve Detail" and "Sleeve Style"
   are both sleeves. The merchant names options freely, so match the word. */
const OPTION_TESTS: Record<OptionKind, RegExp> = {
  sizes: /\bsizes?\b/i,
  sleeves: /\bsleeves?\b/i,
  filler: /\b(cushion type|filler)\b/i,
};

/**
 * Option values as the merchant typed them are not consistent - "s-m" on one
 * robe, "S-M" on the next, "uk-3-4" beside "UK 3-4", and one robe's sleeves
 * are slugs ("wide-open-sleeve"). These are tidied for display only; the
 * variant picker above still shows the raw values, and they still match.
 */
function tidy(value: string) {
  const v = value.trim();
  if (/^uk[-\s]?\d/i.test(v)) return `UK ${v.replace(/^uk[-\s]?/i, "")}`;
  if (/^[a-z0-9]{1,4}(-[a-z0-9]{1,4})?$/i.test(v)) return v.toUpperCase();
  // A slug, and only a slug: "Small:2-4kg" also has no space.
  if (/^[a-z]+(-[a-z]+)+$/.test(v)) {
    const words = v.replace(/-/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return v;
}

function optionTags(product: Product, kind: OptionKind): FaqTag[] {
  const matching = product.options.filter(
    (option) =>
      OPTION_TESTS[kind].test(option.name) &&
      // A single-variant product reports one "Title: Default Title" option.
      option.values.some((value) => value !== "Default Title"),
  );

  return matching.map((option) => ({
    // Only labelled when there are two - "His Size" beside "Her Size".
    label: matching.length > 1 ? option.name : undefined,
    values: option.values.map(tidy),
  }));
}

function optionItem(product: Product, kind: OptionKind): FaqItem | null {
  const tags = optionTags(product, kind);
  if (!tags.length) return null;

  const { dynamic } = faq;
  const id = `product-${kind}`;

  if (kind === "sizes") {
    return {
      id,
      question: dynamic.sizes.question,
      answer: dynamic.sizes.answer(product.title),
      tags,
      link: { label: faq.help.primary.label, href: faq.help.primary.href },
    };
  }

  const copy = kind === "sleeves" ? dynamic.sleeves : dynamic.filler;
  return { id, question: copy.question, answer: copy.answer, tags };
}

/* --------------------------------------------------------------- add-ons */

function money({ amount, currencyCode }: ProductAddOn["price"]) {
  const value = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

/**
 * The personalisation answers, written from the add-ons Shopify actually
 * offers. An add-on that is switched off in Admin takes its question with it,
 * and a price change there is a price change here.
 */
function addOnItems(addOns: ProductAddOn[]): FaqItem[] {
  const live = addOns.filter((addOn) => addOn.available);
  const initials = live.find((addOn) => addOn.kind === "initials");
  const gift = live.find((addOn) => addOn.kind === "gift_box");
  const items: FaqItem[] = [];

  if (initials) {
    items.push({
      id: "personalise",
      question: faq.dynamic.personalise.question,
      answer: faq.dynamic.personalise.answer(
        money(initials.price),
        initials.maxLength,
      ),
    });
  }

  if (gift) {
    items.push({
      id: "gift",
      question: faq.dynamic.gift.question,
      answer: faq.dynamic.gift.answer(money(gift.price)),
    });
  }

  return items;
}

/* --------------------------------------------------------------- topics */

/**
 * Copy's links are guarded the same way every hard-coded handle on this site
 * is: an unknown collection 404s here, so a link to one is dropped rather
 * than shipped (§6, "Guard the handle, always").
 */
function guard(item: FaqItem, live: Set<string>): FaqItem {
  const href = item.link?.href;
  if (!href?.startsWith("/search/")) return item;
  return live.has(href.slice("/search/".length))
    ? item
    : { ...item, link: undefined };
}

const copyItems = (items: readonly FaqItem[]): FaqItem[] =>
  items.map((item) => ({ ...item }));

function sharedTopics(addOns: ProductAddOn[]): FaqTopic[] {
  return faq.topics.map((topic) => ({
    key: topic.key,
    label: topic.label,
    group: "topics",
    items:
      topic.key === "ordering"
        ? [...addOnItems(addOns), ...copyItems(topic.items)]
        : copyItems(topic.items),
  }));
}

function categoryTopic(category: Category, live: Set<string>): FaqTopic {
  const copy = faq.categories[category.key];

  return {
    key: category.key,
    label: copy.label,
    group: "categories",
    blurb: copy.lede,
    items: copyItems(copy.items),
    shop: live.has(category.shelf)
      ? { label: faq.shop(copy.label), href: `/search/${category.shelf}` }
      : undefined,
  };
}

const finish = (topics: FaqTopic[], live: Set<string>) =>
  topics
    .map((topic) => ({
      ...topic,
      items: topic.items.map((item) => guard(item, live)),
    }))
    .filter((topic) => topic.items.length);

/** The homepage: one editorial list of the questions most visitors share. */
export function homeFaqData({
  addOns,
}: {
  addOns: ProductAddOn[];
}): FaqBoardData {
  const commonIds = [
    "what-are-kompanions",
    "made-from",
    "who-makes-them",
    "care",
    "what-is-dabu",
    "print-variation",
    "personalise",
    "gift",
    "sizing-help",
    "bulk",
  ];
  const items = sharedTopics(addOns).flatMap((topic) => topic.items);
  const byId = new Map(items.map((item) => [item.id, item]));

  return {
    ...faq.home,
    topics: finish(
      [{
        key: "common",
        label: "Common questions",
        group: "topics",
        items: commonIds.flatMap((id) => {
          const item = byId.get(id);
          return item ? [item] : [];
        }),
      }],
      new Set(),
    ),
  };
}

/**
 * A product page: its category's set leads, rewritten against the product.
 *
 * A generic answer about a CHOICE ("most robes come two ways") is wrong on a
 * product that offers no such choice, so each category names the answers its
 * options replace. If the product has the option, the answer is rebuilt from
 * its real values; if it does not, the answer goes. Options a category does
 * not swap (a kit's sizes) are inserted after the first answer instead.
 */
export function productFaqData({
  product,
  collections,
  addOns,
}: {
  product: Product;
  collections: Set<string>;
  addOns: ProductAddOn[];
}): FaqBoardData {
  const category = faqCategoryFor(product);
  const shared = sharedTopics(addOns);
  // The purchase questions come straight after the product's own.
  const ordered = [
    ...shared.filter((topic) => topic.key === "ordering"),
    ...shared.filter((topic) => topic.key !== "ordering"),
  ];

  const kinds: OptionKind[] = ["sizes", "sleeves", "filler"];

  if (!category) {
    // No category: the product's own options still get answered, at the top
    // of the purchase questions.
    const extra = kinds
      .map((kind) => optionItem(product, kind))
      .filter((item): item is FaqItem => Boolean(item));
    ordered[0] = { ...ordered[0]!, items: [...extra, ...ordered[0]!.items] };

    return { ...faq.product, topics: finish(ordered, collections) };
  }

  const topic = categoryTopic(category, collections);
  let items = topic.items;

  for (const kind of kinds) {
    const own = optionItem(product, kind);
    const swapped = category.swaps[kind];

    if (swapped) {
      items = items.flatMap((item) =>
        item.id === swapped ? (own ? [own] : []) : [item],
      );
    } else if (own) {
      items = [...items.slice(0, 1), own, ...items.slice(1)];
    }
  }

  const copy = faq.categories[category.key];

  return {
    eyebrow: copy.eyebrow,
    title: copy.title,
    lede: copy.lede,
    topics: finish([{ ...topic, items, blurb: undefined }, ...ordered], collections),
  };
}

/* --------------------------------------------------------------- JSON-LD */

/**
 * Every answer on the board, closed ones included - they are in the HTML
 * either way. The tags are folded into the text, so "Which sizes?" is
 * answered in the markup as it is on screen.
 */
export function faqJsonLd(topics: FaqTopic[]) {
  const seen = new Set<string>();

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: topics
      .flatMap((topic) => topic.items)
      .filter((item) => !seen.has(item.id) && seen.add(item.id))
      .map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: [
            item.answer,
            ...(item.tags ?? []).map((tag) =>
              [tag.label, tag.values.join(", ")].filter(Boolean).join(": "),
            ),
          ].join(" "),
        },
      })),
  };
}
