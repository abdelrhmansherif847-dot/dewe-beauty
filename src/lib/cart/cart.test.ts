import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  cartCount,
  cartReducer,
  cartSubtotal,
  parseStoredCart,
  type CartLine,
  type CartState,
} from "./cart";

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  variantId: "v-1",
  quantity: 1,
  productSlug: "dew-drop-hydrating-serum",
  productName: "Dew Drop Hydrating Serum",
  brandName: "Dewlune",
  variantName: "30 ml",
  categorySlug: "skincare",
  swatchHex: null,
  priceCents: 64000,
  currency: "EGP",
  maxQuantity: 10,
  ...overrides,
});

const empty: CartState = { lines: [] };

describe("cartReducer", () => {
  it("adds a new line", () => {
    const state = cartReducer(empty, { type: "add", line: line({ quantity: 2 }) });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].quantity).toBe(2);
  });

  it("merges the same variant and caps at the allowed maximum", () => {
    let state = cartReducer(empty, { type: "add", line: line({ quantity: 3, maxQuantity: 4 }) });
    state = cartReducer(state, { type: "add", line: line({ quantity: 3, maxQuantity: 4 }) });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].quantity).toBe(4);
  });

  it("refreshes the display snapshot when the same variant is added again", () => {
    let state = cartReducer(empty, { type: "add", line: line({ priceCents: 64000 }) });
    state = cartReducer(state, { type: "add", line: line({ priceCents: 59000 }) });
    expect(state.lines[0].priceCents).toBe(59000);
  });

  it("ignores sold-out or zero-quantity adds", () => {
    expect(cartReducer(empty, { type: "add", line: line({ maxQuantity: 0 }) })).toBe(empty);
    expect(cartReducer(empty, { type: "add", line: line({ quantity: 0 }) })).toBe(empty);
  });

  it("refuses new lines beyond the line limit", () => {
    const full: CartState = {
      lines: Array.from({ length: MAX_CART_LINES }, (_, i) => line({ variantId: `v-${i}` })),
    };
    expect(cartReducer(full, { type: "add", line: line({ variantId: "v-new" }) })).toBe(full);
  });

  it("clamps quantity changes and removes a line set below one", () => {
    let state = cartReducer(empty, { type: "add", line: line({ maxQuantity: 5 }) });
    state = cartReducer(state, { type: "setQuantity", variantId: "v-1", quantity: 99 });
    expect(state.lines[0].quantity).toBe(5);
    state = cartReducer(state, { type: "setQuantity", variantId: "v-1", quantity: 2.7 });
    expect(state.lines[0].quantity).toBe(2);
    state = cartReducer(state, { type: "setQuantity", variantId: "v-1", quantity: 0 });
    expect(state.lines).toHaveLength(0);
  });

  it("syncs live prices and lowers, but never raises, quantities", () => {
    let state = cartReducer(empty, { type: "add", line: line({ quantity: 4 }) });
    state = cartReducer(state, {
      type: "sync",
      updates: [{ variantId: "v-1", priceCents: 70000, maxQuantity: 2 }],
    });
    expect(state.lines[0]).toMatchObject({ priceCents: 70000, quantity: 2, maxQuantity: 2 });

    state = cartReducer(state, {
      type: "sync",
      updates: [{ variantId: "v-1", priceCents: 70000, maxQuantity: 9 }],
    });
    expect(state.lines[0].quantity).toBe(2);
  });

  it("keeps a sold-out line so the shopper can see what happened", () => {
    let state = cartReducer(empty, { type: "add", line: line({ quantity: 2 }) });
    state = cartReducer(state, { type: "sync", updates: [{ variantId: "v-1", priceCents: 64000, maxQuantity: 0 }] });
    expect(state.lines[0]).toMatchObject({ quantity: 2, maxQuantity: 0 });
  });

  it("removes and clears", () => {
    let state = cartReducer(empty, { type: "add", line: line() });
    state = cartReducer(state, { type: "add", line: line({ variantId: "v-2" }) });
    state = cartReducer(state, { type: "remove", variantId: "v-1" });
    expect(state.lines.map((l) => l.variantId)).toEqual(["v-2"]);
    expect(cartReducer(state, { type: "clear" }).lines).toEqual([]);
  });
});

describe("cart totals", () => {
  it("counts units and sums the subtotal in the smallest currency unit", () => {
    const state: CartState = {
      lines: [line({ quantity: 2, priceCents: 31000 }), line({ variantId: "v-2", quantity: 1, priceCents: 22000 })],
    };
    expect(cartCount(state)).toBe(3);
    expect(cartSubtotal(state)).toBe(84000);
  });
});

describe("parseStoredCart", () => {
  it("returns an empty cart for missing or malformed data", () => {
    expect(parseStoredCart(null)).toEqual(empty);
    expect(parseStoredCart("not json")).toEqual(empty);
    expect(parseStoredCart("{}")).toEqual(empty);
    expect(parseStoredCart('{"lines":"nope"}')).toEqual(empty);
  });

  it("drops invalid lines and keeps valid ones", () => {
    const raw = JSON.stringify({
      lines: [line(), { ...line({ variantId: "v-2" }), quantity: -1 }, { ...line({ variantId: "v-3" }), quantity: 1.5 }, null],
    });
    expect(parseStoredCart(raw).lines.map((l) => l.variantId)).toEqual(["v-1"]);
  });

  it("caps the number of stored lines", () => {
    const raw = JSON.stringify({
      lines: Array.from({ length: MAX_CART_LINES + 5 }, (_, i) => line({ variantId: `v-${i}` })),
    });
    expect(parseStoredCart(raw).lines).toHaveLength(MAX_CART_LINES);
  });
});
