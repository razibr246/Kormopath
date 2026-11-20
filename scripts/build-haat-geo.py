#!/usr/bin/env python3
"""Build lib/haatGeo.ts: Bangladesh's real border and main rivers as SVG paths for the HaatBazar map.

Usage (border: Natural Earth 10m admin-0 GeoJSON, public domain, github.com/nvkelso/natural-earth-vector;
rivers: a Geofabrik Bangladesh extract, OpenStreetMap ODbL, read with pyosmium in its own venv):
  <venv>/bin/python -I scripts/build-haat-geo.py <ne_10m_admin_0_countries.geojson> <bangladesh-latest.osm.pbf>

The projection is exactly lib/haatbazar.ts geoToSvg() (500x650 box, 25px padding, lat 20.5-26.6, lon 88.0-92.7),
so the border, rivers, city markers and truck route all line up. Lines are simplified with Douglas-Peucker to
0.6 px, far below what the eye can see at the map's size. Rivers are clipped to Bangladesh's bounding box and named
the way they are known there: the Ganges is the Padma, the Brahmaputra below the Tista confluence is the Jamuna,
and below the Padma-Meghna confluence near Chandpur the river is the (Lower) Meghna.
"""
import json
import math
import sys
from pathlib import Path

W, H, PAD = 500, 650, 25
MIN_LAT, MAX_LAT, MIN_LON, MAX_LON = 20.5, 26.6, 88.0, 92.7
EPS = 0.6  # px


def proj(lon, lat):
    lat = max(MIN_LAT, min(MAX_LAT, lat))
    lon = max(MIN_LON, min(MAX_LON, lon))
    x = PAD + (lon - MIN_LON) / (MAX_LON - MIN_LON) * (W - 2 * PAD)
    y = PAD + (MAX_LAT - lat) / (MAX_LAT - MIN_LAT) * (H - 2 * PAD)
    return (x, y)


