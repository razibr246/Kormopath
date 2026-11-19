import { test } from "node:test";
import assert from "node:assert/strict";
import { apiVersionFor } from "../lib/geminiVersion.ts";

test("text requests use v1; image, document and audio inputs use v1beta (v1 rejects them)", () => {
  assert.equal(apiVersionFor({ input: "hello" }), "v1");
  assert.equal(apiVersionFor({ input: [{ type: "text", text: "hi" }] }), "v1");
  for (const type of ["image", "document", "audio"]) {
    assert.equal(apiVersionFor({ input: [{ type: "text", text: "read this" }, { type, data: "AAAA", mime_type: "x/y" }] }), "v1beta", type);
  }
});
