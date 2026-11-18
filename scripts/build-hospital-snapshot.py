#!/usr/bin/env python3
"""Build public/health/osm-hospitals-bd.json: an offline copy of Bangladesh's emergency-care places from OpenStreetMap.

Usage (pyosmium in its own venv; the extract is a Geofabrik daily file):
  python -I scripts/build-hospital-snapshot.py <bangladesh-latest.osm.pbf> <YYYY-MM-DD data date>

Why: the emergency finder (/mediscan/emergency) asks the live Overpass API first, but Overpass is a free shared service
that is often at capacity. When it fails, the page falls back to this file and runs the same parser and ranking on the
phone, saying the data date. Selection is exactly lib/health/hospitals.ts overpassQuery():
  amenity=hospital | healthcare=hospital | (amenity|healthcare)=clinic + emergency=yes | emergency=ambulance_station
Output has Overpass's shape ({ elements: [{ type, id, lat, lon, tags }] }) so parseOverpass() reads it unchanged.
Ways and relations become their node-average centre (Overpass "out center"). Only tags the parser can use are kept.
Data: © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
"""
import json
import sys
from pathlib import Path

import osmium

KEEP_PREFIXES = ("name", "amenity", "healthcare", "emergency", "addr:", "contact:", "opening_hours", "beds", "blood_bank", "operator")
KEEP_EXACT = {"phone"}


def wanted(tags) -> bool:
    a, h, e = tags.get("amenity"), tags.get("healthcare"), tags.get("emergency")
    if a == "hospital" or h == "hospital" or e == "ambulance_station":
        return True
    return (a == "clinic" or h == "clinic") and e == "yes"


def keep_tags(tags) -> dict:
    return {t.k: t.v[:200] for t in tags if t.k in KEEP_EXACT or t.k.startswith(KEEP_PREFIXES)}


class Collect(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.out = []

    def node(self, n):
        if n.tags and wanted(n.tags) and n.location.valid():
            self.out.append({"type": "node", "id": n.id, "lat": round(n.location.lat, 6), "lon": round(n.location.lon, 6), "tags": keep_tags(n.tags)})

    def way(self, w):
        if not (w.tags and wanted(w.tags)):
            return
        pts = [(nd.lat, nd.lon) for nd in w.nodes if nd.location.valid()]
        if pts:
            self.out.append({"type": "way", "id": w.id, "center": {"lat": round(sum(p[0] for p in pts) / len(pts), 6), "lon": round(sum(p[1] for p in pts) / len(pts), 6)}, "tags": keep_tags(w.tags)})

    def area(self, a):
        # Multipolygon relations only (ways are handled above): centre of the outer rings' nodes.
        if a.from_way() or not (a.tags and wanted(a.tags)):
            return
        pts = [(n.lat, n.lon) for ring in a.outer_rings() for n in ring if n.location.valid()]
        if pts:
            self.out.append({"type": "relation", "id": a.orig_id(), "center": {"lat": round(sum(p[0] for p in pts) / len(pts), 6), "lon": round(sum(p[1] for p in pts) / len(pts), 6)}, "tags": keep_tags(a.tags)})


def main():
    pbf, date = sys.argv[1], sys.argv[2]
    h = Collect()
    h.apply_file(pbf, locations=True)
    h.out.sort(key=lambda e: (e["type"], e["id"]))
    doc = {
        "osmBase": date,
        "source": "OpenStreetMap via Geofabrik daily extract (download.geofabrik.de/asia/bangladesh.html)",
        "license": "© OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright",
        "selection": "amenity|healthcare=hospital; amenity|healthcare=clinic with emergency=yes; emergency=ambulance_station",
        "elements": h.out,
    }
    out = Path(__file__).resolve().parent.parent / "public/health/osm-hospitals-bd.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")))
    kinds = {}
    for e in h.out:
        k = e["tags"].get("amenity") or e["tags"].get("healthcare") or e["tags"].get("emergency")
        kinds[k] = kinds.get(k, 0) + 1
    print(f"wrote {out} — {len(h.out)} places {kinds}, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
