"use client";

// Installed from the Aceternity registry with the shadcn MCP / CLI
// (`npx shadcn add @aceternity/card-hover-effect`) and adapted for DEWÉ BEAUTY.
// What is kept: one shared highlight that glides between items on hover, fades
// in quickly, and fades out with a short delay when the pointer leaves.
// What changed:
// - `m` instead of `motion`, because the app renders inside <LazyMotion strict>
//   (src/components/motion/motion-provider.tsx).
// - The glide animates the highlight's measured x and width instead of using
//   `layoutId`. The app only loads Motion's `domAnimation` features, which have
//   no layout projection, and loading `domMax` for one hover effect would add
//   script to every page.
// - Items are toggle buttons (`aria-pressed`) inside a labelled group, so they
//   work as a filter. The highlight also follows keyboard focus, and only
//   follows a real mouse, so a tap on a phone doesn't leave it behind.
// - Reduced motion keeps the fade and drops the glide.
// - Brand colours from the existing tokens; the item styles live with the
//   caller (`itemClassName`).
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useState, type FocusEvent } from "react";
import { cn } from "@/lib/utils";

export type HoverEffectItem = {
  value: string;
  label: string;
  pressed: boolean;
};

type Box = { x: number; width: number };

export const HoverEffect = ({
  items,
  label,
  onSelect,
  className,
  itemClassName,
}: {
  items: HoverEffectItem[];
  label: string;
  onSelect: (value: string) => void;
  className?: string;
  itemClassName?: string;
}) => {
  const [hovered, setHovered] = useState<Box | null>(null);
  const reduceMotion = useReducedMotion();

  const highlight = (el: HTMLElement) => setHovered({ x: el.offsetLeft, width: el.offsetWidth });
  const leaveFocus = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) setHovered(null);
  };
  const glide = reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div role="group" aria-label={label} className={cn("relative", className)} onMouseLeave={() => setHovered(null)}>
      <AnimatePresence>
        {hovered && (
          <m.span
            aria-hidden="true"
            data-testid="hover-highlight"
            className="pointer-events-none absolute inset-y-1 left-0 block rounded-full bg-blush"
            initial={{ opacity: 0, x: hovered.x, width: hovered.width }}
            animate={{
              opacity: 1,
              x: hovered.x,
              width: hovered.width,
              transition: { opacity: { duration: 0.15 }, x: glide, width: glide },
            }}
            exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
          />
        )}
      </AnimatePresence>
      {items.map((item) => (
        <button
          key={item.value || "all"}
          type="button"
          className={itemClassName}
          aria-pressed={item.pressed}
          onClick={() => onSelect(item.value)}
          onPointerEnter={(e) => e.pointerType === "mouse" && highlight(e.currentTarget)}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && highlight(e.currentTarget)}
          onBlur={leaveFocus}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
