import type { Enums, Tables } from "./supabase/database.types";

export const ORDER_STATUS_LABEL: Record<Enums<"order_status">, string> = {
  pending: "Received",
  confirmed: "Confirmed",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatOrderDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** The fields the order page shows, for customer orders and guest orders alike. */
export type OrderView = Pick<
  Tables<"orders">,
  | "id"
  | "order_number"
  | "status"
  | "currency"
  | "subtotal_cents"
  | "delivery_fee_cents"
  | "total_cents"
  | "customer_name"
  | "phone"
  | "address_line1"
  | "address_line2"
  | "city"
  | "region"
  | "created_at"
> & {
  order_items: Pick<
    Tables<"order_items">,
    "id" | "product_name" | "brand_name" | "variant_name" | "unit_price_cents" | "quantity" | "line_total_cents"
  >[];
};
