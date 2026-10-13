import { toMinor } from "@/components/cart/cart-math";
import {
  findKitVariant,
  fromPrice,
  isFabric,
  type KitRequest,
} from "@/lib/shop/kit";
import type {
  Image as ShopifyImage,
  KitBuilder as KitData,
  KitPiece,
} from "@/lib/shopify/types";
import { kitBuilder as copy } from "@/lib/site";

/* ---------------------------------------------------------------------------
   The kit builder's model: what a selection means, which steps it asks, what
   is still missing and what it costs. Pure functions, no React.

   Two surfaces build kits - the `/kit-builder` page (`kit-builder.tsx`) and
   the homepage atelier (`components/home/kit-atelier.tsx`) - and they look
   nothing alike. This file is what they must agree on, so a choice made on
   either resolves, prices and validates the same way. Server-side checks
   are `lib/shop/kit.ts` and `addKitItem`; nothing here is trusted by the cart.
--------------------------------------------------------------------------- */

export type KitSelection = {
  /** Chosen pieces in the order they were picked, with their sizes. */
  pieces: { id: string; sizes: Record<string, string> }[];
  fabricId: string;
  /** The cloth colour, from the chosen fabric's own list. */
  colourId: string | null;
  threadId: string | null;
};

export type StepKey = "pieces" | "fabric" | "colour" | "embroidery";

export const MAX_KIT_QUANTITY = 10;

/** Long enough to see the tick land on the choice before the guide moves on. */
export const ADVANCE_MS = 480;

/** A kit with nothing chosen, in the fabric the merchant marked default. */
export function emptySelection(kit: KitData): KitSelection {
  return {
    pieces: [],
    fabricId:
      kit.fabrics.find((candidate) => candidate.isDefault)?.id ??
      kit.fabrics[0]!.id,
    colourId: null,
    threadId: null,
  };
}

/** The photograph of a piece in a fabric: a variant's own image if it has one. */
export function pieceImage(
  piece: KitPiece,
  fabricValue: string,
): ShopifyImage | null {
  const variant = piece.variants.find(
    (candidate) => isFabric(candidate, fabricValue) && candidate.image?.url,
  );
  return variant?.image ?? piece.image ?? piece.images[0] ?? null;
}

/**
 * Pale threads (silver, cream) vanish on the oat plate, so their preview sits
 * on indigo instead. Relative luminance, the WCAG formula.
 */
export function isPale(hex: string | null) {
  if (!hex) return false;
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.45;
}

/**
 * A selection as `/kit-builder` query parameters - what the page reads on
 * the server to paint a kit already built. Initials are never written: they
 * are personal text, not shareable state.
 */
export function kitQuery(kit: KitData, selection: KitSelection) {
  const params = new URLSearchParams();
  const chosen = selection.pieces
    .map((entry) => kit.pieces.find((piece) => piece.id === entry.id))
    .filter((piece): piece is KitPiece => Boolean(piece));
  if (chosen.length)
    params.set("pieces", chosen.map((piece) => piece.handle).join(","));
  for (const piece of chosen) {
    const sizes = selection.pieces.find(
      (entry) => entry.id === piece.id,
    )!.sizes;
    const values = piece.sizeOptions.map((option) => sizes[option.name] ?? "");
    if (values.some(Boolean)) params.set(piece.handle, values.join("|"));
  }
  const fabric = kit.fabrics.find(
    (candidate) => candidate.id === selection.fabricId,
  );
  if (fabric && !fabric.isDefault) params.set("fabric", fabric.handle);
  const colour = kit.colours.find(
    (candidate) => candidate.id === selection.colourId,
  );
  if (colour) params.set("colour", colour.handle);
  const thread = kit.threads.find(
    (candidate) => candidate.id === selection.threadId,
  );
  if (thread) params.set("thread", thread.handle);
  return params.toString();
}

/** Sizes default to the only value there is; otherwise the shopper picks. */
export function defaultSizes(piece: KitPiece) {
  return Object.fromEntries(
    piece.sizeOptions
      .filter((option) => option.values.length === 1)
      .map((option) => [option.name, option.values[0]!]),
  );
}

/** The selection with `piece` added (sizes defaulted) or taken out. */
export function togglePieceIn(
  selection: KitSelection,
  piece: KitPiece,
): KitSelection {
  const has = selection.pieces.some((entry) => entry.id === piece.id);
  return {
    ...selection,
    pieces: has
      ? selection.pieces.filter((entry) => entry.id !== piece.id)
      : [...selection.pieces, { id: piece.id, sizes: defaultSizes(piece) }],
  };
}

/** The selection with one size option set on one piece. */
export function withSize(
  selection: KitSelection,
  pieceId: string,
  option: string,
  value: string,
): KitSelection {
  return {
    ...selection,
    pieces: selection.pieces.map((entry) =>
      entry.id === pieceId
        ? { ...entry, sizes: { ...entry.sizes, [option]: value } }
        : entry,
    ),
  };
}

/**
 * Everything the page knows about a selection, as a pure function of it.
 * Pure on purpose: an auto-advance has to know where the guide goes NEXT,
 * which means reading the state a click is about to create, before React
 * has rendered it.
 */
