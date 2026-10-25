import { describe, expect, it } from "vitest";
import { cartItemsSchema, parseCheckoutError, shippingSchema } from "./checkout";

describe("parseCheckoutError", () => {
  it("maps the database's stable error messages", () => {
    expect(parseCheckoutError("auth_required")).toEqual({ code: "auth_required" });
    expect(parseCheckoutError("unavailable_item")).toEqual({ code: "unavailable_item" });
    expect(parseCheckoutError("invalid_request:items")).toEqual({ code: "invalid_request" });
    expect(parseCheckoutError("invalid_phone")).toEqual({ code: "invalid_phone" });
    expect(parseCheckoutError("unsupported_location")).toEqual({ code: "unsupported_location" });
    expect(parseCheckoutError("too_many_orders")).toEqual({ code: "too_many_orders" });
  });

  it("extracts the variant from an insufficient stock error", () => {
    expect(parseCheckoutError("insufficient_stock:2f0c8f7e-1111-4c4c-9c9c-123456789abc")).toEqual({
      code: "insufficient_stock",
      variantId: "2f0c8f7e-1111-4c4c-9c9c-123456789abc",
    });
  });

  it("treats anything else as unknown", () => {
    expect(parseCheckoutError(undefined)).toEqual({ code: "unknown" });
    expect(parseCheckoutError("permission denied for table orders")).toEqual({ code: "unknown" });
  });
});

describe("shippingSchema", () => {
  const valid = {
    customer_name: "  Salma Adel ",
    phone: "+20 (100) 000-0000",
    address_line1: "12 Example Street",
    city: "Nasr City",
    zone: "c",
  };

  it("trims fields, normalises the phone and fills optional fields", () => {
    const parsed = shippingSchema.parse(valid);
    expect(parsed).toMatchObject({
      customer_name: "Salma Adel",
      phone: "+201000000000",
      email: "",
      zone: "C",
      address_line2: "",
      notes: "",
    });
  });

  it("keeps email optional but checks it when given", () => {
    expect(shippingSchema.parse({ ...valid, email: "" }).email).toBe("");
    expect(shippingSchema.parse({ ...valid, email: " Salma@Example.com " }).email).toBe("salma@example.com");
    expect(shippingSchema.safeParse({ ...valid, email: "salma@" }).success).toBe(false);
  });

  it("requires an Egyptian mobile number and a governorate", () => {
    expect(shippingSchema.safeParse({ ...valid, phone: "+44 7700 900123" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...valid, phone: "01312345678" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...valid, zone: "" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...valid, zone: "Cairo!" }).success).toBe(false);
  });

  it("rejects missing or implausible details", () => {
    expect(shippingSchema.safeParse({ ...valid, phone: "12" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...valid, city: "" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...valid, customer_name: "A" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...valid, notes: "x".repeat(501) }).success).toBe(false);
  });
});

describe("cartItemsSchema", () => {
  const id = "2f0c8f7e-1111-4c4c-9c9c-123456789abc";

  it("accepts variant ids with whole quantities", () => {
    expect(cartItemsSchema.safeParse([{ variant_id: id, quantity: 2 }]).success).toBe(true);
  });

  it("rejects empty bags, bad ids and bad quantities", () => {
    expect(cartItemsSchema.safeParse([]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ variant_id: "abc", quantity: 1 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ variant_id: id, quantity: 0 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ variant_id: id, quantity: 1.5 }]).success).toBe(false);
  });

  it("does not let the client send a price", () => {
    const parsed = cartItemsSchema.parse([{ variant_id: id, quantity: 1, price_cents: 1 }]);
    expect(parsed[0]).not.toHaveProperty("price_cents");
  });
});
