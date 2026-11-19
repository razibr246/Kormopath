import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distanceKm, approxMinutes, parseElement, parseOverpass, rankHospitals, ambulanceStations, specialityMatch, cleanPhones,
  inBangladesh, overpassQuery, directionsUrl, cacheKey,
} from "../lib/health/hospitals.ts";

// A trimmed real Overpass response near Shahbag, Dhaka (fetched 2026-11-18, © OpenStreetMap contributors).
const SAMPLE = [{"type": "node", "id": 354463524, "lat": 23.7391179, "lon": 90.3955527, "tags": {"amenity": "hospital", "healthcare": "hospital", "name": "পিজি হাসপাতাল", "name:en": "Institute of Post Graduates Medicine and Research"}}, {"type": "node", "id": 364425541, "lat": 23.7434833, "lon": 90.3825849, "tags": {"addr:city": "Dhaka", "addr:housenumber": "14/E", "addr:street": "Road 6", "amenity": "hospital", "emergency": "yes", "name": "Gonoshastha Nagar Hospital", "name:bn": "গণস্বাস্থ্য নগর হাসপাতাল", "phone": "+8801716-838078", "wheelchair": "yes"}}, {"type": "node", "id": 871761335, "lat": 23.7485032, "lon": 90.4050678, "tags": {"amenity": "hospital", "name": "Ad-Din Women's Medical college & Hospital", "wikidata": "Q4678070"}}, {"type": "node", "id": 877863211, "lat": 23.746598, "lon": 90.4027318, "tags": {"amenity": "hospital", "healthcare": "hospital", "name": "Holy Family Red Crescent Medical College and Hospital"}}, {"type": "node", "id": 1787174815, "lat": 23.7501949, "lon": 90.3697475, "tags": {"amenity": "hospital", "emergency": "yes", "name": "Bangladesh Medical College Hospital"}}];
const HERE = { lat: 23.7385, lon: 90.395 };

test("distance: haversine is accurate and symmetric; estimate is labelled-speed based", () => {
  const d = distanceKm(23.8103, 90.4125, 22.3569, 91.7832); // Dhaka – Chattogram, about 213 km straight line
  assert.ok(d > 205 && d < 220, String(d));
  assert.equal(Math.round(distanceKm(1, 2, 3, 4) * 1000), Math.round(distanceKm(3, 4, 1, 2) * 1000));
  assert.equal(distanceKm(23.7, 90.4, 23.7, 90.4), 0);
  assert.equal(approxMinutes(5), 21); // 5 km × 1.4 road factor at 20 km/h
  assert.ok(approxMinutes(0) >= 1);
});

test("parse: real OSM elements keep only what the tags say; nothing is invented", () => {
  const places = parseOverpass({ elements: SAMPLE });
  assert.equal(places.length, 5);
  const gono = places.find((p) => p.name === "Gonoshastha Nagar Hospital")!;
  assert.equal(gono.phone, "+8801716838078");
  assert.equal(gono.emergency, "yes");
  assert.equal(gono.nameBn, "গণস্বাস্থ্য নগর হাসপাতাল");
  assert.equal(gono.address, "14/E, Road 6, Dhaka");
  assert.equal(gono.osmUrl, "https://www.openstreetmap.org/node/364425541");
  const pg = places.find((p) => p.name === "পিজি হাসপাতাল")!;
  assert.equal(pg.phone, null, "no phone tag means no phone");
  assert.equal(pg.emergency, "unknown", "missing emergency tag stays unknown, never yes or no");
  assert.deepEqual(pg.facilities, [], "no facility claimed without a tag");
});

test("parse: unnamed, out-of-country, plain clinics and duplicates are dropped", () => {
  assert.equal(parseElement({ type: "node", id: 1, lat: 23.7, lon: 90.4, tags: { amenity: "hospital" } }), null);
  assert.equal(parseElement({ type: "node", id: 2, lat: 51.5, lon: -0.1, tags: { amenity: "hospital", name: "London" } }), null);
  assert.equal(parseElement({ type: "node", id: 3, lat: 23.7, lon: 90.4, tags: { amenity: "clinic", name: "Plain clinic" } }), null);
  assert.ok(parseElement({ type: "node", id: 4, lat: 23.7, lon: 90.4, tags: { amenity: "clinic", emergency: "yes", name: "ER clinic" } }));
  const way = parseElement({ type: "way", id: 5, center: { lat: 23.71, lon: 90.41 }, tags: { healthcare: "hospital", name: "Way hospital", "healthcare:speciality": "cardiology;paediatrics", "healthcare:icu": "yes", beds: "250" } })!;
  assert.equal(way.id, "way/5");
  assert.deepEqual(way.specialities, ["cardiology", "paediatrics"]);
  assert.deepEqual(way.facilities, ["icu"]);
  assert.equal(way.beds, 250);
  const dup = parseOverpass({ elements: [SAMPLE[0], { ...SAMPLE[0], id: 9, lat: 23.7392 }] });
  assert.equal(dup.length, 1);
  assert.deepEqual(parseOverpass(null), []);
  assert.deepEqual(parseOverpass({ elements: "x" }), []);
});

test("phones: only plausible numbers survive", () => {
  assert.deepEqual(cleanPhones("+880 1716-838078; 02-9661551"), ["+8801716838078", "029661551"]);
  assert.deepEqual(cleanPhones("call us"), []);
  assert.deepEqual(cleanPhones(42), []);
});

