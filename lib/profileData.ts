/** Device profile fields are user-entered records, never verified credentials. */
export interface UserProfile {
  id: string;
  name: string;
  title: string;
  district: string;
  skills: string[];
  verifiedTrack: string;
  verifiedHourlyUsd: number;
  vivaScore: number;
  passedTests: number;
  passportToken: string | null;
  admitMatchesCount: number;
  shortlistedUniversities: string[];
  monthlyBudget: number;
  expensesLoggedCount: number;
  farmDistrict: string;
  farmProduceMaunds: number;
  updatedAt: string;
}

export function emptyProfile(): UserProfile {
  return { id: "kp-user-default", name: "", title: "", district: "", skills: [], verifiedTrack: "", verifiedHourlyUsd: 0, vivaScore: 0, passedTests: 0, passportToken: null, admitMatchesCount: 0, shortlistedUniversities: [], monthlyBudget: 0, expensesLoggedCount: 0, farmDistrict: "", farmProduceMaunds: 0, updatedAt: "" };
}

export function sanitizeUserProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const result = emptyProfile();
  for (const key of ["id", "name", "title", "district", "verifiedTrack", "farmDistrict"] as const) {
    if (typeof source[key] === "string") result[key] = source[key].trim().slice(0, 200);
  }
  for (const key of ["skills", "shortlistedUniversities"] as const) {
    const value = source[key];
    if (Array.isArray(value)) result[key] = [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 100)).filter(Boolean))].slice(0, 100);
  }
  for (const key of ["verifiedHourlyUsd", "vivaScore", "passedTests", "admitMatchesCount", "monthlyBudget", "expensesLoggedCount", "farmProduceMaunds"] as const) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000) result[key] = value;
  }
  if (typeof source.passportToken === "string" && source.passportToken.length <= 8000) result.passportToken = source.passportToken;
  if (typeof source.updatedAt === "string" && Number.isFinite(Date.parse(source.updatedAt))) result.updatedAt = new Date(source.updatedAt).toISOString();
  return result;
}
