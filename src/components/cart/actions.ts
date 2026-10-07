"use server";

import {
  ADDON_PARENT_ATTRIBUTE,
  KIT_ATTRIBUTE,
  MAX_LINE_QUANTITY,
  TAGS,
} from "@/lib/constants";
import { isValidInitials } from "@/lib/shop/add-ons";
import { findKitVariant, isKitLine, type KitRequest } from "@/lib/shop/kit";
import { optionScore } from "@/lib/shop/variant-match";
import {
  CartMutationError,
  addToCart,
  createCart,
  getAddOns,
  getCart,
  getKitBuilder,
  getProduct,
  removeFromCart,
  updateCart,
} from "@/lib/shopify";
import type {
  Cart,
  CartAttribute,
  CartItem,
  CartLineUpdateInput,
  CartWarning,
  ProductAddOn,
  ProductVariant,
} from "@/lib/shopify/types";
import { clientKey, rateLimited } from "@/lib/rate-limit";
import {
  addOns as addOnCopy,
  buyNow as buyNowCopy,
  kitBuilder as kitCopy,
} from "@/lib/site";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";

export type CartActionState = {
  ok: boolean;
  message: string;
} | null;

const CART_COOKIE = "cartId";

// One year. Shopify carts themselves expire after ~10 days of inactivity; the
// cookie outliving the cart is fine because every action recovers from a dead
// cart id, but a *session* cookie is not - it drops the cart when the browser
// closes, which is the common "my cart vanished" report.
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const MERCHANDISE_ID_PATTERN = /^gid:\/\/shopify\/ProductVariant\/[\w-]+$/;

// A cart line id carries its cart: gid://shopify/CartLine/<uuid>?cart=<key>.
const LINE_ID_PATTERN = /^gid:\/\/shopify\/CartLine\/[\w-]+(\?cart=[\w-]+)?$/;

function ok(message = ""): CartActionState {
  return { ok: true, message };
}

function fail(message: string): CartActionState {
  return { ok: false, message };
}

async function setCartCookie(cartId: string) {
  (await cookies()).set(CART_COOKIE, cartId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

async function readCartCookie(): Promise<string | undefined> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return value && value.trim() ? value : undefined;
}

type ResolvedCart =
  | { cartId: string; cart: Cart }
  | { cartId: undefined; cart: undefined };

/**
 * Reads the live cart behind the cookie. Returns nothing when the id is absent
 * or Shopify no longer recognises it (checked out, or expired).
 */
async function resolveCart(): Promise<ResolvedCart> {
  const existingId = await readCartCookie();

  if (existingId) {
    // Fresh read: inside an action the tagged cache entry may still hold the
    // pre-mutation cart, whose line ids are stale.
    const cart = await getCart(existingId, { fresh: true });
    if (cart?.id) {
      return { cartId: cart.id, cart };
    }
  }

  return { cartId: undefined, cart: undefined };
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(Math.max(Math.trunc(quantity), 0), MAX_LINE_QUANTITY);
}

/**
 * Quantity 0 legitimately means "remove this line", so a malformed quantity
 * must be rejected outright rather than clamped - clamping NaN to 0 would turn
 * a corrupt payload into a silent deletion.
 */
function isUsableQuantity(quantity: unknown): quantity is number {
  return typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 0;
}

function isValidMerchandiseId(id: unknown): id is string {
  return typeof id === "string" && MERCHANDISE_ID_PATTERN.test(id);
}

function isValidLineId(id: unknown): id is string {
  return typeof id === "string" && LINE_ID_PATTERN.test(id);
}

/**
 * Distinguishes "this cart id is dead" (checked out, expired, or minted by a
 * different store) from every other rejection, so only the former triggers a
 * replacement cart. Retrying blindly would mint an orphan cart on every bad
 * variant id.
 */
function isMissingCartError(error: unknown): boolean {
  return error instanceof CartMutationError && error.isMissingCart;
}

/**
 * Shopify silently clamps a line to available inventory rather than failing, so
 * a "success" can still mean the customer got fewer units than they asked for.
 * Surface that instead of letting the number quietly snap back.
 */
function describeWarnings(warnings: CartWarning[]): string {
  const stockWarning = warnings.find(
    (warning) => warning.code === "MERCHANDISE_NOT_ENOUGH_STOCK"
  );
  return stockWarning
    ? "Limited stock - your cart was set to the quantity still available."
    : "";
}

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof CartMutationError) return error.message;
  console.error(error);
  return fallback;
}

