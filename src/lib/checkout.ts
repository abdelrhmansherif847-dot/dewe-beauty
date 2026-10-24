import { z } from "zod";
import { PHONE_ERROR, normalizeEgMobile } from "./phone";

export const shippingSchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  phone: z
    .string()
    .transform((v, ctx) => {
      const phone = normalizeEgMobile(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: PHONE_ERROR });
        return z.NEVER;
      }
      return phone;
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.union([z.literal(""), z.email("Please check your email address, or leave it empty.")]))
    .optional()
    .default(""),
  address_line1: z.string().trim().min(3, "Please enter your street address.").max(200),
  address_line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "Please enter your city or area.").max(80),
  zone: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,4}$/, "Please choose your governorate."),
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
  | "invalid_phone"
  | "unsupported_location"
  | "too_many_orders"
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
    "invalid_phone",
    "unsupported_location",
    "too_many_orders",
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
  invalid_phone: "Please enter an Egyptian mobile number, such as 010 1234 5678.",
  unsupported_location: "We don't deliver to that governorate yet. Please choose another delivery address.",
  too_many_orders: "This number already has several open orders today. Please call us to add to an existing order.",
  invalid_request: "Something in your bag didn't look right. Please refresh and try again.",
  unknown: "We couldn't place your order, and your bag is saved. Please try again in a moment.",
};
