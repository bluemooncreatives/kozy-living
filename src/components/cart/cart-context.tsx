"use client";

import { Cart, ProductVariant } from "@/lib/shopify/types";
import {
  createContext,
  use,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from "react";
import type { CartActionState } from "./actions";
import {
  cartReducer,
  clampQuantity,
  type CartLineProduct,
  type ChosenAddOn,
  type UpdateType,
} from "./cart-math";

type CartContextType = {
  cart: Cart | undefined;
  /** Applies an optimistic line change. Does not talk to the server. */
  updateCartItem: (lineId: string, updateType: UpdateType) => void;
  /**
   * Applies an optimistic add of `quantity` units, with any add-ons nested
   * under it. Does not talk to the server.
   */
  addCartItem: (
    variant: ProductVariant,
    product: CartLineProduct,
    quantity?: number,
    addOns?: ChosenAddOn[]
  ) => void;
  /**
   * Serialises a cart mutation behind every mutation already in flight, so
   * overlapping requests can never be applied out of order.
   */
  runCartMutation: <T>(task: () => Promise<T>) => Promise<T>;
  /**
   * Reserves the absolute quantity a line should end up at, accounting for
   * clicks that have not reached the server yet. Independent of render timing.
   */
  reserveLineQuantity: (
    lineId: string,
    delta: number,
    current: number
  ) => number;
  /** Reserves a removal (target quantity 0) for a line. */
  reserveLineRemoval: (lineId: string) => void;
  /** Marks one reserved mutation for a line as settled. */
  settleLine: (lineId: string) => void;
  isMutating: boolean;
  /**
   * The same as `isMutating`, read synchronously - for a click handler that
   * must not act on a render that is a frame behind (card Checkout).
   */
  hasPendingMutations: () => boolean;
  status: CartActionState;
  reportStatus: (status: CartActionState) => void;
  clearStatus: () => void;
  /**
   * The drawer's open state lives here rather than inside the drawer so that
   * anything else holding cart state - the summary bar above the fold of the
   * thumb, for one - can raise it without a second copy of the cart.
   */
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /**
   * The variant just added, for a moment - the drawer marks its line and
   * scrolls to it. Lines are sorted by title, so in a full cart the thing
   * that was just added could otherwise be anywhere.
   */
  justAdded: string | null;
  flagAdded: (variantId: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

/* -------------------------------- provider ------------------------------- */

export function CartProvider({
  children,
  cartPromise,
}: {
  children: React.ReactNode;
  cartPromise: Promise<Cart | undefined>;
}) {
  const initialCart = use(cartPromise);
  const [optimisticCart, updateOptimisticCart] = useOptimistic(
    initialCart,
    cartReducer
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<CartActionState>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const justAddedTimer = useRef<number | undefined>(undefined);

  // Serial chain. Cart mutations send an *absolute* quantity, so two in-flight
  // requests that resolve out of order leave the cart at the wrong number.
  // Chaining them keeps the server's view in the same order as the clicks.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  // Target quantity per line, including clicks that have not been sent yet.
  // `inFlight` is reference-counted so an early-settling mutation cannot drop
  // the intent that later queued mutations are still building on.
  const intentRef = useRef(
    new Map<string, { target: number; inFlight: number }>()
  );

  // Every caller runs this from inside an action or `startTransition`, and
  // React 19 holds back state set synchronously in a transition until the
  // whole action settles - by which point the count is back to zero. So the
  // "Updating…" guard on checkout never once showed: the checkout link stayed
  // live through every quantity change (measured). The count lives in a ref,
  // readable at once, and reaches the render through a microtask, which runs
  // outside the transition and renders straight away.
  const pendingRef = useRef(0);
  const syncPending = useCallback((by: number) => {
    pendingRef.current = Math.max(0, pendingRef.current + by);
    queueMicrotask(() => setPendingCount(pendingRef.current));
  }, []);
  const hasPendingMutations = useCallback(() => pendingRef.current > 0, []);

  const runCartMutation = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    syncPending(1);
    const run = queueRef.current.then(task, task).finally(() => {
      syncPending(-1);
    });
    // Swallow rejections on the chain itself so one failure cannot poison every
    // later mutation; the caller still sees its own rejection.
    queueRef.current = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }, [syncPending]);

  const reserveLineQuantity = useCallback(
    (lineId: string, delta: number, current: number) => {
      const entry = intentRef.current.get(lineId);
      const target = clampQuantity((entry ? entry.target : current) + delta);
      intentRef.current.set(lineId, {
        target,
        inFlight: (entry?.inFlight ?? 0) + 1,
      });
      return target;
    },
    []
  );

  const reserveLineRemoval = useCallback((lineId: string) => {
    const entry = intentRef.current.get(lineId);
    intentRef.current.set(lineId, {
      target: 0,
      inFlight: (entry?.inFlight ?? 0) + 1,
    });
  }, []);

  const settleLine = useCallback((lineId: string) => {
    const entry = intentRef.current.get(lineId);
    if (!entry) return;
    const inFlight = entry.inFlight - 1;
    if (inFlight <= 0) {
      intentRef.current.delete(lineId);
    } else {
      intentRef.current.set(lineId, { ...entry, inFlight });
    }
  }, []);

  // A silent success clears the banner; anything with a message replaces it.
  const reportStatus = useCallback((result: CartActionState) => {
    setStatus(result?.message ? result : null);
  }, []);

  const clearStatus = useCallback(() => setStatus(null), []);

  const openCart = useCallback(() => setIsCartOpen(true), []);

  const flagAdded = useCallback((variantId: string) => {
    window.clearTimeout(justAddedTimer.current);
    // Through a microtask for the same reason as `syncPending`: every add
    // calls this from inside its transition, where the mark would otherwise
    // wait for Shopify's answer and land after the shopper had looked.
    queueMicrotask(() => setJustAdded(variantId));
    justAddedTimer.current = window.setTimeout(() => setJustAdded(null), 2600);
  }, []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const updateCartItem = useCallback(
    (lineId: string, updateType: UpdateType) => {
      updateOptimisticCart({
        type: "UPDATE_ITEM",
        payload: { lineId, updateType },
      });
    },
    [updateOptimisticCart]
  );

  const addCartItem = useCallback(
    (
      variant: ProductVariant,
      product: CartLineProduct,
      quantity = 1,
      addOns: ChosenAddOn[] = []
    ) => {
      updateOptimisticCart({
        type: "ADD_ITEM",
        payload: {
          variant,
          product,
          quantity,
          addOns,
          // Only a React key, so it needs to be unique, not unguessable -
          // and `crypto.randomUUID` throws outside a secure context, which a
          // phone testing against a LAN dev server is.
          tempKey: `optimistic:${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2)}`,
        },
      });
    },
    [updateOptimisticCart]
  );

  const value = useMemo(
    () => ({
      cart: optimisticCart,
      updateCartItem,
      addCartItem,
      runCartMutation,
      reserveLineQuantity,
      reserveLineRemoval,
      settleLine,
      isMutating: pendingCount > 0,
      hasPendingMutations,
      status,
      reportStatus,
      clearStatus,
      isCartOpen,
      openCart,
      closeCart,
      justAdded,
      flagAdded,
    }),
    [
      optimisticCart,
      updateCartItem,
      addCartItem,
      runCartMutation,
      reserveLineQuantity,
      reserveLineRemoval,
      settleLine,
      pendingCount,
      hasPendingMutations,
      status,
      reportStatus,
      clearStatus,
      isCartOpen,
      openCart,
      closeCart,
      justAdded,
      flagAdded,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