/**
 * Runs `task` against the cart on the cookie, and against a brand-new cart if
 * that one is dead (checked out or expired).
 *
 * Creating the cart here, inside the same action that adds the line, closes
 * the first-visit race: the cart used to be created by an effect in the modal,
 * so a fast click hit a missing cookie and failed while the optimistic UI
 * happily showed the item as added. Only a dead cart id falls through to a
 * replacement; anything else (bad variant, sold out) is a real failure and
 * propagates.
 */
async function withLiveCart<T>(task: (cartId: string) => Promise<T>): Promise<T> {
  const existingId = await readCartCookie();

  if (existingId) {
    try {
      return await task(existingId);
    } catch (error) {
      if (!isMissingCartError(error)) throw error;
    }
  }

  const created = await createCart();
  if (!created.id) {
    throw new Error("Shopify returned a cart without an id");
  }
  await setCartCookie(created.id);
  return task(created.id);
}

/** An add-on as the browser asks for it: which one, and the text typed. */
type AddOnRequest = { id: string; text?: string };

/** More than any product offers; a longer list is not from our page. */
const MAX_ADDONS_PER_LINE = 5;

/**
 * The line-item property an add-on's text is written under. It is what the
 * workshop reads on the order ("Initials: KF"), so initials get a fixed name
 * from the storefront's copy rather than whatever the merchant labelled the
 * field for shoppers.
 */
function addOnAttributeKey(addOn: ProductAddOn): string {
  return addOn.kind === "initials"
    ? addOnCopy.orderLabels.initials
    : (addOn.textLabel ?? addOn.title);
}

/**
 * Turns what the browser asked for into cart lines, re-checked against the
 * add-ons Shopify says exist. Nothing the browser sends is trusted: not the
 * add-on ids, not the text, and never a price - the price is whatever the
 * add-on's variant costs in Shopify, charged by Shopify at checkout.
 */
async function resolveAddOnLines(
  merchandiseId: string,
  requests: unknown
): Promise<
  | { ok: true; lines: { addOn: ProductAddOn; attributes: CartAttribute[] }[] }
  | { ok: false; message: string }
> {
  if (!Array.isArray(requests) || requests.length > MAX_ADDONS_PER_LINE) {
    return { ok: false, message: addOnCopy.errors.unavailable };
  }

  const offered = await getAddOns();

  // An add-on is never itself the thing personalised.
  if (offered.some((addOn) => addOn.variantId === merchandiseId)) {
    return { ok: false, message: addOnCopy.errors.unavailable };
  }

  const lines: { addOn: ProductAddOn; attributes: CartAttribute[] }[] = [];
  const seen = new Set<string>();

  for (const request of requests as AddOnRequest[]) {
    const addOn = offered.find((candidate) => candidate.id === request?.id);
    if (!addOn || !addOn.available) {
      return { ok: false, message: addOnCopy.errors.unavailable };
    }
    // A repeated id would charge twice for one embroidery.
    if (seen.has(addOn.id)) continue;
    seen.add(addOn.id);

    const raw = typeof request.text === "string" ? request.text : "";
    let text = "";

    if (addOn.textLabel) {
      if (addOn.kind === "initials") {
        // Case and full-width letters are forgiven; anything else is refused
        // rather than quietly dropped - the shopper has to see what will be
        // stitched.
        text = raw.normalize("NFKC").trim().toUpperCase();
        if (text && !/^[A-Z]+$/.test(text)) {
          return { ok: false, message: addOnCopy.errors.invalidInitials };
        }
        if (text.length > addOn.maxLength) {
          return { ok: false, message: addOnCopy.errors.tooLong(addOn.maxLength) };
        }
        if (text && !isValidInitials(text, addOn.maxLength)) {
          return { ok: false, message: addOnCopy.errors.invalidInitials };
        }
      } else {
        text = raw
          .normalize("NFC")
          .replace(/[\u0000-\u001f\u007f]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, addOn.maxLength);
      }

      if (addOn.textRequired && !text) {
        return { ok: false, message: addOnCopy.errors.missingText };
      }
    }

    lines.push({
      addOn,
      attributes: text ? [{ key: addOnAttributeKey(addOn), value: text }] : [],
    });
  }

  return { ok: true, lines };
}

/**
 * Adds a Kompanion with its add-ons nested under it. If the add-ons fail, the
 * parent is removed again: a personalised Kompanion must never sit in a cart
 * without the paid line that says what to stitch.
 */
async function addPersonalisedLine(
  cartId: string,
  merchandiseId: string,
  quantity: number,
  addOnLines: { addOn: ProductAddOn; attributes: CartAttribute[] }[]
): Promise<{ cart: Cart; warnings: CartWarning[] }> {
  const { cart, warnings } = await addNestedLine(
    cartId,
    { merchandiseId, quantity },
    addOnLines.map(({ addOn, attributes }) => ({
      merchandiseId: addOn.variantId,
      perUnit: addOn.chargePerUnit,
      attributes,
    }))
  );
  return { cart, warnings };
}

