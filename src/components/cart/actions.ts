"use server";

import { MAX_LINE_QUANTITY, TAGS } from "@/lib/constants";
import {
  CartMutationError,
  addToCart,
  createCart,
  getCart,
  removeFromCart,
  updateCart,
} from "@/lib/shopify";
import type { Cart, CartWarning } from "@/lib/shopify/types";
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

export async function addItem(
  _prevState: CartActionState,
  payload: { merchandiseId: string | undefined; quantity?: number }
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

  try {
    const existingId = await readCartCookie();
    let warnings: CartWarning[] = [];
    let added = false;

    // Fast path: add straight to the cart on the cookie, no read first.
    if (existingId) {
      try {
        ({ warnings } = await addToCart(existingId, [
          { merchandiseId, quantity },
        ]));
        added = true;
      } catch (error) {
        // Only a dead cart id falls through to a replacement; anything else
        // (bad variant, sold out) is a real failure and propagates.
        if (!isMissingCartError(error)) throw error;
      }
    }

    // Creating the cart here, inside the same action that adds the line, closes
    // the first-visit race: the cart used to be created by an effect in the
    // modal, so a fast click hit a missing cookie and failed while the
    // optimistic UI happily showed the item as added.
    if (!added) {
      const created = await createCart();
      if (!created.id) {
        throw new Error("Shopify returned a cart without an id");
      }
      await setCartCookie(created.id);
      ({ warnings } = await addToCart(created.id, [
        { merchandiseId, quantity },
      ]));
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
    return fail(toMessage(error, "We couldn't add that to your cart."));
  }
}

export async function updateItemQuantity(
  _prevState: CartActionState,
  payload: {
    merchandiseId: string;
    quantity: number;
  }
): Promise<CartActionState> {
  if (!isValidMerchandiseId(payload?.merchandiseId)) {
    return fail("We couldn't update that item.");
  }

  if (!isUsableQuantity(payload.quantity)) {
    return fail("We couldn't update that quantity.");
  }

  const { merchandiseId } = payload;
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

    // Shopify permits several lines for the same variant. Collapse them rather
    // than updating the first and leaving the rest to double the total.
    const matching = cart.lines.filter(
      (line) => line.merchandise.id === merchandiseId && line.id
    );
    const [primary, ...duplicates] = matching;

    let warnings: CartWarning[] = [];

    if (!primary) {
      if (quantity > 0) {
        ({ warnings } = await addToCart(cartId, [{ merchandiseId, quantity }]));
      }
    } else if (quantity === 0) {
      await removeFromCart(cartId, matching.map((line) => line.id!));
    } else {
      if (duplicates.length) {
        await removeFromCart(cartId, duplicates.map((line) => line.id!));
      }
      ({ warnings } = await updateCart(cartId, [
        { id: primary.id!, merchandiseId, quantity },
      ]));
    }

    updateTag(TAGS.cart);
    return ok(describeWarnings(warnings));
  } catch (error) {
    return fail(toMessage(error, "We couldn't update that quantity."));
  }
}

export async function removeItem(
  _prevState: CartActionState,
  merchandiseId: string
): Promise<CartActionState> {
  if (!isValidMerchandiseId(merchandiseId)) {
    return fail("We couldn't remove that item.");
  }

  try {
    const { cartId, cart } = await resolveCart();

    if (!cartId || !cart) {
      updateTag(TAGS.cart);
      return ok();
    }

    const lineIds = cart.lines
      .filter((line) => line.merchandise.id === merchandiseId && line.id)
      .map((line) => line.id!);

    // Already gone (a duplicate click, or removed in another tab) is the
    // desired end state, not an error.
    if (lineIds.length) {
      await removeFromCart(cartId, lineIds);
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
