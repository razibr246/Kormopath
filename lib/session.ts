/**
 * Demo profiles and the freemium plan for KormoPath (B2C). Pure: no imports, unit-tested in tests/session.test.ts.
 *
 * Rules (AGENTS.md, "Freemium"):
 * - There are no real accounts, passwords or servers. The three profiles below are fictional demo profiles that
 *   only change what this browser shows; everything stays on this device.
 * - Safety is never gated: emergency hospitals, the 999/16263 strip, the symptom assistant, prescription reading,
 *   adherence and fever watch, all of legal aid and Rokkha, and every helpline are free for everyone, signed in or not.
 * - Real payments are OFF. No receiving number exists in this file or the UI, and nothing a user types (a bKash
 *   TrxID or anything else) can unlock a feature. Pro can only be switched on as a labelled DEMO, with no money.
 * - Prices are proposed by the team, not market data; the founder decides the final numbers.
 */

export type UserTier = "free" | "partial" | "pro";

export type UserPersona = {
  id: "rahim_uddin" | "lamia_akter" | "najeeb_ahmed";
  nameBn: string;
  nameEn: string;
  tier: UserTier;
  badgeBn: string;
  badgeEn: string;
  roleBn: string;
  roleEn: string;
  locationBn: string;
  locationEn: string;
  descriptionBn: string;
  avatarIcon: "farmer" | "health" | "pro";
  unlockedApps: string[];
};

/** A request to be told when paid plans open. It records interest only and never unlocks anything. */
export type EarlyAccessRecord = { scope: "all" | string; at: string };

export type UserSession = {
  personaId: string;
  nameBn: string;
  nameEn: string;
  tier: UserTier;
  unlockedApps: string[];
  /** true whenever paid features are on: they were switched on as a demo, without money. */
  demo: boolean;
  earlyAccess: EarlyAccessRecord[];
  lastLoginAt: string;
};

/** Real payments stay off until a verified bKash merchant account and a server-side check exist. */
export const PAYMENTS_OPEN = false;
/** Proposed monthly prices (team proposal, not market data). The founder decides the final numbers. */
export const PRICE_SINGLE_APP_BDT = 99;
export const SINGLE_APP_PRICE_BDT = PRICE_SINGLE_APP_BDT;
export const PRICE_FULL_ACCESS_BDT = 299;
export const ALL_ACCESS_PRICE_BDT = PRICE_FULL_ACCESS_BDT;
export const PRICES_PROPOSED = true;

// Plain string keys (same format as storageKey("auth", …)) so this file stays import-free for node --test.
export const AUTH_SESSION_KEY = "kormopath:auth:session";
export const LEGACY_AUTH_SESSION_KEY = "kormopath:platform:session";

/** Whole apps that are free for everyone, always. */
export const ALWAYS_FREE_APPS = ["rokkha", "legal", "krishi", "shohoj", "haatbazar", "feeguard", "chuktiguard"] as const;

/**
 * Safety features inside apps that also have paid extras. Never gated, for anyone, in any state.
 * ids are `${appId}:${featureId}`.
 */
export const SAFETY_FEATURES = [
  "mediscan:emergency_hospitals",
  "mediscan:emergency_strip",
  "mediscan:symptom_assistant",
  "mediscan:health_assistant",
  "mediscan:health_assistant_specialist",
  "mediscan:prescription_reading",
  "mediscan:ocr",
  "mediscan:adherence",
  "mediscan:fever_watch",
  "mediscan:helplines",
  "mediscan:ambulance",
  "legal:assistant",
  "legal:helplines",
  "rokkha:scam_check",
  "rokkha:helplines",
] as const;

/** Convenience features a paid plan adds. Only these can ever be gated. */
export const PAID_FEATURES: Readonly<Record<string, readonly string[]>> = {
  admitbuddy: ["practice_exams", "model_tests", "ai_counselor_unlimited"],
  mediscan: ["doctor_booking", "tele_consult"],
  probaho: ["unlimited_coaching"],
  workspace: ["pdf_export"],
};