export function derive(kit: KitData, selection: KitSelection, initials: string) {
  const fabric =
    kit.fabrics.find((candidate) => candidate.id === selection.fabricId) ??
    kit.fabrics[0]!;
  const thread =
    kit.threads.find((candidate) => candidate.id === selection.threadId) ??
    null;
  // Colours are per fabric: Solid and Block printed each offer their own, and
  // a fabric with none simply skips the step.
  const colours = kit.colours.filter(
    (candidate) => candidate.fabricId === fabric.id,
  );
  const colour =
    colours.find((candidate) => candidate.id === selection.colourId) ?? null;

  // Each chosen piece resolved against the chosen fabric. A size picked in
  // Solid is kept across a switch to Block printed; when that size is sold
  // out in the new fabric the line says so rather than silently moving it.
  const lines = selection.pieces.flatMap((entry) => {
    const piece = kit.pieces.find((candidate) => candidate.id === entry.id);
    if (!piece) return [];
    const needsSize = piece.sizeOptions.find(
      (option) => !entry.sizes[option.name],
    );
    const variant = needsSize
      ? undefined
      : findKitVariant(piece, fabric.optionValue, entry.sizes);
    return [
      {
        piece,
        entry,
        variant,
        needsSize,
        soldOut: !needsSize && !variant?.availableForSale,
      },
    ];
  });
  const embroiderable = lines.filter(({ piece }) => piece.embroiderable);

  // A single fabric is a fact, not a question; no colours, no colour step;
  // no threads, no embroidery step.
  const steps: StepKey[] = ["pieces"];
  if (kit.fabrics.length > 1) steps.push("fabric");
  if (colours.length) steps.push("colour");
  if (kit.threads.length) steps.push("embroidery");

  // The same rules `addKitItem` enforces, filed under the step that answers
  // them, so the guide can send the shopper to exactly that step.
  const errors = copy.errors;
  const minPieces = Math.max(1, kit.minPieces);
  const missing = lines.find((line) => line.needsSize);
  const gone = lines.find((line) => line.soldOut);
  const stepIssue: Record<StepKey, string | null> = {
    pieces:
      lines.length < minPieces
        ? errors.tooFew(minPieces)
        : missing
          ? errors.size(missing.piece.title)
          : gone
            ? errors.soldOut(gone.piece.title)
            : null,
    fabric: null,
    colour: colours.length && !colour ? errors.colour : null,
    embroidery:
      thread && !initials
        ? errors.initials
        : thread && !embroiderable.length
          ? errors.noEmbroiderable
          : null,
  };
  const issueStep = steps.find((step) => stepIssue[step]) ?? null;

  return {
    fabric,
    thread,
    colours,
    colour,
    lines,
    embroiderable,
    steps,
    stepIssue,
    issue: issueStep
      ? { step: issueStep, message: stepIssue[issueStep]! }
      : null,
  };
}

export type Derived = ReturnType<typeof derive>;

export function isDone(d: Derived, confirmed: StepKey[], step: StepKey) {
  return !d.stepIssue[step] && confirmed.includes(step);
}

/** The first unfinished step after `from`, wrapping round; null when all are done. */
export function nextAfter(
  d: Derived,
  confirmed: StepKey[],
  from: StepKey | null,
) {
  const todo = d.steps.filter((step) => !isDone(d, confirmed, step));
  const at = from ? d.steps.indexOf(from) : -1;
  return (
    d.steps.slice(at + 1).find((step) => todo.includes(step)) ?? todo[0] ?? null
  );
}

/** The steps a selection read from the URL counts as already answered. */
export function resumed(kit: KitData, initial: KitSelection): StepKey[] {
  if (!initial.pieces.length) return [];
  const first = derive(kit, initial, "");
  return first.issue ? ["pieces"] : first.steps;
}

/**
 * The chosen pieces priced in a fabric, in minor units. A piece with no
 * size picked yet counts at its cheapest in-stock price, so a fabric card
 * can quote the kit before every size is in.
 */
export function priceInFabric(d: Derived, fabricValue: string) {
  return d.lines.reduce((sum, { piece, entry }) => {
    const variant = findKitVariant(piece, fabricValue, entry.sizes);
    const price = variant
      ? Number(variant.price.amount)
      : fromPrice(piece, fabricValue);
    return sum + toMinor(price ?? 0);
  }, 0);
}

/** One kit's price in minor units: resolved pieces, plus charged initials. */
export function unitPrice(kit: KitData, d: Derived, initials: string) {
  const initialsMinor =
    d.thread && initials && kit.initialsPrice
      ? toMinor(kit.initialsPrice.amount)
      : 0;
  return (
    d.lines.reduce(
      (sum, line) => sum + toMinor(line.variant?.price.amount ?? 0),
      0,
    ) + initialsMinor
  );
}

/** What `addKitItem` is sent. Re-resolved there; nothing here is trusted. */
export function kitRequest(
  d: Derived,
  initials: string,
  quantity: number,
): KitRequest {
  return {
    pieces: d.lines.map(({ entry }) => ({
      pieceId: entry.id,
      sizes: entry.sizes,
    })),
    fabricId: d.fabric.id,
    ...(d.colour ? { colourId: d.colour.id } : {}),
    ...(d.thread && initials ? { threadId: d.thread.id, initials } : {}),
    quantity,
  };
}

/** `--header-h` is a rem estimate until `HeaderHeight` writes the measured px. */
export function headerOffset() {
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue("--header-h").trim();
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return 96;
  return raw.endsWith("rem")
    ? value * parseFloat(getComputedStyle(root).fontSize)
    : value;
}

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
