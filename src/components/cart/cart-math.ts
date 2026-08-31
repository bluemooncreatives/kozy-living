import { MAX_LINE_QUANTITY } from "@/lib/constants";
import type {
  Cart,
  CartItem,
  Money,
  Product,
  ProductVariant,
} from "@/lib/shopify/types";

/**
 * Pure cart arithmetic and the optimistic reducer. Kept out of the React file
 * so the money handling can be reasoned about - and tested - on its own.
 */

export type UpdateType = "plus" | "minus" | "delete";

export type CartAction =
  | {
      type: "UPDATE_ITEM";
      payload: { merchandiseId: string; updateType: UpdateType };
    }
  | {
      type: "ADD_ITEM";
      payload: { variant: ProductVariant; product: Product };
    };

export const DEFAULT_CURRENCY = "INR";

/* --------------------------------- money --------------------------------- */

/**
 * Cart arithmetic runs in integer minor units. Doing it in floats produced
 * totals like 1799.9999999999998, and re-deriving a unit price by dividing the
 * line total compounded the drift on every click.
 */
export function toMinor(amount: string | number | undefined | null): number {
  const value = Number(amount);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function fromMinor(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function money(minor: number, currencyCode: string): Money {
  return { amount: fromMinor(minor), currencyCode };
}

/**
 * Per-unit price, most trustworthy source first. `amountPerQuantity` reflects
 * line-level discounts; the variant price is the next best; dividing the line
 * total is the last resort and is guarded against a zero quantity.
 */
export function unitPriceMinor(item: CartItem): number {
  if (item.cost.amountPerQuantity?.amount != null) {
    return toMinor(item.cost.amountPerQuantity.amount);
  }
  if (item.merchandise.price?.amount != null) {
    return toMinor(item.merchandise.price.amount);
  }
  if (item.quantity > 0) {
    return Math.round(toMinor(item.cost.totalAmount.amount) / item.quantity);
  }
  return 0;
}

/**
 * The lines win over the cart envelope. On the very first add there is no
 * server cart, so the envelope is the placeholder from `createEmptyCart` - and
 * reading its currency rendered the total in the placeholder currency while the
 * line prices used the store's real one.
 */
export function cartCurrency(cart: Cart | undefined, lines: CartItem[]): string {
  return (
    lines[0]?.cost.totalAmount.currencyCode ||
    cart?.cost?.totalAmount?.currencyCode ||
    DEFAULT_CURRENCY
  );
}

export function createEmptyCart(): Cart {
  return {
    id: undefined,
    checkoutUrl: "",
    totalQuantity: 0,
    lines: [],
    cost: {
      subtotalAmount: { amount: "0.00", currencyCode: DEFAULT_CURRENCY },
      totalAmount: { amount: "0.00", currencyCode: DEFAULT_CURRENCY },
      totalTaxAmount: { amount: "0.00", currencyCode: DEFAULT_CURRENCY },
    },
  };
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(Math.max(Math.trunc(quantity), 0), MAX_LINE_QUANTITY);
}

/* -------------------------------- reducer -------------------------------- */

export function applyUpdate(
  item: CartItem,
  updateType: UpdateType
): CartItem | null {
  if (updateType === "delete") return null;

  const newQuantity = clampQuantity(
    updateType === "plus" ? item.quantity + 1 : item.quantity - 1
  );

  if (newQuantity === 0) return null;
  // Already at the ceiling - hand back the same object so React can bail out.
  if (newQuantity === item.quantity) return item;

  const unit = unitPriceMinor(item);
  const currencyCode = item.cost.totalAmount.currencyCode;

  return {
    ...item,
    quantity: newQuantity,
    cost: {
      ...item.cost,
      totalAmount: money(unit * newQuantity, currencyCode),
    },
  };
}

/**
 * Recomputes the cart envelope from its lines. Tax is carried over from the
 * server rather than zeroed: the previous version reset it on every optimistic
 * change, so the "Taxes" row flickered to 0 and back on each click.
 */
export function recalculateCart(cart: Cart, lines: CartItem[]): Cart {
  const currencyCode = cartCurrency(cart, lines);
  const subtotalMinor = lines.reduce(
    (sum, item) => sum + toMinor(item.cost.totalAmount.amount),
    0
  );
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  // An empty cart owes no tax; otherwise the server figure is the best estimate
  // until the next reconciliation.
  const taxMinor = lines.length ? toMinor(cart.cost?.totalTaxAmount?.amount) : 0;

  return {
    ...cart,
    lines,
    totalQuantity,
    cost: {
      subtotalAmount: money(subtotalMinor, currencyCode),
      totalAmount: money(subtotalMinor + taxMinor, currencyCode),
      totalTaxAmount: money(taxMinor, currencyCode),
    },
  };
}

export function createOrUpdateCartItem(
  existingItem: CartItem | undefined,
  variant: ProductVariant,
  product: Product
): CartItem {
  const quantity = clampQuantity((existingItem?.quantity ?? 0) + 1);
  const currencyCode =
    existingItem?.cost.totalAmount.currencyCode ??
    variant.price.currencyCode ??
    DEFAULT_CURRENCY;
  const unit = existingItem
    ? unitPriceMinor(existingItem)
    : toMinor(variant.price.amount);

  return {
    // Preserve the server line id so a follow-up mutation can address it.
    id: existingItem?.id,
    quantity,
    cost: {
      ...existingItem?.cost,
      totalAmount: money(unit * quantity, currencyCode),
      amountPerQuantity:
        existingItem?.cost.amountPerQuantity ??
        (variant.price.amount != null
          ? { amount: variant.price.amount, currencyCode }
          : undefined),
    },
    merchandise: {
      id: variant.id,
      title: variant.title,
      availableForSale: variant.availableForSale,
      price: variant.price,
      selectedOptions: variant.selectedOptions,
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title,
        featuredImage: product.featuredImage,
      },
    },
  };
}

export function cartReducer(
  state: Cart | undefined,
  action: CartAction
): Cart {
  const currentCart = state || createEmptyCart();

  switch (action.type) {
    case "UPDATE_ITEM": {
      const { merchandiseId, updateType } = action.payload;
      const updatedLines = currentCart.lines
        .map((item) =>
          item.merchandise.id === merchandiseId
            ? applyUpdate(item, updateType)
            : item
        )
        .filter((item): item is CartItem => item !== null);

      // No `lines.length === 0` special case any more - recalculateCart zeroes
      // subtotal, total AND tax. The old early return left subtotal and tax at
      // their pre-emptying values.
      return recalculateCart(currentCart, updatedLines);
    }
    case "ADD_ITEM": {
      const { variant, product } = action.payload;
      const existingItem = currentCart.lines.find(
        (item) => item.merchandise.id === variant.id
      );

      // Refuse to grow past the ceiling instead of showing a number the server
      // will reject.
      if (existingItem && existingItem.quantity >= MAX_LINE_QUANTITY) {
        return currentCart;
      }

      const updatedItem = createOrUpdateCartItem(existingItem, variant, product);
      const updatedLines = existingItem
        ? currentCart.lines.map((item) =>
            item.merchandise.id === variant.id ? updatedItem : item
          )
        : [...currentCart.lines, updatedItem];

      return recalculateCart(currentCart, updatedLines);
    }
    default:
      return currentCart;
  }
}
