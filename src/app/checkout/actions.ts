"use server";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { CATALOG_TAG } from "@/lib/catalog";
import {
  CHECKOUT_ERROR_COPY,
  cartItemsSchema,
  parseCheckoutError,
  shippingSchema,
  type CheckoutErrorCode,
} from "@/lib/checkout";
import { GUEST_COOKIE_MAX_AGE, guestCookieName, guestTokenSchema } from "@/lib/guest-orders";
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
  const asGuest = formData.get("mode") === "guest";
  const shipping = shippingSchema.safeParse({
    customer_name: formData.get("customer_name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address_line1: formData.get("address_line1") ?? "",
    address_line2: formData.get("address_line2") ?? "",
    city: formData.get("city") ?? "",
    zone: formData.get("zone") ?? "",
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
  const token = guestTokenSchema.safeParse(formData.get("access_token"));
  if (!items.success || !key.success || (asGuest && !token.success)) {
    return { status: "error", code: "invalid_request", message: CHECKOUT_ERROR_COPY.invalid_request };
  }

  const supabase = await createSessionClient();
  if (!supabase) {
    return { status: "error", code: "checkout_unavailable", message: CHECKOUT_ERROR_COPY.checkout_unavailable };
  }

  // Only variant ids and quantities are sent. The database prices the order,
  // applies the delivery fee for the chosen zone and checks stock.
  let userId: string | null = null;
  let result;
  if (asGuest) {
    result = await supabase.rpc("place_guest_cod_order", {
      p_items: items.data,
      p_shipping: shipping.data,
      p_idempotency_key: key.data,
      p_access_token: token.data!,
    });
  } else {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { status: "error", code: "auth_required", message: CHECKOUT_ERROR_COPY.auth_required };
    }
    userId = userData.user.id;
    result = await supabase.rpc("place_cod_order", {
      p_items: items.data,
      p_shipping: shipping.data,
      p_idempotency_key: key.data,
    });
  }

  const { data, error } = result;
  if (error || !data?.[0]) {
    const parsed = parseCheckoutError(error?.message);
    if (parsed.code === "unknown") console.error("checkout failed", error?.code, error?.message);
    return { status: "error", code: parsed.code, message: CHECKOUT_ERROR_COPY[parsed.code], variantId: parsed.variantId };
  }
  const order = data[0];

  if (asGuest) {
    // The token proves this browser placed the order. httpOnly keeps it out of
    // page scripts; the path keeps it off every other request.
    (await cookies()).set(guestCookieName(order.order_id), token.data!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/orders",
      maxAge: GUEST_COOKIE_MAX_AGE,
    });
  } else if (userId) {
    // Keep the saved profile handy for next time; failure here never blocks an order.
    await supabase
      .from("profiles")
      .update({
        full_name: shipping.data.customer_name,
        phone: shipping.data.phone,
        ...(shipping.data.email ? { email: shipping.data.email } : {}),
      })
      .eq("id", userId);
  }

  // Stock changed: let catalog pages pick up new levels.
  revalidateTag(CATALOG_TAG, "max");

  return { status: "success", orderId: order.order_id, orderNumber: order.order_number };
}
