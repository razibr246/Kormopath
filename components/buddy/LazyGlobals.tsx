"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ComponentType } from "react";

/*
 * Buddy (assistant panel + launcher) and the command palette are on every page but are never needed for first paint.
 * Loading them as separate chunks once the browser is idle keeps them out of every route's first-load JavaScript,
 * which matters on low-end Android phones and slow mobile data. Ctrl/Cmd+K before they load still opens the palette:
 * the keypress mounts it immediately.
 */
const Buddy = dynamic(() => import("./Buddy").then((m) => m.Buddy), { ssr: false });

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

function useWhenIdle(timeoutMs = 2500): [boolean, () => void] {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as IdleWindow;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(t);
  }, [timeoutMs]);
  const now = useCallback(() => setReady(true), []);
  return [ready, now];
}

export function LazyBuddy() {
  const [ready] = useWhenIdle();
  return ready ? <Buddy /> : null;
}

export function LazyCommandPalette() {
  const [ready, now] = useWhenIdle();
  const [pendingOpen, setPendingOpen] = useState(false);
  const [Palette, setPalette] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (ready) return;
    // Ctrl/Cmd+K (or the header search button, which sends the same key event) before the palette has loaded:
    // load it now and replay the key once it is listening.
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPendingOpen(true); now(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, now]);
  useEffect(() => {
    if (!ready || Palette) return;
    let alive = true;
    import("@/components/layout/CommandPalette").then((m) => { if (alive) setPalette(() => m.CommandPalette); });
    return () => { alive = false; };
  }, [ready, Palette]);
  // Child effects run before this one, so the palette's own key listener is already attached here.
  useEffect(() => {
    if (!Palette || !pendingOpen) return;
    setPendingOpen(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: true }));
  }, [Palette, pendingOpen]);
  return Palette ? <Palette /> : null;
}