/** A line nested under a parent: an add-on, or a piece of a kit. */
type ChildLine = {
  merchandiseId: string;
  /** Quantity follows the parent's; otherwise it is charged once. */
  perUnit: boolean;
  attributes: CartAttribute[];
};

/**
 * The shared mechanics of a parent with lines nested under it - a Kompanion
 * with its add-ons, or a kit with its pieces.
 *
 * Two calls rather than one. Shopify can nest a child in the same call by
 * naming the parent's *variant*, but a cart may already hold that variant -
 * the same tote, other initials; another kit - and then which line the child
 * attaches to is Shopify's guess. Adding the parent first, finding it by its
 * own unique marker, and nesting by line id takes the guess away.
 *
 * If the children fail, the parent is removed again (Shopify removes any
 * children that did land with it).
 */
async function addNestedLine(
  cartId: string,
  parentLine: { merchandiseId: string; quantity: number; attributes?: CartAttribute[] },
  children: ChildLine[]
): Promise<{ cart: Cart; warnings: CartWarning[]; parentId: string }> {
  const marker = crypto.randomUUID();
  const added = await addToCart(cartId, [
    {
      merchandiseId: parentLine.merchandiseId,
      quantity: parentLine.quantity,
      attributes: [
        { key: ADDON_PARENT_ATTRIBUTE, value: marker },
        ...(parentLine.attributes ?? []),
      ],
    },
  ]);

  const parent = added.cart.lines.find((line) =>
    line.attributes?.some(
      (attribute) =>
        attribute.key === ADDON_PARENT_ATTRIBUTE && attribute.value === marker
    )
  );
  if (!parent?.id) {
    throw new Error("The personalised line was not found after adding it");
  }

  try {
    const nested = await addToCart(
      cartId,
      children.map(({ merchandiseId, perUnit, attributes }) => ({
        merchandiseId,
        // The parent's ACTUAL quantity, not the one asked for: Shopify clamps
        // to stock, and initials for units that are not coming would be
        // charged and never stitched.
        quantity: perUnit ? parent.quantity : 1,
        attributes,
        parent: { lineId: parent.id! },
      }))
    );
    return {
      cart: nested.cart,
      warnings: [...added.warnings, ...nested.warnings],
      parentId: parent.id,
    };
  } catch (error) {
    await removeFromCart(cartId, [parent.id]).catch((cleanup) =>
      console.error("Could not roll back a personalised line", cleanup)
    );
    throw error;
  }
}

export async function addItem(
  _prevState: CartActionState,
  payload: {
    merchandiseId: string | undefined;
    quantity?: number;
    addOns?: AddOnRequest[];
  }
): Promise<CartActionState> {
  const merchandiseId = payload?.merchandiseId;

  if (!isValidMerchandiseId(merchandiseId)) {
    return fail("Please select an option before adding to the cart.");
  }

  const requested = payload.quantity ?? 1;
  if (!isUsableQuantity(requested)) {
    return fail("That quantity isn't valid.");
  }

  const quantity = clampQuantity(requested);
  if (quantity < 1) {
    return fail("Quantity must be at least 1.");
  }

  const wantsAddOns = Array.isArray(payload.addOns) && payload.addOns.length > 0;

  try {
    let warnings: CartWarning[];

    if (wantsAddOns) {
      const resolved = await resolveAddOnLines(merchandiseId, payload.addOns);
      if (!resolved.ok) return fail(resolved.message);

      ({ warnings } = await withLiveCart((cartId) =>
        addPersonalisedLine(cartId, merchandiseId, quantity, resolved.lines)
      ));
    } else {
      // Fast path: add straight to the cart on the cookie, no read first.
      ({ warnings } = await withLiveCart((cartId) =>
        addToCart(cartId, [{ merchandiseId, quantity }])
      ));
    }

    // `updateTag`, not `revalidateTag`. Next 16 deliberately withholds the
    // re-rendered RSC payload when `revalidateTag` is given a cache profile
    // ("so that server actions don't pull their own writes"), so the root
    // layout never re-runs, the cart promise never changes, and the optimistic
    // state snaps back to the pre-action cart. `updateTag` expires the entry
    // immediately AND marks the path revalidated, which is what makes the cart
    // update without a reload.
    updateTag(TAGS.cart);

    return ok(describeWarnings(warnings));
  } catch (error) {
    // A failed add can still have changed the cart (a rollback that itself
    // failed), so the drawer re-reads either way.
    updateTag(TAGS.cart);
    return fail(
      toMessage(
        error,
        wantsAddOns
          ? addOnCopy.errors.failed
          : "We couldn't add that to your cart."
      )
    );
  }
}

