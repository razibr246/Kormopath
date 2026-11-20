import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGoogleMapsSearchUrl,
  buildGoogleMapsDirectionsUrl,
  buildStaticMapUrl,
  calculateHaversineDistanceKm,
  estimateBangladeshTransit,
  BD_DISTRICT_COORDINATES,
  getDistrictCourtGoogleMapsUrl,
  getDistrictCoordinates,
} from "../lib/googleMaps.ts";

test("buildGoogleMapsSearchUrl creates standard universal search URL", () => {
  const url = buildGoogleMapsSearchUrl("Dhaka Medical College Hospital");
  assert.ok(url.startsWith("https://www.google.com/maps/search/?"));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("api"), "1");
  assert.equal(parsed.searchParams.get("query"), "Dhaka Medical College Hospital");
});

test("buildGoogleMapsSearchUrl supports query_place_id", () => {
  const url = buildGoogleMapsSearchUrl("Supreme Court of Bangladesh", {
    placeId: "ChIJb_V9fN_HVTcR5Y8ZzQ",
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("query_place_id"), "ChIJb_V9fN_HVTcR5Y8ZzQ");
});

test("buildGoogleMapsDirectionsUrl generates valid cross-platform directions URL", () => {
  const dest = { lat: 23.7259, lon: 90.3976, name: "Dhaka Judge Court" };
  const origin = { lat: 23.8103, lon: 90.4125, name: "Gulshan" };

  const url = buildGoogleMapsDirectionsUrl(dest, origin, "driving");
  assert.ok(url.startsWith("https://www.google.com/maps/dir/?"));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("api"), "1");
  assert.ok(parsed.searchParams.get("destination")?.includes("23.725900,90.397600"));
  assert.ok(parsed.searchParams.get("origin")?.includes("23.810300,90.412500"));
  assert.equal(parsed.searchParams.get("travelmode"), "driving");
});

test("buildStaticMapUrl produces compliant Static Maps API parameters", () => {
  const url = buildStaticMapUrl({
    center: { lat: 23.8103, lon: 90.4125 },
    zoom: 13,
    width: 600,
    height: 400,
    mapType: "roadmap",
    markers: [{ lat: 23.8103, lon: 90.4125, color: "red", label: "A" }],
    apiKey: "AIzaSyTestKey123",
  });

  assert.ok(url.startsWith("https://maps.googleapis.com/maps/api/staticmap?"));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("size"), "600x400");
  assert.equal(parsed.searchParams.get("center"), "23.810300,90.412500");
  assert.equal(parsed.searchParams.get("zoom"), "13");
  assert.equal(parsed.searchParams.get("maptype"), "roadmap");
  assert.equal(parsed.searchParams.get("key"), "AIzaSyTestKey123");
  assert.ok(parsed.searchParams.get("markers")?.includes("color:red|label:A|23.810300,90.412500"));
});

test("calculateHaversineDistanceKm calculates great-circle distance accurately", () => {
  // Distance from Dhaka (23.8103, 90.4125) to Chattogram (22.3569, 91.7832)
  const dist = calculateHaversineDistanceKm(23.8103, 90.4125, 22.3569, 91.7832);
  assert.ok(dist >= 210 && dist <= 230, `Expected ~216 km, got ${dist}`);

  // Same coordinates = 0
  const zeroDist = calculateHaversineDistanceKm(23.8103, 90.4125, 23.8103, 90.4125);
  assert.equal(zeroDist, 0);
});

test("estimateBangladeshTransit calculates realistic road distance and travel times", () => {
  const straightLineKm = 100;

  const express = estimateBangladeshTransit(straightLineKm, "highway_express");
  assert.equal(express.roadDistanceKm, 135); // 100 * 1.35
  assert.equal(express.speedKmh, 55);
  assert.ok(express.estimatedMinutes >= 140 && express.estimatedMinutes <= 160);

  const truck = estimateBangladeshTransit(straightLineKm, "truck_freight");
  assert.equal(truck.speedKmh, 35);
  assert.ok(truck.estimatedMinutes > express.estimatedMinutes);

  const ambulance = estimateBangladeshTransit(straightLineKm, "city_ambulance");
  assert.equal(ambulance.speedKmh, 22);
  assert.ok(ambulance.estimatedMinutes > truck.estimatedMinutes);
});

test("BD_DISTRICT_COORDINATES contains all 64 districts within Bangladesh bounds", () => {
  const keys = Object.keys(BD_DISTRICT_COORDINATES);
  assert.equal(keys.length, 64, `Expected 64 districts, found ${keys.length}`);

  for (const [key, d] of Object.entries(BD_DISTRICT_COORDINATES)) {
    assert.ok(d.nameBn.length > 0, `District ${key} must have Bengali name`);
    assert.ok(d.nameEn.length > 0, `District ${key} must have English name`);

    // Strictly within Bangladesh coordinates bounding box
    assert.ok(
      d.lat >= 20.5 && d.lat <= 26.7,
      `District ${key} lat ${d.lat} outside Bangladesh (20.5 - 26.7)`
    );
    assert.ok(
      d.lon >= 88.0 && d.lon <= 92.7,
      `District ${key} lon ${d.lon} outside Bangladesh (88.0 - 92.7)`
    );
  }
});

test("getDistrictCourtGoogleMapsUrl formats correct query", () => {
  const url = getDistrictCourtGoogleMapsUrl("Bogura");
  assert.ok(url.includes("District+Judge+Court%2C+Bogura%2C+Bangladesh") || url.includes("District%20Judge%20Court"));
  assert.ok(url.startsWith("https://www.google.com/maps/search/?"));
});

test("getDistrictCoordinates resolves aliases and variations cleanly", () => {
  const direct = getDistrictCoordinates("Dhaka");
  assert.ok(direct);
  assert.equal(direct.nameEn, "Dhaka");

  const jhalokathi = getDistrictCoordinates("Jhalokathi");
  assert.ok(jhalokathi);
  assert.equal(jhalokathi.nameEn, "Jhalokati");

  const coxsBazar = getDistrictCoordinates("Cox's Bazar");
  assert.ok(coxsBazar);
  assert.equal(coxsBazar.nameEn, "Cox's Bazar");

  const chittagong = getDistrictCoordinates("Chittagong");
  assert.ok(chittagong);
  assert.equal(chittagong.nameEn, "Chattogram");

  const unknown = getDistrictCoordinates("UnknownLand");
  assert.equal(unknown, null);
});
