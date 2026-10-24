"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CART_STORAGE_KEY,
  cartCount,
  cartReducer,
  cartSubtotal,
  parseStoredCart,
  type CartAction,
  type CartLine,
  type CartState,
} from "@/lib/cart/cart";

type ProviderState = { cart: CartState; hydrated: boolean };

function providerReducer(state: ProviderState, action: CartAction): ProviderState {
  if (action.type === "hydrate") return { cart: action.state, hydrated: true };
  return { ...state, cart: cartReducer(state.cart, action) };
}

type Toast = { id: number; message: string };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  hydrated: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (line: CartLine) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  sync: (updates: { variantId: string; priceCents: number; maxQuantity: number }[]) => void;
  clear: () => void;
  toast: Toast | null;
  /** Increments on every successful add, so the bag icon can react. */
  pulse: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [{ cart: state, hydrated }, dispatch] = useReducer(providerReducer, { cart: { lines: [] }, hydrated: false });
  const [isOpen, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pulse, setPulse] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once, then keep tabs in sync.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(CART_STORAGE_KEY);
    } catch {
      stored = null;
    }
    dispatch({ type: "hydrate", state: parseStoredCart(stored) });

    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        dispatch({ type: "hydrate", state: parseStoredCart(event.newValue) });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode or quota: the cart still works for this visit.
    }
  }, [state, hydrated]);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const add = useCallback(
    (line: CartLine) => {
      dispatch({ type: "add", line });
      setPulse((p) => p + 1);
      setOpen(true);
      showToast(`${line.productName} added to your bag`);
    },
    [showToast],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      count: cartCount(state),
      subtotalCents: cartSubtotal(state),
      hydrated,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      setQuantity: (variantId, quantity) => dispatch({ type: "setQuantity", variantId, quantity }),
      remove: (variantId) => dispatch({ type: "remove", variantId }),
      sync: (updates) => dispatch({ type: "sync", updates }),
      clear: () => dispatch({ type: "clear" }),
      toast,
      pulse,
    }),
    [state, hydrated, isOpen, add, toast, pulse],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = use(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