def dp(pts, eps):
    """Douglas-Peucker simplification (iterative)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1e-9
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, idx = d, i
        if best > eps and idx > 0:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def dp_ring(pts, eps):
    """Closed ring: split at the point farthest from the start, simplify both halves, rejoin."""
    if pts and pts[0] == pts[-1]:
        pts = pts[:-1]
    if len(pts) < 4:
        return pts
    x0, y0 = pts[0]
    k = max(range(len(pts)), key=lambda i: (pts[i][0] - x0) ** 2 + (pts[i][1] - y0) ** 2)
    a = dp(pts[: k + 1], eps)
    b = dp(pts[k:] + [pts[0]], eps)
    return a[:-1] + b[:-1]


def path(pts, close):
    s = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    return s + (" Z" if close else "")


def area(pts):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))) / 2


def inside_bbox(lon, lat):
    return MIN_LON - 0.05 <= lon <= MAX_LON + 0.05 and MIN_LAT <= lat <= MAX_LAT + 0.05


def main():
    countries = json.load(open(sys.argv[1]))

    # Border: Bangladesh polygons (mainland + islands large enough to see).
    bgd = next(f for f in countries["features"] if f["properties"].get("ADM0_A3") == "BGD")
    g = bgd["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    land = []
    for poly in polys:
        ring = dp_ring([proj(lon, lat) for lon, lat in poly[0]], EPS)
        if len(ring) >= 4 and area(ring) >= 6:  # drop specks under ~6 px² (sand bars)
            land.append(path(ring, True))

    # Rivers: OpenStreetMap ways, matched by English name, chained end to end, simplified.
    import osmium
    WANT = {"Padma": "padma", "Jamuna River": "jamuna", "Meghna River": "meghna", "Brahmaputra River": "brahmaputra",
            "Teesta River": "teesta", "Teesta": "teesta", "Surma River": "surma", "Kushiyara River": "kushiyara",
            "Karnaphuli River": "karnaphuli"}
    ways = {k: [] for k in set(WANT.values())}

    class H(osmium.SimpleHandler):
        def way(self, w):
            if w.tags.get("waterway") != "river":
                return
            rid = WANT.get(w.tags.get("name:en") or w.tags.get("name") or "")
            if rid:
                pts = [(round(nd.lon, 6), round(nd.lat, 6)) for nd in w.nodes if nd.location.valid()]
                if len(pts) >= 2:
                    ways[rid].append(pts)

    H().apply_file(sys.argv[2], locations=True)

    def chain(segs):
        segs = [list(s) for s in segs]
        out = []
        while segs:
            cur = segs.pop()
            grew = True
            while grew:
                grew = False
                for i, s in enumerate(segs):
                    if s[0] == cur[-1]: cur += s[1:]
                    elif s[-1] == cur[0]: cur = s[:-1] + cur
                    elif s[-1] == cur[-1]: cur += s[::-1][1:]
                    elif s[0] == cur[0]: cur = s[::-1][:-1] + cur
                    else: continue
                    segs.pop(i); grew = True; break
            out.append(cur)
        return out

    def river_paths(rid):
        res = []
        for line in chain(ways[rid]):
            # OSM also names a small river in Dinajpur/Joypurhat "Jamuna"; keep only the main channel (east of 89.4°E).
            if rid == "jamuna" and sum(lon for lon, _ in line) / len(line) < 89.4:
                continue
            pts = [proj(lon, lat) for lon, lat in line if inside_bbox(lon, lat)]
            if len(pts) >= 2:
                simp = dp(pts, EPS)
                if sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(simp, simp[1:])) >= 6:  # drop stubs under 6 px
                    res.append(path(simp, False))
        return res

    RIVERS = [("padma", "পদ্মা", 4.6), ("jamuna", "যমুনা", 4.6), ("meghna", "মেঘনা", 5.4),
              ("brahmaputra", "পুরাতন ব্রহ্মপুত্র", 2.6), ("teesta", "তিস্তা", 2.6), ("surma", "সুরমা", 2.4),
              ("kushiyara", "কুশিয়ারা", 2.2), ("karnaphuli", "কর্ণফুলী", 2.4)]
    data = {"land": land, "rivers": [{"id": r, "nameBn": bn, "paths": river_paths(r), "width": wd} for r, bn, wd in RIVERS]}

    out = Path(__file__).resolve().parent.parent / "lib/haatGeo.ts"
    ts = (
        "/*\n"
        " * Bangladesh's border and main rivers as SVG paths for the HaatBazar map (generated, do not edit by hand).\n"
        " * Rebuild: <pyosmium venv>/bin/python -I scripts/build-haat-geo.py <ne_10m_admin_0_countries.geojson> <bangladesh-latest.osm.pbf>\n"
        " * Border: Natural Earth 10m (public domain). Rivers: © OpenStreetMap contributors, ODbL 1.0 (Geofabrik extract).\n"
        " * Same projection as geoToSvg() in lib/haatbazar.ts.\n"
        " * No imports, so it is unit-testable.\n"
        " */\n"
        "export const HAAT_GEO_SOURCE = { label: \"সীমানা: Natural Earth · নদী: © OpenStreetMap contributors\", url: \"https://www.openstreetmap.org/copyright\" } as const;\n\n"
        "export interface HaatRiver { id: string; nameBn: string; paths: string[]; width: number }\n\n"
        f"export const BANGLADESH_LAND: readonly string[] = {json.dumps(land, ensure_ascii=False)};\n\n"
        f"export const BANGLADESH_RIVERS: readonly HaatRiver[] = {json.dumps(data['rivers'], ensure_ascii=False)};\n"
    )
    out.write_text(ts, encoding="utf-8")
    n_pts = sum(p.count("L") + 1 for p in land)
    print(f"wrote {out}: {len(land)} land polygons ({n_pts} points), rivers " +
          ", ".join(f"{r['id']}={len(r['paths'])}" for r in data["rivers"]) + f", {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
