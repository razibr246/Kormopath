// Open Badges 3.0-shaped export of a KormoPath Skill Passport. Pure, no imports, so it runs
// under `node --test`.
//
// HONESTY RULE: the JSON this builds is UNSIGNED. It carries no Data Integrity proof and no JWT
// signature, so a badge wallet cannot verify it cryptographically. Authenticity is checked only
// by opening the evidence link (/verify?t=<token>), where the server checks the HMAC on the
// passport. The description and the evidence narrative say so in plain words.
//
// Context URLs were checked on 2026-11-17 against the 1EdTech Open Badges 3.0 spec
// (https://www.imsglobal.org/spec/ob/v3p0/, Example 1) and both resolve as JSON-LD.

export const VC_CONTEXT_V2 = "https://www.w3.org/ns/credentials/v2";
export const OB_CONTEXT_V3 = "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json";

/** The fields of a v1 passport that the badge uses. */
export interface BadgePassport {
  name: string;
  track: string;
  challenge: string;
  testsPassed: number;
  testsTotal: number;
  edgePassed: boolean;
  perfPassed: boolean;
  vivaScore: number;
  vivaTotal: number;
  assisted: boolean;
  issuedAt: string; // ISO date-time
}

export interface BadgeInput {
  passport: BadgePassport;
  passportId: string; // short id shown in the UI
  token: string; // the signed passport token, used only to build the evidence URL
  origin: string; // e.g. https://kormopath.example — no trailing slash needed
  /** CV skills the auditor matched to evidence text. Not tested by the challenge; labelled as such. */
  documentSkills?: string[];
}

const b64urlToString = (s: string): string => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const isStr = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/**
 * Read the payload of a v1 passport token WITHOUT checking its signature. Only for building the
 * user's own download from a token the server just issued; never use it to trust a token.
 * Returns null for anything that is not a well-formed v1 passport.
 */
export function readPassportPayload(token: string): BadgePassport | null {
  if (typeof token !== "string" || token.length > 8000) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0]) return null;
  let raw: unknown;
  try { raw = JSON.parse(b64urlToString(parts[0])); } catch { return null; }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return null;
  if (!isStr(r.name, 60) || typeof r.track !== "string" || r.track.length > 60 || !isStr(r.challenge, 80)) return null;
  if (!isInt(r.testsPassed, 0, 50) || !isInt(r.testsTotal, 1, 50) || !isInt(r.vivaScore, 0, 20) || !isInt(r.vivaTotal, 1, 20)) return null;
  if (r.testsPassed > r.testsTotal || r.vivaScore > r.vivaTotal) return null;
  if (typeof r.edgePassed !== "boolean" || typeof r.perfPassed !== "boolean" || typeof r.assisted !== "boolean") return null;
  if (typeof r.issuedAt !== "string" || Number.isNaN(Date.parse(r.issuedAt))) return null;
  return {
    name: r.name, track: r.track, challenge: r.challenge,
    testsPassed: r.testsPassed, testsTotal: r.testsTotal, edgePassed: r.edgePassed, perfPassed: r.perfPassed,
    vivaScore: r.vivaScore, vivaTotal: r.vivaTotal, assisted: r.assisted, issuedAt: r.issuedAt,
  };
}

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "skill";

export const UNSIGNED_NOTE =
  "This file is unsigned: it has no Data Integrity proof or JWT signature, so badge wallets cannot verify it on their own. " +
  "To check that it is authentic, open the evidence link; the KormoPath server checks the HMAC signature on the passport there.";

export function verifyUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/verify?t=${encodeURIComponent(token)}`;
}

/** Build an Open Badges 3.0-shaped OpenBadgeCredential (unsigned). Deterministic for a given input. */
export function buildOpenBadge(input: BadgeInput) {
  const { passport: p, passportId, token } = input;
  const origin = input.origin.replace(/\/+$/, "");
  const evidenceUrl = verifyUrl(origin, token);
  const track = p.track || "Software Development";
  const docSkills = [...new Set((input.documentSkills ?? []).map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 60))].slice(0, 20);

  const results = [
    `${p.testsPassed}/${p.testsTotal} unit tests passed`,
    `edge cases ${p.edgePassed ? "passed" : "not all passed"}`,
    `performance budget ${p.perfPassed ? "met" : "not met"}`,
    `viva ${p.vivaScore}/${p.vivaTotal}`,
    p.assisted ? "reference solution was viewed (assisted)" : "no reference solution viewed",
  ].join("; ");

  const description =
    `Passed the KormoPath coding challenge "${p.challenge}" on the ${track} track: ${results}. ` +
    (docSkills.length
      ? `Tags also list skills from the holder's own CV that KormoPath's auditor matched to evidence text; those were not separately tested. `
      : "") +
    UNSIGNED_NOTE;

  return {
    "@context": [VC_CONTEXT_V2, OB_CONTEXT_V3],
    id: `urn:kormopath:passport:${passportId}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: { id: origin, type: ["Profile"], name: "KormoPath", url: origin },
    validFrom: p.issuedAt,
    name: `KormoPath Skill Passport ${passportId}`,
    description,
    credentialSubject: {
      type: ["AchievementSubject"],
      name: p.name,
      achievement: {
        id: `urn:kormopath:achievement:${slug(track)}:${slug(p.challenge)}`,
        type: ["Achievement"],
        achievementType: "Assessment",
        name: `${p.challenge} (${track})`,
        description: `Fixed a real-world bug in a timed coding challenge, passed its unit tests and answered a viva on the fix. ${UNSIGNED_NOTE}`,
        criteria: {
          narrative: "Every unit test in the challenge must pass in KormoPath's sandbox, and the holder must answer the viva questions about the fix. The test results and viva score are recorded in the signed passport.",
        },
        tag: [track, ...docSkills],
      },
    },
    evidence: [
      {
        id: evidenceUrl,
        type: ["Evidence"],
        name: `Signed Skill Passport ${passportId}`,
        narrative: `Open this link to check the passport's HMAC signature on KormoPath. Result recorded: ${results}.`,
        genre: "Verification link",
      },
    ],
  };
}

export type OpenBadgeCredential = ReturnType<typeof buildOpenBadge>;
