"use client";

import { Cart, Product, ProductVariant } from "@/lib/shopify/types";
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
import { cartReducer, clampQuantity, type UpdateType } from "./cart-math";

type CartContextType = {
  cart: Cart | undefined;
  /** Applies an optimistic line change. Does not talk to the server. */
  updateCartItem: (merchandiseId: string, updateType: UpdateType) => void;
  /** Applies an optimistic add. Does not talk to the server. */
  addCartItem: (variant: ProductVariant, product: Product) => void;
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
    merchandiseId: string,
    delta: number,
    current: number
  ) => number;
  /** Reserves a removal (target quantity 0) for a line. */
  reserveLineRemoval: (merchandiseId: string) => void;
  /** Marks one reserved mutation for a line as settled. */
  settleLine: (merchandiseId: string) => void;
  isMutating: boolean;
  status: CartActionState;
  reportStatus: (status: CartActionState) => void;
  clearStatus: () => void;
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

  const runCartMutation = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    setPendingCount((count) => count + 1);
    const run = queueRef.current.then(task, task).finally(() => {
      setPendingCount((count) => Math.max(0, count - 1));
    });
    // Swallow rejections on the chain itself so one failure cannot poison every
    // later mutation; the caller still sees its own rejection.
    queueRef.current = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }, []);

  const reserveLineQuantity = useCallback(
    (merchandiseId: string, delta: number, current: number) => {
      const entry = intentRef.current.get(merchandiseId);
      const target = clampQuantity((entry ? entry.target : current) + delta);
      intentRef.current.set(merchandiseId, {
        target,
        inFlight: (entry?.inFlight ?? 0) + 1,
      });
      return target;
    },
    []
  );

  const reserveLineRemoval = useCallback((merchandiseId: string) => {
    const entry = intentRef.current.get(merchandiseId);
    intentRef.current.set(merchandiseId, {
      target: 0,
      inFlight: (entry?.inFlight ?? 0) + 1,
    });
  }, []);

  const settleLine = useCallback((merchandiseId: string) => {
    const entry = intentRef.current.get(merchandiseId);
    if (!entry) return;
    const inFlight = entry.inFlight - 1;
    if (inFlight <= 0) {
      intentRef.current.delete(merchandiseId);
    } else {
      intentRef.current.set(merchandiseId, { ...entry, inFlight });
    }
  }, []);

  // A silent success clears the banner; anything with a message replaces it.
  const reportStatus = useCallback((result: CartActionState) => {
    setStatus(result?.message ? result : null);
  }, []);

  const clearStatus = useCallback(() => setStatus(null), []);

  const updateCartItem = useCallback(
    (merchandiseId: string, updateType: UpdateType) => {
      updateOptimisticCart({
        type: "UPDATE_ITEM",
        payload: { merchandiseId, updateType },
      });
    },
    [updateOptimisticCart]
  );

  const addCartItem = useCallback(
    (variant: ProductVariant, product: Product) => {
      updateOptimisticCart({ type: "ADD_ITEM", payload: { variant, product } });
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
      status,
      reportStatus,
      clearStatus,
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
      status,
      reportStatus,
      clearStatus,
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