/* ------------------------------------------------------- custom kit builder */

const KIT_LIMIT = { windowMs: 10 * 60 * 1000, max: 30 };

/** No 0/O or 1/I: the packer reads this code off a slip, and so might a shopper. */
const KIT_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newKitCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `K-${Array.from(bytes, (b) => KIT_CODE_ALPHABET[b % KIT_CODE_ALPHABET.length]).join("")}`;
}

/**
 * Turns what the builder asked for into a container line and its pieces,
 * re-checked against the kit Shopify says exists. Nothing the browser sends is
 * trusted: not the piece ids, not the sizes, not the letters, and never a
 * price - each piece is charged at its own variant's price by Shopify.
 */
async function resolveKit(
  request: unknown
): Promise<
  | {
      ok: true;
      containerId: string;
      parentAttributes: CartAttribute[];
      children: ChildLine[];
      pieceTitles: string[];
    }
  | { ok: false; message: string }
> {
  const errors = kitCopy.errors;
  const kit = await getKitBuilder();
  if (!kit || !kit.containerAvailable) return { ok: false, message: errors.resting };

  const payload = (request ?? {}) as Partial<KitRequest>;
  const fabric = kit.fabrics.find((candidate) => candidate.id === payload.fabricId);
  if (!fabric) return { ok: false, message: errors.fabric };

  const asked = Array.isArray(payload.pieces) ? payload.pieces : [];
  const pieceIds = asked.map((entry) => entry?.pieceId);
  if (
    asked.length < kit.minPieces ||
    asked.length > kit.pieces.length ||
    new Set(pieceIds).size !== pieceIds.length
  ) {
    return { ok: false, message: errors.tooFew(kit.minPieces) };
  }

  const chosen: { title: string; variantId: string; embroiderable: boolean }[] = [];
  for (const entry of asked) {
    const piece = kit.pieces.find((candidate) => candidate.id === entry?.pieceId);
    if (!piece) return { ok: false, message: errors.failed };

    const sizes: Record<string, string> = {};
    for (const option of piece.sizeOptions) {
      const value = entry.sizes?.[option.name];
      if (typeof value !== "string" || !value) {
        return { ok: false, message: errors.size(piece.title) };
      }
      sizes[option.name] = value;
    }

    // The fabric is matched here, against the chosen fabric entry - not
    // taken from the browser - so a Block printed robe can never be bought
    // at the Solid price, and one kit never mixes fabrics.
    const variant = findKitVariant(piece, fabric.optionValue, sizes);
    if (!variant?.availableForSale) {
      return { ok: false, message: errors.soldOut(piece.title) };
    }
    chosen.push({
      title: piece.title,
      variantId: variant.id,
      embroiderable: piece.embroiderable,
    });
  }

  const thread = payload.threadId
    ? kit.threads.find((candidate) => candidate.id === payload.threadId)
    : undefined;
  if (payload.threadId && !thread) return { ok: false, message: errors.thread };

  // Case and full-width letters are forgiven; anything else is refused
  // rather than quietly dropped - the shopper has to see what is stitched.
  const initials =
    typeof payload.initials === "string"
      ? payload.initials.normalize("NFKC").trim().toUpperCase()
      : "";
  if (thread && !initials) return { ok: false, message: errors.initials };
  if (initials && !thread) return { ok: false, message: errors.thread };
  if (initials) {
    if (!/^[A-Z]+$/.test(initials)) {
      return { ok: false, message: errors.invalidInitials };
    }
    if (!isValidInitials(initials, kit.initialsMaxLength)) {
      return { ok: false, message: errors.tooLong(kit.initialsMaxLength) };
    }
  }

  const stitched = chosen.filter((piece) => piece.embroiderable);
  if (initials && !stitched.length) {
    return { ok: false, message: errors.noEmbroiderable };
  }

  const code = newKitCode();
  const labels = kitCopy.orderLabels;
  const kitAttribute = { key: KIT_ATTRIBUTE, value: code };

  const children: ChildLine[] = chosen.map((piece) => ({
    merchandiseId: piece.variantId,
    perUnit: true,
    attributes: [kitAttribute],
  }));
  if (initials && kit.initialsVariantId) {
    children.push({
      merchandiseId: kit.initialsVariantId,
      perUnit: true,
      attributes: [kitAttribute, { key: labels.initials, value: initials }],
    });
  }

  return {
    ok: true,
    containerId: kit.containerVariantId,
    parentAttributes: [
      kitAttribute,
      { key: labels.fabric, value: fabric.title },
      ...(initials && thread
        ? [
            { key: labels.thread, value: thread.title },
            { key: labels.initials, value: initials },
            {
              key: labels.embroiderOn,
              value: stitched.map((piece) => piece.title).join(", "),
            },
          ]
        : []),
    ],
    children,
    pieceTitles: chosen.map((piece) => piece.title),
  };
}

