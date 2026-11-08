"use client";
import { emptyProfile, sanitizeUserProfile, type UserProfile } from "./profileData";
export type { UserProfile } from "./profileData";

const STORAGE_KEY = "kormopath_unified_profile_v1";

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") return emptyProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeUserProfile(JSON.parse(raw)) ?? emptyProfile() : emptyProfile();
  } catch { return emptyProfile(); }
}

function persist(profile: UserProfile): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("kormopath_profile_updated", { detail: profile }));
    return true;
  } catch { return false; }
}

export function saveUserProfile(partial: Partial<UserProfile>): UserProfile {
  const current = loadUserProfile();
  const updated = sanitizeUserProfile({ ...current, ...partial, updatedAt: new Date().toISOString() })!;
  return persist(updated) ? updated : current;
}

export function exportProfileJson(): string {
  return JSON.stringify(loadUserProfile(), null, 2);
}

export function importProfileJson(json: string): boolean {
  try {
    const parsed = sanitizeUserProfile(JSON.parse(json));
    if (!parsed || !parsed.name) return false;
    return persist(parsed);
  } catch { return false; }
}

export function resetProfile(): UserProfile {
  const profile = emptyProfile();
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("kormopath_profile_updated", { detail: profile }));
    } catch { return loadUserProfile(); }
  }
  return profile;
}
