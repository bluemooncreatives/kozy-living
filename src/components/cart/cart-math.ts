import {
  ADDON_PARENT_ATTRIBUTE,
  DEFAULT_OPTION,
  MAX_LINE_QUANTITY,
} from "@/lib/constants";
import type {
  Cart,
  CartItem,
  Image,
  Money,
  ProductAddOn,
  ProductVariant,
} from "@/lib/shopify/types";

/**
 * Pure cart arithmetic and the optimistic reducer. Kept out of the React file
 * so the money handling can be reasoned about - and tested - on its own.
 */

export type UpdateType = "plus" | "minus" | "delete";

/**
 * What a cart line needs to know about the product behind it.
 *
 * Structural rather than `Product`, because that is genuinely all this file
 * reads - and it lets a listing card, which never loads the full product,
 * raise an optimistic line of its own.
 */
export type CartLineProduct = {
  id: string;
  handle: string;
  title: string;
  featuredImage?: Image | null;
};

/** An add-on the shopper picked, with the text they typed for it. */
export type ChosenAddOn = {
  addOn: ProductAddOn;
  text?: string;
};

export type CartAction =
  | {
      type: "UPDATE_ITEM";
      /**
       * Addressed by line id, never by variant: two totes with different
       * initials are the same variant and two different lines.
       */
      payload: { lineId: string; updateType: UpdateType };
    }
  | {
      type: "ADD_ITEM";
      payload: {
        variant: ProductVariant;
        product: CartLineProduct;
        /** Units to add. Defaults to one. */
        quantity?: number;
        /** Personalisation. A line carrying any is always a new line. */
        addOns?: ChosenAddOn[];
        /** React key for the new line until the server gives it an id. */
        tempKey?: string;
      };
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

/* --------------------------------- lines --------------------------------- */

/** What one Kompanion costs in the cart, its add-ons included. */
export function lineTotalMinor(item: CartItem): number {
  return (item.addOns ?? []).reduce(
    (sum, addOn) => sum + toMinor(addOn.cost.totalAmount.amount),
    toMinor(item.cost.totalAmount.amount)
  );
}

/** Properties a shopper should see - `_`-prefixed ones are private. */
export function visibleAttributes(item: CartItem) {
  return (item.attributes ?? []).filter(
    (attribute) => !attribute.key.startsWith("_") && attribute.value
  );
}

/**
 * A line with no personalisation, the only kind a repeat add may merge into.
 * Shopify merges by the same rule on its side: same variant, same attributes.
 */
export function isPlainLine(item: CartItem): boolean {
  return (
    !item.addOns?.length &&
    !item.attributes?.some((a) => a.key === ADDON_PARENT_ATTRIBUTE)
  );
}

function withQuantity(item: CartItem, quantity: number): CartItem {
  if (quantity === item.quantity) return item;

  return {
    ...item,
    quantity,
    cost: {
      ...item.cost,
      totalAmount: money(
        unitPriceMinor(item) * quantity,
        item.cost.totalAmount.currencyCode
      ),
    },
  };
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

  // A per-unit add-on moves with its Kompanion (the server sends both in one
  // call). The client cannot see which add-ons are per unit, but one that
  // matches the parent's quantity is - a once-per-line add-on stays at 1
  // while the parent climbs past it.
  const addOns = item.addOns?.map((addOn) =>
    addOn.quantity === item.quantity ? withQuantity(addOn, newQuantity) : addOn
  );

  return { ...withQuantity(item, newQuantity), ...(addOns ? { addOns } : {}) };
}

function createAddOnLine(chosen: ChosenAddOn, quantity: number): CartItem {
  const { addOn, text } = chosen;
  const units = addOn.chargePerUnit ? quantity : 1;

  return {
    id: undefined,
    quantity: units,
    // The key here only matters for display until the server answers; the
    // server writes the real one (see `addOnAttributeKey` in actions.ts).
    attributes: text ? [{ key: addOn.textLabel ?? addOn.title, value: text }] : [],
    cost: {
      totalAmount: money(
        toMinor(addOn.price.amount) * units,
        addOn.price.currencyCode
      ),
      amountPerQuantity: addOn.price,
    },
    merchandise: {
      id: addOn.variantId,
      title: DEFAULT_OPTION,
      availableForSale: addOn.available,
      price: addOn.price,
      selectedOptions: [],
      product: {
        id: addOn.id,
        handle: "",
        title: addOn.title,
        featuredImage: { url: "", altText: addOn.title, width: 0, height: 0 },
      },
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
    (sum, item) => sum + lineTotalMinor(item),
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
  product: CartLineProduct,
  units = 1
): CartItem {
  const quantity = clampQuantity((existingItem?.quantity ?? 0) + units);
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
        featuredImage: product.featuredImage ?? {
          url: "",
          altText: product.title,
          width: 0,
          height: 0,
        },
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
      const { lineId, updateType } = action.payload;
      const updatedLines = currentCart.lines
        .map((item) => {
          if (item.id === lineId) return applyUpdate(item, updateType);

          // Removing one add-on leaves its Kompanion in place.
          const addOns = item.addOns?.filter((addOn) => addOn.id !== lineId);
          return addOns && addOns.length !== item.addOns!.length
            ? { ...item, addOns }
            : item;
        })
        .filter((item): item is CartItem => item !== null);

      // No `lines.length === 0` special case any more - recalculateCart zeroes
      // subtotal, total AND tax. The old early return left subtotal and tax at
      // their pre-emptying values.
      return recalculateCart(currentCart, updatedLines);
    }
    case "ADD_ITEM": {
      const {
        variant,
        product,
        quantity: units,
        addOns = [],
        tempKey,
      } = action.payload;

      if (addOns.length) {
        // Always its own line: it never merges, on the server or here.
        const quantity = clampQuantity(units ?? 1);
        const line: CartItem = {
          ...createOrUpdateCartItem(undefined, variant, product, quantity),
          tempKey,
          attributes: [{ key: ADDON_PARENT_ATTRIBUTE, value: tempKey ?? "" }],
          addOns: addOns.map((chosen) => createAddOnLine(chosen, quantity)),
        };
        return recalculateCart(currentCart, [...currentCart.lines, line]);
      }

      const existingItem = currentCart.lines.find(
        (item) => item.merchandise.id === variant.id && isPlainLine(item)
      );

      // Refuse to grow past the ceiling instead of showing a number the server
      // will reject.
      if (existingItem && existingItem.quantity >= MAX_LINE_QUANTITY) {
        return currentCart;
      }

      const updatedItem = createOrUpdateCartItem(
        existingItem,
        variant,
        product,
        units
      );
      const updatedLines = existingItem
        ? currentCart.lines.map((item) =>
            item === existingItem ? updatedItem : item
          )
        : [...currentCart.lines, { ...updatedItem, tempKey }];

      return recalculateCart(currentCart, updatedLines);
    }
    default:
      return currentCart;
  }
}
