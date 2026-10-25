"use client";

import { useEffect } from "react";

/**
 * Section reveals with one shared IntersectionObserver.
 *
 * Only elements that start below the fold are hidden, so nothing visible on
 * first paint ever flickers, and content stays readable if JavaScript fails.
 * Mark elements with `data-reveal`; optional `style={{ "--reveal-index": n }}`
 * staggers siblings.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealState = "shown";
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const prepare = (el: HTMLElement) => {
      if (el.dataset.revealState) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        el.dataset.revealState = "static";
        return;
      }
      el.dataset.revealState = "pending";
      io.observe(el);
    };

    const scan = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(prepare);
    };

    scan(document);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.matches("[data-reveal]")) prepare(node);
            scan(node);
          }
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
