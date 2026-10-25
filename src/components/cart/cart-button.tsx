"use client";

import { m } from "motion/react";
import { BagIcon } from "@/components/ui/icons";
import { useCart } from "./cart-provider";

export function CartButton() {
  const { count, open, pulse, hydrated } = useCart();
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={open}
      aria-label={hydrated ? `Open bag, ${count} ${count === 1 ? "item" : "items"}` : "Open bag"}
      style={{ position: "relative" }}
      data-testid="cart-button"
    >
      <m.span
        key={pulse}
        initial={pulse ? { scale: 0.82, rotate: -8 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 14 }}
        style={{ display: "inline-grid" }}
      >
        <BagIcon size={22} />
      </m.span>
      {hydrated && count > 0 && (
        <span className="cart-count" aria-hidden="true" data-testid="cart-count">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
