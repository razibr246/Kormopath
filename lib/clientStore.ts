"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Device-local storage shared by the ecosystem apps.
 *
 * - Every key is namespaced `kormopath:<app>:<name>` so each app's data stays in its own
 *   boundary and can be listed, exported or wiped per app (see /settings).
 * - Values are read *after* mount, so the server render and first client render match
 *   (reading localStorage inside useState initialisers caused hydration mismatches).
 * - Every read goes through a sanitiser: stored data is treated as untrusted input.
 * - Nothing here leaves the browser.
 */
export type AppNamespace = "shohoj" | "mediscan" | "admitbuddy" | "probaho" | "haatbazar" | "feeguard" | "chuktiguard" | "platform";

export const storageKey = (app: AppNamespace, name: string) => `kormopath:${app}:${name}`;

export function readStored<T>(key: string, sanitize: (raw: unknown) => T | null): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // private mode, quota exceeded, or storage blocked
  }
}

export function removeStored(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** List this ecosystem's keys for one app (or all apps). */
export function listKeys(app?: AppNamespace): string[] {
  try {
    const prefix = app ? `kormopath:${app}:` : "kormopath:";
    return Object.keys(window.localStorage).filter((k) => k.startsWith(prefix));
  } catch {
    return [];
  }
}

/**
 * useState that persists to localStorage. `ready` is false until the stored value has been
 * loaded, so screens can avoid flashing defaults or overwriting saved data with them.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  sanitize: (raw: unknown) => T | null,
  options: { enabled?: boolean } = {},
): [T, (next: T | ((prev: T) => T)) => void, { ready: boolean; saveFailed: boolean }] {
  const enabled = options.enabled ?? true;
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const sanitizeRef = useRef(sanitize);
  sanitizeRef.current = sanitize;

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }
    const stored = readStored(key, sanitizeRef.current);
    if (stored !== null) setValue(stored);
    setReady(true);
  }, [key, enabled]);

  useEffect(() => {
    if (!ready || !enabled) return;
    setSaveFailed(!writeStored(key, value));
  }, [key, value, ready, enabled]);

  const set = useCallback((next: T | ((prev: T) => T)) => setValue(next), []);
  return [value, set, { ready, saveFailed }];
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  // BOM so Excel opens Bangla text correctly.
  const blob = new Blob(["﻿" + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