/**
 * Adds a built kit: the ₹0 container line, with every piece (and an initials
 * charge, when the merchant has set one) nested under it by line id.
 *
 * A kit is whole or absent. Shopify answers a piece that sold out a moment ago
 * by clamping its line - to nothing, for one unit - rather than by failing, so
 * the result is checked: a missing piece takes the whole kit back out, and a
 * piece clamped below the rest brings the kit down to what can actually ship.
 */
export async function addKitItem(
  _prevState: CartActionState,
  payload: KitRequest
): Promise<CartActionState> {
  const requested = payload?.quantity ?? 1;
  if (!isUsableQuantity(requested)) return fail("That quantity isn't valid.");
  const quantity = clampQuantity(requested);
  if (quantity < 1) return fail("Quantity must be at least 1.");

  if (rateLimited("kit-builder", await clientKey(), KIT_LIMIT)) {
    return fail(kitCopy.errors.busy);
  }

  try {
    const resolved = await resolveKit(payload);
    if (!resolved.ok) return fail(resolved.message);

    const outcome = await withLiveCart(async (cartId) => {
      const added = await addNestedLine(
        cartId,
        {
          merchandiseId: resolved.containerId,
          quantity,
          attributes: resolved.parentAttributes,
        },
        resolved.children
      );

      const parent = added.cart.lines.find((line) => line.id === added.parentId);
      const pieces = parent?.addOns ?? [];
      const missing = resolved.children.findIndex(
        (child) =>
          !pieces.some(
            (line) => line.merchandise.id === child.merchandiseId && line.quantity > 0
          )
      );

      if (!parent || missing !== -1) {
        await removeFromCart(cartId, [added.parentId]).catch((cleanup) =>
          console.error("Could not roll back a kit", cleanup)
        );
        return {
          ok: false as const,
          message: kitCopy.errors.soldOut(
            resolved.pieceTitles[missing] ?? resolved.pieceTitles[0] ?? "kit"
          ),
        };
      }

      const whole = Math.min(...pieces.map((line) => line.quantity), parent.quantity);
      if (whole < parent.quantity || pieces.some((line) => line.quantity !== whole)) {
        await updateCart(cartId, [
          { id: parent.id!, quantity: whole },
          ...pieces
            .filter((line) => line.id && line.quantity !== whole)
            .map((line) => ({ id: line.id!, quantity: whole })),
        ]);
        return { ok: true as const, warnings: added.warnings, clamped: true };
      }

      return { ok: true as const, warnings: added.warnings, clamped: false };
    });

    updateTag(TAGS.cart);
    if (!outcome.ok) return fail(outcome.message);
    return ok(
      outcome.clamped
        ? "Limited stock - your kit was set to the quantity still available."
        : describeWarnings(outcome.warnings)
    );
  } catch (error) {
    // A failed add can still have changed the cart (a rollback that itself
    // failed), so the drawer re-reads either way.
    updateTag(TAGS.cart);
    return fail(toMessage(error, kitCopy.errors.failed));
  }
}

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,254}$/i;

/**
 * The variant a card's one-tap add resolves to, against LIVE stock: the one
 * the shopper picked before if it is still in stock, else the closest match to
 * the options they have been picking, else the first in stock. The card only
 * fetched two variants and its stored preference may be days old, so the
 * card's own guess is never what gets added.
 */
function resolvePreferredVariant(
  variants: ProductVariant[],
  preferredId: unknown,
  preferredOptions: unknown
): ProductVariant | undefined {
  const available = variants.filter((variant) => variant.availableForSale);
  if (!available.length) return undefined;

  const exact = available.find((variant) => variant.id === preferredId);
  if (exact) return exact;

  const wanted: Record<string, string> = {};
  if (preferredOptions && typeof preferredOptions === "object") {
    for (const [name, value] of Object.entries(preferredOptions).slice(0, 10)) {
      if (typeof value === "string") wanted[name.toLowerCase()] = value;
    }
  }

  let best = available[0]!;
  let bestScore = optionScore(best, wanted);
  for (const variant of available.slice(1)) {
    const score = optionScore(variant, wanted);
    if (score > bestScore) {
      best = variant;
      bestScore = score;
    }
  }
  return best;
}

