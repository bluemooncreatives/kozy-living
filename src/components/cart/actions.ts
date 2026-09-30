"use server";

import {
  ADDON_PARENT_ATTRIBUTE,
  MAX_LINE_QUANTITY,
  TAGS,
} from "@/lib/constants";
import { isValidInitials } from "@/lib/shop/add-ons";
import {
  CartMutationError,
  addToCart,
  createCart,
  getAddOns,
  getCart,
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
} from "@/lib/shopify/types";
import { addOns as addOnCopy } from "@/lib/site";
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
 * Adds a Kompanion with its add-ons nested under it.
 *
 * Two calls rather than one. Shopify can nest a child in the same call by
 * naming the parent's *variant*, but a cart may already hold that variant -
 * the same tote, other initials - and then which line the child attaches to
 * is Shopify's guess. Adding the parent first, finding it by its own unique
 * marker, and nesting by line id takes the guess away.
 *
 * If the add-ons fail, the parent is removed again: a personalised Kompanion
 * must never sit in a cart without the paid line that says what to stitch.
 */
async function addPersonalisedLine(
  cartId: string,
  merchandiseId: string,
  quantity: number,
  addOnLines: { addOn: ProductAddOn; attributes: CartAttribute[] }[]
): Promise<CartWarning[]> {
  const marker = crypto.randomUUID();
  const added = await addToCart(cartId, [
    {
      merchandiseId,
      quantity,
      attributes: [{ key: ADDON_PARENT_ATTRIBUTE, value: marker }],
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
      addOnLines.map(({ addOn, attributes }) => ({
        merchandiseId: addOn.variantId,
        // The parent's ACTUAL quantity, not the one asked for: Shopify clamps
        // to stock, and initials for units that are not coming would be
        // charged and never stitched.
        quantity: addOn.chargePerUnit ? parent.quantity : 1,
        attributes,
        parent: { lineId: parent.id! },
      }))
    );
    return [...added.warnings, ...nested.warnings];
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

      warnings = await withLiveCart((cartId) =>
        addPersonalisedLine(cartId, merchandiseId, quantity, resolved.lines)
      );
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
      if (settled && settled.quantity !== quantity) {
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
