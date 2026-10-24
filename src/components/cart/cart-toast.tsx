"use client";

import { AnimatePresence, m } from "motion/react";
import { CheckIcon } from "@/components/ui/icons";
import { useCart } from "./cart-provider";

export function CartToast() {
  const { toast, isOpen } = useCart();
  return (
    <div aria-live="polite" role="status">
      <AnimatePresence>
        {toast && !isOpen && (
          <m.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <CheckIcon size={18} /> {toast.message}
          </m.div>
        )}
      </AnimatePresence>
      {/* Screen readers always hear the confirmation, even with the drawer open. */}
      {toast && isOpen && <span className="visually-hidden">{toast.message}</span>}
    </div>
  );
}
