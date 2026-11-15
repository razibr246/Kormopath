import { test } from "node:test";
import assert from "node:assert/strict";
import { forecastHours } from "../lib/weather.ts";
import { sprayWindow } from "../lib/haatbazar.ts";
const now = new Date("2026-11-08T10:15:00Z");
const data = () => ({ hourly: { time: Array.from({ length: 8 }, (_, i) => `2026-11-08T${16+i}:00`), temperature_2m: Array(8).fill(25), precipitation_probability: Array(8).fill(10), precipitation: Array(8).fill(0), wind_speed_10m: Array(8).fill(5) } });

test("weather parser aligns current Dhaka hour with complete observations", () => {
  const hours = forecastHours(data(), now);
  assert.equal(hours[0].time, "2026-11-08T16:00");
  assert.equal(hours.length, 8);
  assert.equal(sprayWindow(hours).ok, true);
});
test("missing values, shortened arrays and stale forecasts never become dry calm weather", () => {
  const missing = data(); missing.hourly.precipitation_probability[0] = null;
  assert.throws(() => forecastHours(missing, now), /incomplete/);
  const short = data(); short.hourly.wind_speed_10m = [];
  assert.throws(() => forecastHours(short, now), /incomplete/);
  assert.throws(() => forecastHours(data(), new Date("2026-11-09T10:00:00Z")), /current hour/);
  const gap = data(); gap.hourly.time[1] = gap.hourly.time[2];
  assert.throws(() => forecastHours(gap, now), /consecutive/);
});
test("spray check requires six finite hours and does not approve incomplete data", () => {
  const hours = forecastHours(data(), now);
  assert.equal(sprayWindow(hours.slice(0, 5)).ok, false);
  assert.equal(sprayWindow([{ ...hours[0], windKmh: NaN }, ...hours.slice(1)]).ok, false);
  assert.equal(sprayWindow([{ ...hours[0], precipProbability: -1 }, ...hours.slice(1)]).ok, false);
});
