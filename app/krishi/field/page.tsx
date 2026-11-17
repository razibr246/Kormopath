import type { Metadata } from "next";
import { FieldClient } from "./FieldClient";

export const metadata: Metadata = {
  title: "MaathSathi Field — satellite, soil and season tools",
  description:
    "FieldShift360 farmer tools inside MaathSathi: season planner, water today, crop doctor, field future, Sentinel-1 Ropon Radar, harvest and government support. Demo farmers and real NASA, ISRIC and Sentinel data.",
};

export default function FieldPage() {
  return <FieldClient />;
}
