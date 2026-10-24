import type { Enums } from "./supabase/database.types";

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
