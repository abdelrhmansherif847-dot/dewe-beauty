// Cart state lives in the browser (localStorage). It only stores what the
// shopper chose plus a display snapshot. Prices and stock shown at checkout
// come from the server, and the order itself is priced by the database.

export const CART_STORAGE_KEY = "dewe.cart.v1";
export const MAX_CART_LINES = 50;
export const DEFAULT_MAX_QUANTITY = 10;

export type CartLine = {
  variantId: string;
  quantity: number;
  productSlug: string;
  productName: string;
  brandName: string;
  variantName: string;
  categorySlug: string | null;
  swatchHex: string | null;
  priceCents: number;
  currency: string;
  /** Upper bound the UI allows: min(stock at add time, per-item cap). */
  maxQuantity: number;
};

export type CartState = { lines: CartLine[] };

export type CartAction =
  | { type: "add"; line: CartLine }
  | { type: "setQuantity"; variantId: string; quantity: number }
  | { type: "remove"; variantId: string }
  | { type: "sync"; updates: { variantId: string; priceCents: number; maxQuantity: number }[] }
  | { type: "clear" }
  | { type: "hydrate"; state: CartState };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const { line } = action;
      if (line.maxQuantity < 1 || line.quantity < 1) return state;
      const existing = state.lines.find((l) => l.variantId === line.variantId);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.variantId === line.variantId
              ? {
                  ...l,
                  ...line,
                  quantity: clamp(l.quantity + line.quantity, 1, line.maxQuantity),
                }
              : l,
          ),
        };
      }
      if (state.lines.length >= MAX_CART_LINES) return state;
      return { lines: [...state.lines, { ...line, quantity: clamp(line.quantity, 1, line.maxQuantity) }] };
    }
    case "setQuantity": {
      if (action.quantity < 1) {
        return { lines: state.lines.filter((l) => l.variantId !== action.variantId) };
      }
      return {
        lines: state.lines.map((l) =>
          l.variantId === action.variantId
            ? { ...l, quantity: clamp(Math.floor(action.quantity), 1, Math.max(l.maxQuantity, 1)) }
            : l,
        ),
      };
    }
    case "remove":
      return { lines: state.lines.filter((l) => l.variantId !== action.variantId) };
    case "sync": {
      const updates = new Map(action.updates.map((u) => [u.variantId, u]));
      return {
        lines: state.lines.map((l) => {
          const u = updates.get(l.variantId);
          if (!u) return l;
          return {
            ...l,
            priceCents: u.priceCents,
            maxQuantity: u.maxQuantity,
            // Never silently raise a quantity; only lower it to what is available.
            quantity: u.maxQuantity > 0 ? Math.min(l.quantity, u.maxQuantity) : l.quantity,
          };
        }),
      };
    }
    case "clear":
      return { lines: [] };
    case "hydrate":
      return action.state;
  }
}

export function cartCount(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartSubtotal(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
}

/** Parses persisted cart JSON defensively; anything malformed is dropped. */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return { lines: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as CartState).lines)) {
      return { lines: [] };
    }
    const lines = (parsed as CartState).lines
      .filter(
        (l): l is CartLine =>
          !!l &&
          typeof l.variantId === "string" &&
          Number.isInteger(l.quantity) &&
          l.quantity > 0 &&
          typeof l.productName === "string" &&
          typeof l.productSlug === "string" &&
          typeof l.priceCents === "number",
      )
      .slice(0, MAX_CART_LINES);
    return { lines };
  } catch {
    return { lines: [] };
  }
}
