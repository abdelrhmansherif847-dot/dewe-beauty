import { z } from "zod";

export const shippingSchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^0-9+ ]/g, ""))
    .pipe(z.string().regex(/^\+?[0-9 ]{7,20}$/, "Please enter a phone number we can call on delivery.")),
  address_line1: z.string().trim().min(3, "Please enter your street address.").max(200),
  address_line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "Please enter your city.").max(80),
  region: z.string().trim().max(80).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});

export type ShippingInput = z.infer<typeof shippingSchema>;

export const cartItemsSchema = z
  .array(
    z.object({
      variant_id: z.uuid(),
      quantity: z.number().int().min(1).max(100),
    }),
  )
  .min(1, "Your bag is empty.")
  .max(50);

export type CheckoutErrorCode =
  | "auth_required"
  | "checkout_unavailable"
  | "invalid_quantity"
  | "unavailable_item"
  | "insufficient_stock"
  | "invalid_shipping"
  | "invalid_request"
  | "unknown";

export type ParsedCheckoutError = { code: CheckoutErrorCode; variantId?: string };

/** Maps the stable error messages raised by public.place_cod_order(). */
export function parseCheckoutError(message: string | undefined | null): ParsedCheckoutError {
  if (!message) return { code: "unknown" };
  if (message.startsWith("insufficient_stock:")) {
    return { code: "insufficient_stock", variantId: message.slice("insufficient_stock:".length).trim() };
  }
  const known: CheckoutErrorCode[] = [
    "auth_required",
    "checkout_unavailable",
    "invalid_quantity",
    "unavailable_item",
    "invalid_shipping",
  ];
  const hit = known.find((code) => message === code);
  if (hit) return { code: hit };
  if (message.startsWith("invalid_request")) return { code: "invalid_request" };
  return { code: "unknown" };
}

export const CHECKOUT_ERROR_COPY: Record<CheckoutErrorCode, string> = {
  auth_required: "Please sign in to place your order.",
  checkout_unavailable: "Checkout is paused right now. Your bag is saved, so please try again shortly.",
  invalid_quantity: "One of the quantities in your bag is above the limit per item.",
  unavailable_item: "An item in your bag is no longer available. We have marked it below.",
  insufficient_stock: "We don't have enough stock for one of your items. We have updated your bag.",
  invalid_shipping: "Please check your delivery details.",
  invalid_request: "Something in your bag didn't look right. Please refresh and try again.",
  unknown: "We couldn't place your order, and your bag is saved. Please try again in a moment.",
};