export type PreferredAddState =
  | { ok: true; message: string; variantId: string }
  | { ok: false; message: string };

/**
 * The card's Buy now and Add: one unit of a product the card names by handle,
 * in the variant `resolvePreferredVariant` settles on. A plain line, like the
 * old card add - personalisation stays on the product page.
 */
export async function addPreferredItem(payload: {
  handle: string;
  variantId?: string;
  options?: Record<string, string>;
}): Promise<PreferredAddState> {
  const handle = payload?.handle;
  if (typeof handle !== "string" || !HANDLE_PATTERN.test(handle)) {
    return { ok: false, message: "We couldn't find that Kompanion." };
  }

  try {
    // Cached with every other product read; add-on products come back
    // undefined from `reshapeProduct`, so they cannot be bought from here.
    const product = await getProduct(handle);
    if (!product) {
      return { ok: false, message: "We couldn't find that Kompanion." };
    }

    const variant = product.availableForSale
      ? resolvePreferredVariant(
          product.variants,
          payload.variantId,
          payload.options
        )
      : undefined;
    if (!variant) {
      return { ok: false, message: "This Kompanion has just sold out." };
    }

    const { warnings } = await withLiveCart((cartId) =>
      addToCart(cartId, [{ merchandiseId: variant.id, quantity: 1 }])
    );

    updateTag(TAGS.cart);
    return { ok: true, message: describeWarnings(warnings), variantId: variant.id };
  } catch (error) {
    updateTag(TAGS.cart);
    return {
      ok: false,
      message: toMessage(error, "We couldn't add that to your cart."),
    };
  }
}

export type VariantChoice = Pick<
  ProductVariant,
  "id" | "title" | "availableForSale" | "price" | "selectedOptions"
>;

/**
 * The sizes / options the drawer can switch a line between, by product
 * handle. Only products with a real choice are returned. Read-only and served
 * from the same cache as the product pages, so opening the drawer does not
 * cost a Shopify round trip per line.
 */
export async function getVariantChoices(
  handles: string[]
): Promise<Record<string, VariantChoice[]>> {
  if (!Array.isArray(handles)) return {};
  const wanted = [...new Set(handles)]
    .filter((handle) => typeof handle === "string" && HANDLE_PATTERN.test(handle))
    .slice(0, 50);

  const entries = await Promise.all(
    wanted.map(async (handle) => {
      const product = await getProduct(handle).catch(() => undefined);
      if (!product || product.variants.length < 2) return null;
      return [
        handle,
        product.variants.map(
          ({ id, title, availableForSale, price, selectedOptions }) => ({
            id,
            title,
            availableForSale,
            price,
            selectedOptions,
          })
        ),
      ] as const;
    })
  );

  return Object.fromEntries(entries.filter((entry) => entry !== null));
}

/**
 * Switches a cart line to another variant of the same product, keeping its
 * quantity. Measured against the live store: the line keeps its attributes
 * and its nested add-ons (initials survive a size change), and switching to a
 * variant already in the cart as a plain line merges the two - which is what
 * a shopper would expect.
 */
export async function changeLineVariant(payload: {
  lineId: string;
  merchandiseId: string;
}): Promise<CartActionState> {
  const { lineId, merchandiseId } = payload ?? {};
  if (!isValidLineId(lineId) || !isValidMerchandiseId(merchandiseId)) {
    return fail("We couldn't change that option.");
  }

  try {
    const { cartId, cart } = await resolveCart();
    const line = cart?.lines.find((candidate) => candidate.id === lineId);
    if (!cartId || !line) {
      updateTag(TAGS.cart);
      return fail("That item is no longer in your cart.");
    }
    if (line.merchandise.id === merchandiseId) return ok();

    // Only another variant of the SAME product, and only one in stock - the
    // browser names the variant, so both are checked here.
    const product = await getProduct(line.merchandise.product.handle);
    const target = product?.variants.find((v) => v.id === merchandiseId);
    if (!target) return fail("That option isn't available for this Kompanion.");
    if (!target.availableForSale) return fail(`${target.title} has just sold out.`);

    const { warnings } = await updateCart(cartId, [
      { id: lineId, merchandiseId, quantity: line.quantity },
    ]);

    updateTag(TAGS.cart);
    return ok(describeWarnings(warnings));
  } catch (error) {
    updateTag(TAGS.cart);
    return fail(toMessage(error, "We couldn't change that option."));
  }
}

export type BuyNowState =
  | { ok: true; checkoutUrl: string }
  | { ok: false; message: string };

/**
 * Generous next to the enquiry forms' five: going to checkout, coming back to
 * change a size and going again is ordinary shopping. It exists because every
 * call mints a Shopify cart, and an exported action is a public endpoint.
 */