export const PERSONAS: Record<UserPersona["id"], UserPersona> = {
  rahim_uddin: {
    id: "rahim_uddin",
    nameBn: "রহিম উদ্দিন",
    nameEn: "Rahim Uddin",
    tier: "free",
    badgeBn: "ডেমো প্রোফাইল · ফ্রি",
    badgeEn: "Demo profile · Free",
    roleBn: "কৃষক ও পল্লী উদ্যোক্তা (কাল্পনিক)",
    roleEn: "Farmer & entrepreneur (fictional)",
    locationBn: "গোদাগাড়ী, রাজশাহী",
    locationEn: "Godagari, Rajshahi",
    descriptionBn: "কাল্পনিক ডেমো প্রোফাইল: ফ্রি প্ল্যানে কী কী পাওয়া যায় দেখায়। সুরক্ষা ও জরুরি সেবা সবার জন্য ফ্রি।",
    avatarIcon: "farmer",
    unlockedApps: [],
  },
  lamia_akter: {
    id: "lamia_akter",
    nameBn: "লামিয়া আক্তার",
    nameEn: "Lamia Akter",
    tier: "partial",
    badgeBn: "ডেমো প্রোফাইল · একটি অ্যাপ",
    badgeEn: "Demo profile · One app",
    roleBn: "স্বাস্থ্য সহকারী ও শিক্ষার্থী (কাল্পনিক)",
    roleEn: "Community health worker & student (fictional)",
    locationBn: "মিরপুর, ঢাকা",
    locationEn: "Mirpur, Dhaka",
    descriptionBn: "কাল্পনিক ডেমো প্রোফাইল: একটি অ্যাপের পেইড সুবিধা (মেডিস্ক্যান) ডেমো হিসেবে চালু, কোনো টাকা নেওয়া হয়নি।",
    avatarIcon: "health",
    unlockedApps: ["mediscan"],
  },
  najeeb_ahmed: {
    id: "najeeb_ahmed",
    nameBn: "নাজিব আহমেদ",
    nameEn: "Najeeb Ahmed",
    tier: "pro",
    badgeBn: "ডেমো প্রোফাইল · অল-অ্যাক্সেস",
    badgeEn: "Demo profile · All-access",
    roleBn: "সফটওয়্যার প্রকৌশলী (কাল্পনিক)",
    roleEn: "Software engineer (fictional)",
    locationBn: "পাঁচলাইশ, চট্টগ্রাম",
    locationEn: "Panchlaish, Chattogram",
    descriptionBn: "কাল্পনিক ডেমো প্রোফাইল: সব পেইড সুবিধা ডেমো হিসেবে চালু, কোনো টাকা নেওয়া হয়নি।",
    avatarIcon: "pro",
    unlockedApps: ["*"],
  },
};

export const DEFAULT_PERSONA_ID: UserPersona["id"] = "rahim_uddin";

export function getPersona(id: string): UserPersona | null {
  return Object.prototype.hasOwnProperty.call(PERSONAS, id) ? PERSONAS[id as UserPersona["id"]] : null;
}

export function createSessionFromPersona(persona: UserPersona, now: () => string = () => new Date().toISOString()): UserSession {
  return {
    personaId: persona.id,
    nameBn: persona.nameBn,
    nameEn: persona.nameEn,
    tier: persona.tier,
    unlockedApps: [...persona.unlockedApps],
    // Any profile with paid features is a demo: no money was ever taken.
    demo: persona.tier !== "free",
    earlyAccess: [],
    lastLoginAt: now(),
  };
}

export function isAlwaysFreeApp(appId: string): boolean {
  return (ALWAYS_FREE_APPS as readonly string[]).includes(appId);
}

export function isSafetyFeature(appId: string, featureId: string): boolean {
  return (SAFETY_FEATURES as readonly string[]).includes(`${appId}:${featureId}`);
}

/** True when every paid extra of this app is on for the session (free apps always count as unlocked). */
export function isAppUnlocked(session: UserSession | null, appId: string): boolean {
  if (isAlwaysFreeApp(appId) || !PAID_FEATURES[appId]) return true;
  if (!session) return false;
  return session.tier === "pro" || session.unlockedApps.includes("*") || session.unlockedApps.includes(appId);
}

/**
 * Whether a feature needs a paid plan for this session. Safety features and anything not listed in PAID_FEATURES
 * are never gated.
 */
export function isFeatureGated(session: UserSession | null, appId: string, featureId: string): boolean {
  if (isSafetyFeature(appId, featureId) || isAlwaysFreeApp(appId)) return false;
  if (!(PAID_FEATURES[appId] ?? []).includes(featureId)) return false;
  return !isAppUnlocked(session, appId);
}

