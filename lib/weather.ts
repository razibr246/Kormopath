import { z } from "zod";
import type { WeatherHour } from "./haatbazar.ts";

const values = (lo: number, hi: number) => z.array(z.number().finite().min(lo).max(hi).nullable()).max(400);
const Forecast = z.object({ hourly: z.object({
  time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/)).min(6).max(400),
  temperature_2m: values(-20, 60),
  precipitation_probability: values(0, 100),
  precipitation: values(0, 500),
  wind_speed_10m: values(0, 300),
}) });

/** Missing observations must never be converted to calm/dry weather. */
export function forecastHours(raw: unknown, now = new Date()): WeatherHour[] {
  const h = Forecast.parse(raw).hourly;
  const localHour = new Date(now.getTime() + 6 * 3600_000).toISOString().slice(0, 13);
  const start = h.time.findIndex((time) => time.slice(0, 13) === localHour);
  if (start < 0) throw new Error("Forecast does not cover the current hour.");
  const selected = h.time.slice(start, start + 24);
  if (selected.length < 6) throw new Error("At least six forecast hours are required.");
  let previous = 0;
  return selected.map((time, k) => {
    const timestamp = Date.parse(time + ":00+06:00");
    if (!Number.isFinite(timestamp) || (k > 0 && timestamp - previous !== 3600_000)) throw new Error("Forecast hours must be consecutive.");
    previous = timestamp;
    const i = start + k;
    const temperatureC = h.temperature_2m[i];
    const rain = h.precipitation_probability[i];
    const precipitationMm = h.precipitation[i];
    const windKmh = h.wind_speed_10m[i];
    if (temperatureC == null || rain == null || precipitationMm == null || windKmh == null) throw new Error("Forecast observations are incomplete.");
    return { time, temperatureC, precipProbability: Math.round(rain), precipitationMm, windKmh };
  });
}
