import "server-only";
import { createHash } from "crypto";
import { LruCache } from "./structuredCore.ts";

/*
 * In-memory cache for synthesised speech, so lines a voice says often (greetings, menus, "call 999") play at once
 * the second time. Only short lines (≤ 220 characters) are kept, at most 40 per server instance (a few MB),
 * because long replies are personal and rarely repeat. Nothing is written to disk.
 */
type Clip = { audio: string; mimeType: string; model: string };
const cache = new LruCache<Clip>(150);
export const TTS_CACHE_MAX_CHARS = 350;

export const ttsKey = (voice: string, style: string, text: string) => createHash("sha256").update(`${voice}\n${style}\n${text}`).digest("hex");
export function ttsGet(key: string): Clip | undefined { return cache.get(key); }
export function ttsPut(key: string, text: string, clip: Clip) { if (text.length <= TTS_CACHE_MAX_CHARS) cache.set(key, clip); }
export function ttsHas(key: string): boolean { return cache.has(key); }
export function ttsSize(): number { return cache.size; }
export function ttsClear(): void { cache.clear(); }
