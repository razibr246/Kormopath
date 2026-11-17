import type { Metadata } from "next";
import { FieldClient } from "./FieldClient";

export const metadata: Metadata = {
  title: "মাঠসাথী — কী লাগাব, আজ সেচ, রোপণ রাডার",
  description:
    "MaathSathi: season planner, water today, crop doctor, field future, Sentinel-1 Ropon Radar, harvest and government support. Demo farmers and real NASA, ISRIC and Sentinel data.",
};

export default function FieldPage() {
  return <FieldClient />;
}
