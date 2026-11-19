"use client";
import { useEffect, useRef } from "react";

/**
 * Keeps the active tab of a sideways-scrolling tab bar in view on small screens.
 * The bar marks its active tab with aria-current="page" (or aria-selected="true"). Only the bar's own
 * scrollLeft changes; the page never jumps, which scrollIntoView could do.
 */
export function useActiveTabIntoView<T extends HTMLElement>(activeKey: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const tab = bar.querySelector<HTMLElement>('[aria-current="page"], [aria-selected="true"]');
    if (!tab) return;
    const barBox = bar.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    const pad = 16;
    if (tabBox.left >= barBox.left + pad && tabBox.right <= barBox.right - pad) return; // already fully visible
    const target = bar.scrollLeft + (tabBox.left - barBox.left) - (barBox.width - tabBox.width) / 2;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    bar.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  }, [activeKey]);
  return ref;
}
