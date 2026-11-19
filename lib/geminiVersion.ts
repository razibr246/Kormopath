/*
 * Which Interactions API version a request needs (no imports, so it is unit-tested in tests/gemini-version.test.ts).
 * Image, document and audio inputs are only accepted on v1beta ("The value 'image' is not supported for
 * 'input[n].type' in v1, it is available in v1beta"); text-only requests stay on v1.
 */
export function apiVersionFor(request: { input: unknown }): "v1" | "v1beta" {
  const input = request.input;
  if (!Array.isArray(input)) return "v1";
  return input.some((p) => typeof p === "object" && p !== null && "type" in p && ["image", "document", "audio"].includes((p as { type: unknown }).type as string)) ? "v1beta" : "v1";
}
