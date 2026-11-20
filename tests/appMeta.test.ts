import { test } from "node:test";
import assert from "node:assert/strict";
import { APP_METADATA_REGISTRY, getAppMetadata } from "../lib/appMeta.ts";

test("APP_METADATA_REGISTRY contains complete verified metadata for key apps", () => {
  const apps = ["legal", "mediscan", "rokkha", "krishi", "feeguard", "chuktiguard", "shohoj", "admitbuddy", "probaho"];
  for (const appId of apps) {
    const meta = getAppMetadata(appId);
    assert.ok(meta, `App metadata must exist for ${appId}`);
    assert.ok(meta.nameBn.length > 0, `${appId} must have nameBn`);
    assert.ok(meta.taglineBn.length > 0, `${appId} must have taglineBn`);
    assert.ok(meta.trustBadgeBn.length > 0, `${appId} must have trustBadgeBn`);
    assert.ok(meta.authorityBn.length > 0, `${appId} must have authorityBn`);
    assert.ok(meta.keyBenefitsBn.length >= 3, `${appId} must have at least 3 key benefits`);
    assert.ok(meta.speechSummaryBn.length > 10, `${appId} must have speechSummaryBn`);
    assert.ok(meta.privacyNoteBn.length > 10, `${appId} must have privacyNoteBn`);
    assert.ok(meta.quickLinks.length >= 2, `${appId} must have quickLinks`);
  }
});

test("Legal aid metadata contains 16699 toll-free helpline and Act No 6 of 2000 citation", () => {
  const legal = getAppMetadata("legal");
  assert.ok(legal);
  assert.equal(legal.primaryHelpline?.number, "16699");
  assert.equal(legal.primaryHelpline?.isTollFree, true);
  assert.match(legal.lawCitationBn || "", /আইনগত সহায়তা প্রদান আইন/);
  assert.match(legal.authorityBn, /আইনগত সহায়তা অধিদপ্তর/);
});
