"use server";

import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import {
  CHECKOUT_ERROR_COPY,
  cartItemsSchema,
  parseCheckoutError,
  shippingSchema,
  type CheckoutErrorCode,
} from "@/lib/checkout";
import { createSessionClient } from "@/lib/supabase/server";
import { z } from "zod";

export type CheckoutState =
  | { status: "idle" }
  | { status: "success"; orderId: string; orderNumber: number }
  | {
      status: "error";
      code: CheckoutErrorCode | "validation";
      message: string;
      fieldErrors?: Partial<Record<string, string>>;
      variantId?: string;
    };

const keySchema = z.uuid();

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const shipping = shippingSchema.safeParse({
    customer_name: formData.get("customer_name") ?? "",
    phone: formData.get("phone") ?? "",
    address_line1: formData.get("address_line1") ?? "",
    address_line2: formData.get("address_line2") ?? "",
    city: formData.get("city") ?? "",
    region: formData.get("region") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!shipping.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of shipping.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", code: "validation", message: CHECKOUT_ERROR_COPY.invalid_shipping, fieldErrors };
  }

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    rawItems = null;
  }
  const items = cartItemsSchema.safeParse(rawItems);
  const key = keySchema.safeParse(formData.get("idempotency_key"));
  if (!items.success || !key.success) {
    return { status: "error", code: "invalid_request", message: CHECKOUT_ERROR_COPY.invalid_request };
  }

  const supabase = await createSessionClient();
  if (!supabase) {
    return { status: "error", code: "checkout_unavailable", message: CHECKOUT_ERROR_COPY.checkout_unavailable };
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { status: "error", code: "auth_required", message: CHECKOUT_ERROR_COPY.auth_required };
  }

  // Only variant ids and quantities are sent. The database prices the order.
  const { data, error } = await supabase.rpc("place_cod_order", {
    p_items: items.data,
    p_shipping: shipping.data,
    p_idempotency_key: key.data,
  });

  if (error || !data?.[0]) {
    const parsed = parseCheckoutError(error?.message);
    if (parsed.code === "unknown") console.error("place_cod_order failed", error?.code, error?.message);
    return { status: "error", code: parsed.code, message: CHECKOUT_ERROR_COPY[parsed.code], variantId: parsed.variantId };
  }

  // Keep the saved profile handy for next time; failure here never blocks an order.
  await supabase
    .from("profiles")
    .update({ full_name: shipping.data.customer_name, phone: shipping.data.phone })
    .eq("id", userData.user.id);

  // Stock changed: let catalog pages pick up new levels.
  revalidateTag(CATALOG_TAG, "max");

  return { status: "success", orderId: data[0].order_id, orderNumber: data[0].order_number };
}