const BUY_NOW_LIMIT = { windowMs: 10 * 60 * 1000, max: 20 };

/**
 * Buy now: a checkout for this one Kompanion and the extras picked for it.
 *
 * It builds its OWN cart rather than adding to the one on the cookie. Adding
 * to the shared cart and checking that out would check out everything else
 * the shopper had put aside too - "buy this" quietly becoming "buy all of
 * this". The cookie, the drawer and the optimistic state are never touched,
 * so the cart is still there, unchanged, when they come back; the throwaway
 * cart is simply abandoned if they do not pay.
 *
 * Everything `addItem` checks is checked here, by the same code: the variant
 * id, the quantity, and each add-on and its text against what Shopify says
 * exists. Personalisation goes through `addPersonalisedLine` so it nests by
 * line id and rolls back exactly as it does in the drawer.
 */
export async function buyNow(payload: {
  merchandiseId: string | undefined;
  quantity?: number;
  addOns?: AddOnRequest[];
}): Promise<BuyNowState> {
  const merchandiseId = payload?.merchandiseId;

  if (!isValidMerchandiseId(merchandiseId)) {
    return { ok: false, message: "Please select an option first." };
  }

  const requested = payload.quantity ?? 1;
  if (!isUsableQuantity(requested)) {
    return { ok: false, message: "That quantity isn't valid." };
  }

  const quantity = clampQuantity(requested);
  if (quantity < 1) {
    return { ok: false, message: "Quantity must be at least 1." };
  }

  if (rateLimited("buy-now", await clientKey(), BUY_NOW_LIMIT)) {
    return { ok: false, message: buyNowCopy.errors.busy };
  }

  const wantsAddOns = Array.isArray(payload.addOns) && payload.addOns.length > 0;

  try {
    // An add-on is only ever sold under a Kompanion. `addItem` gets this from
    // `resolveAddOnLines`, which only runs when extras are asked for; a plain
    // Buy now on an add-on's variant id would otherwise check out the gift
    // box on its own.
    const offered = await getAddOns();
    if (offered.some((addOn) => addOn.variantId === merchandiseId)) {
      return { ok: false, message: buyNowCopy.errors.unavailable };
    }

    let cart: Cart;
    let expectedAddOns = 0;

    if (wantsAddOns) {
      const resolved = await resolveAddOnLines(merchandiseId, payload.addOns);
      if (!resolved.ok) return { ok: false, message: resolved.message };
      expectedAddOns = resolved.lines.length;

      const created = await createCart();
      if (!created.id) throw new Error("Shopify returned a cart without an id");
      ({ cart } = await addPersonalisedLine(
        created.id,
        merchandiseId,
        quantity,
        resolved.lines
      ));
    } else {
      cart = await createCart([{ merchandiseId, quantity }]);
    }

    // Shopify answers a sold-out variant by clamping the line - to nothing,
    // for a single unit - rather than by failing, so a "successful" cart can
    // be empty. Checked here, or the shopper lands on a checkout with nothing
    // in it.
    const line = cart.lines.find(
      (candidate) =>
        candidate.merchandise.id === merchandiseId && candidate.quantity > 0
    );
    if (!line || line.merchandise.availableForSale === false) {
      return { ok: false, message: buyNowCopy.errors.unavailable };
    }
    if ((line.addOns?.length ?? 0) < expectedAddOns) {
      return { ok: false, message: addOnCopy.errors.unavailable };
    }

    // Only ever Shopify's own https checkout - this value becomes a
    // `location.assign` in the browser.
    let checkoutUrl: URL;
    try {
      checkoutUrl = new URL(cart.checkoutUrl);
    } catch {
      throw new Error("Shopify returned a cart without a checkout URL");
    }
    if (checkoutUrl.protocol !== "https:") {
      throw new Error(`Refusing a non-https checkout URL: ${checkoutUrl}`);
    }

    return { ok: true, checkoutUrl: checkoutUrl.toString() };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(
        error,
        wantsAddOns ? addOnCopy.errors.failed : buyNowCopy.errors.failed
      ),
    };
  }
}

/**
 * Sets the per-unit add-ons of `lineId` to the parent's quantity in `cart`.
 * Returns the lines that need changing - none when they already agree.
 */
function addOnQuantityUpdates(
  line: CartItem,
  quantity: number,
  perUnit: (addOn: CartItem) => boolean
): CartLineUpdateInput[] {
  return (line.addOns ?? [])
    .filter((addOn) => addOn.id && perUnit(addOn) && addOn.quantity !== quantity)
    .map((addOn) => ({ id: addOn.id!, quantity }));
}