/** Switch paid features on as a clearly labelled demo: no money, no verification, visible "ডেমো" badge. */
export function enableDemoPro(session: UserSession, scope: "all" | string = "all"): UserSession {
  if (scope === "all" || scope === "*") return { ...session, tier: "pro", unlockedApps: ["*"], demo: true };
  const unlocked = new Set(session.unlockedApps);
  unlocked.add(scope.slice(0, 50));
  return { ...session, tier: session.tier === "pro" ? "pro" : "partial", unlockedApps: [...unlocked], demo: true };
}

/** Save interest in a paid plan on this device. Never changes tier or unlocked apps. */
export function joinEarlyAccess(session: UserSession, scope: "all" | string, now: () => string = () => new Date().toISOString()): UserSession {
  const s = scope === "*" ? "all" : scope.slice(0, 50);
  if (session.earlyAccess.some((e) => e.scope === s)) return session;
  return { ...session, earlyAccess: [...session.earlyAccess, { scope: s, at: now() }].slice(-20) };
}

/** A guest session (no profile chosen) used when someone joins early access before picking a demo profile. */
export function guestSession(now: () => string = () => new Date().toISOString()): UserSession {
  return { personaId: "guest", nameBn: "অতিথি", nameEn: "Guest", tier: "free", unlockedApps: [], demo: false, earlyAccess: [], lastLoginAt: now() };
}

/**
 * Sanitizer for stored sessions (untrusted client data). Any paid tier read from storage is always marked demo,
 * so editing localStorage can never produce something that looks like a real purchase.
 */
export function sanitizeSession(raw: unknown): UserSession | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.personaId !== "string" || !r.personaId) return null;
  const tier: UserTier = r.tier === "pro" || r.tier === "partial" ? r.tier : "free";
  const unlockedApps = Array.isArray(r.unlockedApps)
    ? r.unlockedApps.filter((x): x is string => typeof x === "string" && /^[a-zA-Z0-9_*.-]{1,50}$/.test(x)).slice(0, 50)
    : [];
  const earlyAccess: EarlyAccessRecord[] = Array.isArray(r.earlyAccess)
    ? r.earlyAccess
        .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === "object"))
        .map((e) => ({ scope: typeof e.scope === "string" ? e.scope.slice(0, 50) : "all", at: typeof e.at === "string" ? e.at.slice(0, 40) : "" }))
        .slice(0, 20)
    : [];
  return {
    personaId: r.personaId.slice(0, 50),
    nameBn: typeof r.nameBn === "string" ? r.nameBn.slice(0, 100) : "ব্যবহারকারী",
    nameEn: typeof r.nameEn === "string" ? r.nameEn.slice(0, 100) : "User",
    tier,
    unlockedApps: tier === "free" ? unlockedApps.filter((a) => a !== "*") : unlockedApps,
    demo: tier !== "free" || unlockedApps.length > 0 ? true : Boolean(r.demo),
    earlyAccess,
    lastLoginAt: typeof r.lastLoginAt === "string" ? r.lastLoginAt.slice(0, 40) : new Date().toISOString(),
  };
}

type ReadStore = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type WriteStore = ReadStore & { removeItem(key: string): void };

const browserStore = (): WriteStore | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

/** Reads the stored session, migrating the legacy key once. */
export function getStoredSession(storage?: ReadStore): UserSession | null {
  const store = storage ?? browserStore();
  if (!store) return null;
  try {
    const rawAuth = store.getItem(AUTH_SESSION_KEY);
    if (rawAuth) {
      const parsed = sanitizeSession(JSON.parse(rawAuth));
      if (parsed) return parsed;
    }
    const rawLegacy = store.getItem(LEGACY_AUTH_SESSION_KEY);
    if (rawLegacy) {
      const parsed = sanitizeSession(JSON.parse(rawLegacy));
      if (parsed) {
        try { store.setItem(AUTH_SESSION_KEY, JSON.stringify(parsed)); } catch { /* quota */ }
        return parsed;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Saves (or clears) the session on this device and tells open components. */
export function saveStoredSession(session: UserSession | null, storage?: WriteStore): void {
  const store = storage ?? browserStore();
  if (!store) return;
  try {
    if (session) store.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    else {
      store.removeItem(AUTH_SESSION_KEY);
      store.removeItem(LEGACY_AUTH_SESSION_KEY);
    }
  } catch {
    /* quota */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kormopath:session-change", { detail: session }));
}