test("rank: a speciality tag that fits wins, then the emergency tag, then distance", () => {
  const extra = parseElement({ type: "node", id: 77, lat: 23.80, lon: 90.40, tags: { amenity: "hospital", name: "Heart Centre", "healthcare:speciality": "cardiology" } })!;
  const places = [...parseOverpass({ elements: SAMPLE }), extra];
  const heart = rankHospitals(places, HERE.lat, HERE.lon, "heart");
  assert.equal(heart[0].name, "Heart Centre", "tagged cardiology first even though farther");
  assert.equal(heart[0].match, "tagged");
  assert.equal(heart[1].emergency, "yes", "then hospitals tagged emergency=yes");
  const other = rankHospitals(places, HERE.lat, HERE.lon, "other");
  assert.ok(other.every((r) => r.match === "unknown"));
  assert.equal(other[0].name, "Gonoshastha Nagar Hospital", "closest emergency=yes first when no speciality applies");
  assert.equal(specialityMatch(places[0], "pregnancy"), "unknown", "untagged stays unknown, not no");
});

test("rank: emergency=no is excluded; ambulance stations listed separately", () => {
  const places = parseOverpass({ elements: [
    { type: "node", id: 1, lat: 23.74, lon: 90.39, tags: { amenity: "hospital", emergency: "no", name: "No ER" } },
    { type: "node", id: 2, lat: 23.741, lon: 90.391, tags: { emergency: "ambulance_station", name: "Amb Station" } },
    SAMPLE[1],
  ] });
  const r = rankHospitals(places, HERE.lat, HERE.lon, "injury");
  assert.deepEqual(r.map((x) => x.name), ["Gonoshastha Nagar Hospital"]);
  assert.deepEqual(ambulanceStations(places, HERE.lat, HERE.lon).map((x) => x.name), ["Amb Station"]);
});

test("query, bounds and links", () => {
  assert.ok(inBangladesh(23.81, 90.41));
  assert.ok(!inBangladesh(28.6, 77.2));
  assert.ok(!inBangladesh(Number.NaN, 90));
  const q = overpassQuery(23.81, 90.41, 5000);
  assert.ok(q.includes('nwr["amenity"="hospital"](around:5000,23.81000,90.41000)') && q.includes("ambulance_station") && q.startsWith("[out:json]"));
  assert.equal(directionsUrl(23.7434833, 90.3825849), "https://www.google.com/maps/dir/?api=1&destination=23.743483,90.382585");
  assert.equal(cacheKey(23.7385, 90.4012, 10), "23.74,90.40,10");
});

test("offline OSM snapshot parses with the live parser and finds hospitals near central Dhaka", async () => {
  const { readFileSync } = await import("node:fs");
  const { parseOverpass, distanceKm } = await import("../lib/health/hospitals.ts");
  const snap = JSON.parse(readFileSync(new URL("../public/health/osm-hospitals-bd.json", import.meta.url), "utf8"));
  assert.match(snap.osmBase, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(snap.license, /OpenStreetMap/);
  const near = snap.elements.filter((e: { lat?: number; lon?: number; center?: { lat: number; lon: number } }) => {
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
    return typeof la === "number" && typeof lo === "number" && distanceKm(23.7389, 90.3956, la, lo) <= 10;
  });
  const places = parseOverpass({ elements: near });
  assert.ok(places.filter((p) => p.kind !== "ambulance_station").length >= 3, `only ${places.length} places`);
});

test("shops mis-tagged as hospitals are never offered in an emergency", async () => {
  const { parseElement, notEmergencyCare } = await import("../lib/health/hospitals.ts");
  const at = { lat: 23.738, lon: 90.396 };
  const pharmacy = parseElement({ type: "node", id: 1, ...at, tags: { amenity: "hospital", emergency: "yes", name: "Meherun Homeo Pharmacy" } });
  assert.equal(pharmacy, null);
  assert.equal(parseElement({ type: "node", id: 2, ...at, tags: { amenity: "hospital", name: "Government Outdoor Dispensary (GOD)" } }), null);
  assert.equal(parseElement({ type: "node", id: 3, ...at, tags: { amenity: "hospital", name: "PG Outdoor" } }), null);
  assert.equal(parseElement({ type: "node", id: 4, ...at, tags: { amenity: "hospital", name: "Popular Diagnostic Centre" } }), null);
  const both = parseElement({ type: "node", id: 5, ...at, tags: { amenity: "hospital", name: "Comfort Hospital;Comfort Diagnostic Center" } });
  assert.equal(both?.name, "Comfort Hospital");
  assert.ok(parseElement({ type: "node", id: 6, ...at, tags: { amenity: "hospital", emergency: "yes", name: "Dhaka Medical College Hospital" } }));
  assert.equal(notEmergencyCare("সোনার বাংলা ফার্মেসি"), true);
  assert.equal(notEmergencyCare("Ibn Sina Hospital & Diagnostic"), false);
});

test("emergency list drops dental, physiotherapy and addiction centres but keeps hospitals with 'Rehabilitation' or 'Niramoy' in the name", async () => {
  const { notEmergencyCare } = await import("../lib/health/hospitals.ts");
  for (const n of ["Tooth Fairy", "Uk Physiotherapy and Rehabilitation Center", "সুপ্রভাত মাদকাসক্তি সেন্টার"]) assert.equal(notEmergencyCare(n), true, n);
  for (const n of ["National Institute of Traumatology & Orthopaedic Rehabilitation (NITOR)", "Mukti General Hospital মুক্তি জেনারেল হাসপাতাল লিঃ", "Niramoy Hospital নিরাময় হাসপাতাল", "Dhaka Medical College Hospital"]) assert.equal(notEmergencyCare(n), false, n);
});
