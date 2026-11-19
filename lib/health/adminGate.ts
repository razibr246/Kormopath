/*
 * The admin desk has no login: verification marks live only on the device that made them, so anyone could
 * produce a "verified doctor" screen. Until a server-side admin with sign-in exists, production hides it unless
 * NEXT_PUBLIC_HEALTH_ADMIN_DEMO=on is set on purpose (for example for a supervised demo). No imports: unit-tested.
 */
export function adminDeskEnabled(env: { NODE_ENV?: string; NEXT_PUBLIC_HEALTH_ADMIN_DEMO?: string } = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_HEALTH_ADMIN_DEMO: process.env.NEXT_PUBLIC_HEALTH_ADMIN_DEMO,
}): boolean {
  return env.NODE_ENV !== "production" || env.NEXT_PUBLIC_HEALTH_ADMIN_DEMO === "on";
}
