import { HealthShell } from "@/components/apps/health/HealthShell";

export default function MediscanLayout({ children }: { children: React.ReactNode }) {
  return <HealthShell>{children}</HealthShell>;
}
