import test from "node:test";
import assert from "node:assert/strict";
import {
  ttsKey,
  ttsGet,
  ttsPut,
  ttsHas,
  ttsSize,
  ttsClear,
  TTS_CACHE_MAX_CHARS,
} from "../../lib/ttsCache.ts";

test("ttsKey generates consistent SHA-256 hashes", () => {
  const k1 = ttsKey("Kore", "friendly", "নমস্কার");
  const k2 = ttsKey("Kore", "friendly", "নমস্কার");
  const k3 = ttsKey("Puck", "friendly", "নমস্কার");

  assert.equal(typeof k1, "string");
  assert.equal(k1.length, 64);
  assert.equal(k1, k2);
  assert.notEqual(k1, k3);
});

test("ttsPut and ttsGet store and retrieve clips within bounds", () => {
  ttsClear();
  assert.equal(ttsSize(), 0);

  const key = ttsKey("Kore", "calm", "জরুরি সাহায্য ৯৯৯");
  const clip = { audio: "BASE64AUDIO==", mimeType: "audio/wav", model: "gemini-3.8-flash-lite-tts" };

  ttsPut(key, "জরুরি সাহায্য ৯৯৯", clip);
  assert.equal(ttsHas(key), true);
  assert.equal(ttsSize(), 1);

  const retrieved = ttsGet(key);
  assert.deepEqual(retrieved, clip);
});

test("ttsPut rejects text exceeding TTS_CACHE_MAX_CHARS", () => {
  ttsClear();
  const oversizedText = "ক".repeat(TTS_CACHE_MAX_CHARS + 10);
  const key = ttsKey("Kore", "calm", oversizedText);
  const clip = { audio: "OVERSIZED==", mimeType: "audio/wav", model: "gemini-3.8-flash-lite-tts" };

  ttsPut(key, oversizedText, clip);
  assert.equal(ttsHas(key), false);
  assert.equal(ttsGet(key), undefined);
});
