/**
 * Zapier Automation & Webhook Integration Core
 * Pure domain module — no external imports, 100% deterministic and unit-tested.
 * 
 * Allows KormoPath users to connect 9,000+ apps via Zapier Catch Hooks:
 * - Auto-export contracts to Google Drive / Notion
 * - Send payout leakage reports to Slack / Email
 * - Forward emergency fraud patterns to community alerts
 * - Sync monthly budget totals to Google Sheets
 * 
 * Strict Privacy Invariant:
 * Payloads MUST NEVER contain PII (passwords, PINs, OTPs, full bank accounts, NID).
 */

export type ZapierEventName =
  | "chuktiguard.contract_created"
  | "feeguard.payout_audited"
  | "rokkha.scam_flagged"
  | "legal.draft_prepared"
  | "shohoj.month_summarized";

export interface ZapierEventPayload<T = Record<string, unknown>> {
  event: ZapierEventName;
  timestamp: string;
  source: "kormopath";
  app: string;
  version: "1.0.0";
  data: T;
}

/** Validates that a string is a legitimate Zapier webhook URL */
export function validateZapierWebhookUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL প্রদান করা হয়নি" };
  }
  const clean = url.trim();
  if (!clean.startsWith("https://")) {
    return { valid: false, error: "Zapier ওয়েবহুক শুধুমাত্র সুরক্ষিত https:// হতে হবে" };
  }
  try {
    const parsed = new URL(clean);
    if (!parsed.hostname.endsWith("zapier.com") && !parsed.hostname.endsWith("hooks.zapier.com")) {
      return { valid: false, error: "শুধুমাত্র hooks.zapier.com অনুমোদিত" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "অকার্যকর ওয়েবহুক ইউআরএল" };
  }
}

/** Formats a ChuktiGuard contract export for Zapier (e.g. to create a Google Doc or Notion page) */
export function formatContractForZapier(contract: {
  title: string;
  freelancerName: string;
  clientName: string;
  totalBdt: number;
  milestonesCount: number;
  hasForceMajeure: boolean;
  effectiveDate: string;
}): ZapierEventPayload {
  return {
    event: "chuktiguard.contract_created",
    timestamp: new Date().toISOString(),
    source: "kormopath",
    app: "chuktiguard",
    version: "1.0.0",
    data: {
      title: contract.title,
      freelancer: contract.freelancerName,
      client: contract.clientName,
      total_bdt: contract.totalBdt,
      milestones_count: contract.milestonesCount,
      force_majeure_active: contract.hasForceMajeure,
      effective_date: contract.effectiveDate,
      action_hint: "Sync contract metadata to Google Docs, Notion, or CRM",
    },
  };
}

/** Formats a FeeGuard BD leakage audit for Zapier (e.g. to log to Google Sheets or send Slack notification) */
export function formatFeeGuardAuditForZapier(audit: {
  monthlyGrossUsd: number;
  currentPlatform: string;
  annualLeakageBdt: number;
  bestChannelName: string;
  annualSavingsBdt: number;
}): ZapierEventPayload {
  return {
    event: "feeguard.payout_audited",
    timestamp: new Date().toISOString(),
    source: "kormopath",
    app: "feeguard",
    version: "1.0.0",
    data: {
      monthly_gross_usd: audit.monthlyGrossUsd,
      current_platform: audit.currentPlatform,
      annual_leakage_bdt: audit.annualLeakageBdt,
      recommended_channel: audit.bestChannelName,
      potential_savings_bdt: audit.annualSavingsBdt,
      action_hint: "Log freelance finops audit to Google Sheets or personal dashboard",
    },
  };
}

/** Formats a Rokkha scam incident pattern for Zapier (community awareness without sender PII) */
export function formatScamIncidentForZapier(incident: {
  scamCategory: string;
  channel: "sms" | "whatsapp" | "call" | "telegram";
  matchedRule: string;
  severity: "high" | "critical" | "moderate";
}): ZapierEventPayload {
  return {
    event: "rokkha.scam_flagged",
    timestamp: new Date().toISOString(),
    source: "kormopath",
    app: "rokkha",
    version: "1.0.0",
    data: {
      category: incident.scamCategory,
      channel: incident.channel,
      detection_rule: incident.matchedRule,
      severity: incident.severity,
      action_hint: "Broadcast fraud warning to community channel or security alert",
    },
  };
}

/** Formats a Shohoj Budget monthly summary for Zapier (e.g. sync family finance to Google Sheets) */
export function formatBudgetSummaryForZapier(summary: {
  month: string;
  totalIncomePoisha: number;
  totalExpensePoisha: number;
  netSavingsPoisha: number;
  zakatPaidPoisha?: number;
}): ZapierEventPayload {
  return {
    event: "shohoj.month_summarized",
    timestamp: new Date().toISOString(),
    source: "kormopath",
    app: "shohoj",
    version: "1.0.0",
    data: {
      month: summary.month,
      total_income_bdt: Number((summary.totalIncomePoisha / 100).toFixed(2)),
      total_expense_bdt: Number((summary.totalExpensePoisha / 100).toFixed(2)),
      net_savings_bdt: Number((summary.netSavingsPoisha / 100).toFixed(2)),
      zakat_bdt: summary.zakatPaidPoisha ? Number((summary.zakatPaidPoisha / 100).toFixed(2)) : 0,
      action_hint: "Update personal finance spreadsheet or annual tax records",
    },
  };
}

/** Sanitizes any payload to ensure no sensitive fields accidentally leak */
export function sanitizeZapierPayload<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const BANNED_KEYS = ["password", "pin", "otp", "secret", "token", "nid", "cvv", "trxid", "account_number"];
  const clean: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data)) {
    const lower = key.toLowerCase();
    if (BANNED_KEYS.some((banned) => lower.includes(banned))) {
      continue; // drop sensitive fields
    }
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      clean[key] = sanitizeZapierPayload(val as Record<string, unknown>);
    } else {
      clean[key] = val;
    }
  }

  return clean;
}