export async function updateItemQuantity(
  _prevState: CartActionState,
  payload: {
    lineId: string;
    quantity: number;
  }
): Promise<CartActionState> {
  if (!isValidLineId(payload?.lineId)) {
    return fail("We couldn't update that item.");
  }

  if (!isUsableQuantity(payload.quantity)) {
    return fail("We couldn't update that quantity.");
  }

  const { lineId } = payload;
  const quantity = clampQuantity(payload.quantity);

  try {
    const { cartId, cart } = await resolveCart();

    if (!cartId || !cart) {
      // Nothing to update against, and nothing was lost - the cart is already
      // empty from the customer's point of view.
      updateTag(TAGS.cart);
      return quantity === 0
        ? ok()
        : fail("Your cart expired. Please add the item again.");
    }

    const line = cart.lines.find((candidate) => candidate.id === lineId);

    if (!line) {
      // Removed in another tab, or by a click still in flight: the desired
      // end state for a removal, a real failure for anything else.
      updateTag(TAGS.cart);
      return quantity === 0
        ? ok()
        : fail("That item is no longer in your cart.");
    }

    let warnings: CartWarning[] = [];

    if (quantity === 0) {
      // Shopify removes the add-ons along with it.
      await removeFromCart(cartId, [lineId]);
    } else {
      // Per unit, by the merchant's own setting where the add-on still
      // exists; where it has since been deleted, by whether it matched the
      // parent before - a once-per-line add-on sits at 1 under a larger one.
      const offered = line.addOns?.length ? await getAddOns() : [];
      const perUnit = (addOn: CartItem) =>
        offered.find((o) => o.variantId === addOn.merchandise.id)
          ?.chargePerUnit ?? addOn.quantity === line.quantity;

      // One call, so the Kompanion and its initials can never be charged for
      // different numbers of units - Shopify does not move them together.
      const result = await updateCart(cartId, [
        { id: lineId, quantity },
        ...addOnQuantityUpdates(line, quantity, perUnit),
      ]);
      warnings = result.warnings;

      // Stock can clamp the parent below what was asked. The add-ons were
      // sent the asked-for number, so bring them down to what is coming.
      const settled = result.cart.lines.find((c) => c.id === lineId);
      if (settled && isKitLine(settled)) {
        // A kit's container is never stock-tracked, so it is the PIECES that
        // clamp - and a kit is only ever sent whole. Everything comes down to
        // the fewest units any piece can supply.
        const pieces = settled.addOns ?? [];
        const whole = Math.min(settled.quantity, ...pieces.map((p) => p.quantity));
        if (whole <= 0) {
          await removeFromCart(cartId, [lineId]);
        } else if (whole !== settled.quantity || pieces.some((p) => p.quantity !== whole)) {
          await updateCart(cartId, [
            { id: lineId, quantity: whole },
            ...addOnQuantityUpdates(settled, whole, () => true),
          ]);
        }
      } else if (settled && settled.quantity !== quantity) {
        const resync = addOnQuantityUpdates(settled, settled.quantity, perUnit);
        if (resync.length) await updateCart(cartId, resync);
      }
    }

    updateTag(TAGS.cart);
    return ok(describeWarnings(warnings));
  } catch (error) {
    return fail(toMessage(error, "We couldn't update that quantity."));
  }
}

/**
 * Removes one line: a Kompanion (its add-ons go with it - Shopify cascades)
 * or a single add-on under one, which leaves the Kompanion in place.
 */
export async function removeItem(
  _prevState: CartActionState,
  lineId: string
): Promise<CartActionState> {
  if (!isValidLineId(lineId)) {
    return fail("We couldn't remove that item.");
  }

  try {
    const { cartId, cart } = await resolveCart();

    if (!cartId || !cart) {
      updateTag(TAGS.cart);
      return ok();
    }

    const exists = cart.lines.some(
      (line) =>
        line.id === lineId ||
        line.addOns?.some((addOn) => addOn.id === lineId)
    );

    // Already gone (a duplicate click, or removed in another tab) is the
    // desired end state, not an error.
    if (exists) {
      await removeFromCart(cartId, [lineId]);
    }

    updateTag(TAGS.cart);
    return ok();
  } catch (error) {
    return fail(toMessage(error, "We couldn't remove that item."));
  }
}

// `createCartAndSetCookie` used to live here and was called from an effect in
// the cart modal. It is gone deliberately: `addItem` now creates the cart
// inside the same action that adds the line, so pre-creation bought nothing
// while minting a Shopify cart for every visitor - and every exported Server
// Action is a publicly callable endpoint, so an unused one is a free way for
// anyone to create carts in bulk.
