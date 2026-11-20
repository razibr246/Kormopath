import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateZapierWebhookUrl,
  formatContractForZapier,
  formatFeeGuardAuditForZapier,
  formatScamIncidentForZapier,
  formatBudgetSummaryForZapier,
  sanitizeZapierPayload,
} from "../lib/zapier.ts";

test("validateZapierWebhookUrl correctly accepts hooks.zapier.com and rejects unsafe URLs", () => {
  const valid = validateZapierWebhookUrl("https://hooks.zapier.com/hooks/catch/123456/abcdef/");
  assert.equal(valid.valid, true);

  const invalidProto = validateZapierWebhookUrl("http://hooks.zapier.com/hooks/catch/123456/abcdef/");
  assert.equal(invalidProto.valid, false);

  const maliciousHost = validateZapierWebhookUrl("https://malicious-site.com/steal-data");
  assert.equal(maliciousHost.valid, false);

  const empty = validateZapierWebhookUrl("");
  assert.equal(empty.valid, false);
});

test("formatContractForZapier produces standard schema with action hint", () => {
  const payload = formatContractForZapier({
    title: "Web Development Master Agreement",
    freelancerName: "Razib Miah",
    clientName: "Acme Corp",
    totalBdt: 150000,
    milestonesCount: 3,
    hasForceMajeure: true,
    effectiveDate: "2026-11-20",
  });

  assert.equal(payload.event, "chuktiguard.contract_created");
  assert.equal(payload.source, "kormopath");
  assert.equal(payload.app, "chuktiguard");
  assert.equal(payload.data.title, "Web Development Master Agreement");
  assert.equal(payload.data.total_bdt, 150000);
  assert.equal(payload.data.force_majeure_active, true);
});

test("formatFeeGuardAuditForZapier computes correct BDT savings", () => {
  const payload = formatFeeGuardAuditForZapier({
    monthlyGrossUsd: 1000,
    currentPlatform: "Fiverr",
    annualLeakageBdt: 315274,
    bestChannelName: "Direct SWIFT",
    annualSavingsBdt: 275184,
  });

  assert.equal(payload.event, "feeguard.payout_audited");
  assert.equal(payload.data.current_platform, "Fiverr");
  assert.equal(payload.data.annual_leakage_bdt, 315274);
  assert.equal(payload.data.potential_savings_bdt, 275184);
});

test("formatBudgetSummaryForZapier converts integer poisha into proper BDT floating values", () => {
  const payload = formatBudgetSummaryForZapier({
    month: "2026-11",
    totalIncomePoisha: 5000000, // 50,000.00 BDT
    totalExpensePoisha: 3250050, // 32,500.50 BDT
    netSavingsPoisha: 1749950, // 17,499.50 BDT
    zakatPaidPoisha: 250000, // 2,500.00 BDT
  });

  assert.equal(payload.event, "shohoj.month_summarized");
  assert.equal(payload.data.total_income_bdt, 50000);
  assert.equal(payload.data.total_expense_bdt, 32500.5);
  assert.equal(payload.data.net_savings_bdt, 17499.5);
  assert.equal(payload.data.zakat_bdt, 2500);
});

test("sanitizeZapierPayload strictly strips passwords, PINs, OTPs, and secrets", () => {
  const dirty = {
    username: "razib",
    account_number: "1234567890",
    user_password: "supersecretpassword",
    pinCode: "1234",
    otp_token: "998877",
    safeData: {
      client: "Google",
      secret_key: "should_be_stripped",
      amount: 500,
    },
  };

  const clean = sanitizeZapierPayload(dirty);
  assert.equal(clean.username, "razib");
  assert.equal(clean.account_number, undefined);
  assert.equal(clean.user_password, undefined);
  assert.equal(clean.pinCode, undefined);
  assert.equal(clean.otp_token, undefined);

  const nested = clean.safeData as Record<string, unknown>;
  assert.equal(nested.client, "Google");
  assert.equal(nested.secret_key, undefined);
  assert.equal(nested.amount, 500);
});
