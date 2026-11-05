"use client";

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

const DEFAULT_PROFILE: UserProfile = {
  id: "kp-user-default",
  name: "Tahmid Hasan",
  title: "Full-Stack Node/React Engineer",
  district: "Dhaka (ধানমন্ডি)",
  skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS"],
  verifiedTrack: "Full-Stack Web & Backend",
  verifiedHourlyUsd: 28,
  vivaScore: 92,
  passedTests: 3,
  passportToken: null,
  admitMatchesCount: 6,
  shortlistedUniversities: ["buet", "brac", "sust"],
  monthlyBudget: 30000,
  expensesLoggedCount: 3,
  farmDistrict: "Bogura",
  farmProduceMaunds: 25,
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = "kormopath_unified_profile_v1";

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(partial: Partial<UserProfile>): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const current = loadUserProfile();
    const updated: UserProfile = {
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch a custom window event so other components across tabs or pages can react immediately
    window.dispatchEvent(new CustomEvent("kormopath_profile_updated", { detail: updated }));
    return updated;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function exportProfileJson(): string {
  const p = loadUserProfile();
  return JSON.stringify(p, null, 2);
}

export function importProfileJson(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || !parsed.name) return false;
    saveUserProfile(parsed);
    return true;
  } catch {
    return false;
  }
}

export function resetProfile(): UserProfile {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_PROFILE;
}
