"use client";
import { useState, useMemo, useEffect } from "react";
import { BANGLADESH_LAND, BANGLADESH_RIVERS, HAAT_GEO_SOURCE } from "@/lib/haatGeo";
import {
  MapPin,
  Truck,
  Store,
  Navigation,
  Layers,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  ExternalLink,
  Info,
  Calendar,
  Compass,
} from "lucide-react";
import {
  MANDI_HUBS,
  TRANSIT_CORRIDORS,
  INITIAL_LIVE_TRIPS,
  geoToSvg,
  interpolateRoutePosition,
  estimateRouteRisk,
  type MandiHub,
  type TransitCorridor,
  type LiveTruckTrip,
  type RouteWaypoint,
  KG_PER_MAUND,
} from "@/lib/haatbazar";

interface HaatLiveMapProps {
  currentTrip?: {
    quantityKg: number;
    localPricePerKg: number;
    distantPricePerKg: number;
    cropNameBn?: string;
  };
  selectedDistrictId?: string;
  onSelectHub?: (hub: MandiHub) => void;
}


// Label anchors are real coordinates (projected with geoToSvg), not hand-placed pixels.
const RIVER_LABELS: { text: string; lat: number; lon: number; rotate?: number; sea?: boolean }[] = [
  { text: "যমুনা নদী", lat: 25.12, lon: 89.86, rotate: 84 },
  { text: "পদ্মা নদী", lat: 24.08, lon: 89.0, rotate: 22 },
  { text: "মেঘনা নদী", lat: 22.95, lon: 90.98, rotate: 62 },
  { text: "তিস্তা", lat: 26.02, lon: 89.15, rotate: 48 },
  { text: "সুরমা", lat: 25.14, lon: 91.72 },
  { text: "বঙ্গোপসাগর", lat: 21.35, lon: 90.35, sea: true },
];
export function HaatLiveMap({
  currentTrip,
  selectedDistrictId = "bogura",
  onSelectHub,
}: HaatLiveMapProps) {
  const [selectedHubId, setSelectedHubId] = useState<string>("mahasthan");
  const [selectedTripId, setSelectedTripId] = useState<string>("trip-1");
  const [activeLayer, setActiveLayer] = useState<"all" | "fleet" | "hubs" | "my_trip">("all");
  const [isSimulating, setIsSimulating] = useState(true);
  const [simProgress, setSimProgress] = useState(62);
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Animate simulation progress automatically when playing
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setSimProgress((prev) => (prev >= 100 ? 5 : prev + 1));
    }, 450);
    return () => clearInterval(interval);
  }, [isSimulating]);

  // Selected Hub
  const selectedHub = useMemo(
    () => MANDI_HUBS.find((h) => h.id === selectedHubId) ?? MANDI_HUBS[0],
    [selectedHubId]
  );

  // Selected Live Trip
  const selectedTrip = useMemo(
    () => INITIAL_LIVE_TRIPS.find((t) => t.id === selectedTripId) ?? INITIAL_LIVE_TRIPS[0],
    [selectedTripId]
  );

  // Active Corridor for Selected Trip
  const activeCorridor = useMemo(
    () =>
      TRANSIT_CORRIDORS.find((c) => c.id === selectedTrip.corridorId) ??
      TRANSIT_CORRIDORS[0],
    [selectedTrip]
  );

  // Interpolated position for simulated truck
  const animatedTruckPos = useMemo(() => {
    return interpolateRoutePosition(activeCorridor.waypoints, simProgress);
  }, [activeCorridor, simProgress]);

  const animatedTruckSvg = useMemo(() => {
    return geoToSvg(animatedTruckPos.lat, animatedTruckPos.lon);
  }, [animatedTruckPos]);

  // Route Risk Evaluation
  const routeRisk = useMemo(() => {
    return estimateRouteRisk({
      temperatureC: 28,
      rainProbability: 25,
      durationHours: activeCorridor.typicalDurationHours,
      isPerishable: activeCorridor.temperatureSensitivity === "high",
    });
  }, [activeCorridor]);

  // Map dimensions (SVG coordinate system)
  const mapW = 500;
  const mapH = 650;

  // Render SVG corridor path
  const getCorridorSvgPath = (waypoints: RouteWaypoint[]) => {
    if (waypoints.length < 2) return "";
    return waypoints
      .map((wp, idx) => {
        const pt = geoToSvg(wp.lat, wp.lon, mapW, mapH);
        return `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
      })
      .join(" ");
  };

  return (
    <section
      id="live-agri-map"
      aria-labelledby="map-heading"
      className={`hb-card relative space-y-4 overflow-hidden p-4 sm:p-6 transition-all ${
        expanded ? "fixed inset-2 z-50 overflow-y-auto bg-paper shadow-2xl lg:inset-8" : ""
      }`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-700 to-emerald-900 text-white shadow-sm">
            <Compass size={22} aria-hidden />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="map-heading" className="font-display text-[19px] font-bold tracking-tight text-ink sm:text-[22px]">
                লাইভ হাট-মোকাম ও ট্রাক ট্র্যাকিং মানচিত্র
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[12px] font-bold text-emerald-900">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-600" />
                সরাসরি ট্র্যাকিং
              </span>
            </div>
            <p className="text-[13px] text-muted">
              ৬৪ জেলার প্রধান পাইকারি আড়ত, গ্রামীণ হাট ও মহাসড়কের লাইভ মালবাহী ট্রাকের অবস্থান
            </p>
          </div>
        </div>

        {/* View toggles & layer buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-line bg-stone-100/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              aria-pressed={viewMode === "map"}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors ${
                viewMode === "map" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
              } min-h-[44px] min-w-[44px]`}
            >
              মানচিত্র ভিউ
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors ${
                viewMode === "list" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
              } min-h-[44px] min-w-[44px]`}
            >
              ট্রিপ তালিকা ({INITIAL_LIVE_TRIPS.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "ম্যাপ ছোট করুন" : "ম্যাপ বড় করুন"}
            className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-slate-700 hover:bg-stone-50"
            title={expanded ? "ম্যাপ ছোট করুন" : "পূর্ণস্ক্রিন দেখুন"}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Layer selector bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="ম্যাপের স্তরসমূহ">
          <button
            type="button"
            onClick={() => setActiveLayer("all")}
            aria-pressed={activeLayer === "all"}
            className={`rounded-full px-3 py-1 font-bold transition-all ${
              activeLayer === "all"
                ? "bg-stone-900 text-white shadow-xs"
                : "border border-line bg-white text-stone-700 hover:bg-stone-50"
            } min-h-[44px] min-w-[44px]`}
          >
            সব রুট ও মোকাম ({MANDI_HUBS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("fleet")}
            aria-pressed={activeLayer === "fleet"}
            className={`rounded-full px-3 py-1 font-bold transition-all ${
              activeLayer === "fleet"
                ? "bg-emerald-800 text-white shadow-xs"
                : "border border-line bg-white text-stone-700 hover:bg-stone-50"
            } min-h-[44px] min-w-[44px]`}
          >
            চলন্ত ট্রাকবহর ({INITIAL_LIVE_TRIPS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("hubs")}
            aria-pressed={activeLayer === "hubs"}
            className={`rounded-full px-3 py-1 font-bold transition-all ${
              activeLayer === "hubs"
                ? "bg-amber-700 text-white shadow-xs"
                : "border border-line bg-white text-stone-700 hover:bg-stone-50"
            } min-h-[44px] min-w-[44px]`}
          >
            পাইকারি আড়ত ও হাট
          </button>
        </div>

        {/* Live Simulation Controls */}
        <div className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-900 hover:text-emerald-950 min-h-[44px] min-w-[44px]"
          >
            {isSimulating ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
            {isSimulating ? "পজ" : "চালান"}
          </button>
          <span className="h-3 w-px bg-stone-300" aria-hidden />
          <button
            type="button"
            onClick={() => setSimProgress(5)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-stone-600 hover:text-stone-900 min-h-[44px] min-w-[44px]"
            title="যাত্রার শুরুতে নিন"
          >
            <RotateCcw size={12} aria-hidden />
            রিসেট
          </button>
          <span className="font-mono text-[12px] font-bold text-stone-700">{simProgress}%</span>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Main Vector Map Display */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-line bg-gradient-to-b from-[#f9faf7] to-[#eef4ea]/80 p-2 sm:p-4 shadow-inner">
            {/* Quick badge overlays */}
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5 text-[12px]">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 font-bold text-stone-800 shadow-2xs backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-600" /> N5, N8, N1 কৃষি করিডোর
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 font-semibold text-stone-600 shadow-2xs backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> যমুনা ও পদ্মা সেতু টোল
              </span>
            </div>

            {/* SVG Map Canvas */}
            <div className="relative aspect-[500/650] w-full max-w-[460px]">
              <svg
                viewBox="0 0 500 650"
                className="h-full w-full select-none"
                role="img"
                aria-label="বাংলাদেশের কৃষি পরিবহন ও হাট মোকাম মানচিত্র"
              >
                <defs>
                  {/* Subtle Bangladesh geographic outline shading */}
                  <linearGradient id="bg-map-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#e9f3e4" />
                    <stop offset="50%" stopColor="#dcefd5" />
                    <stop offset="100%" stopColor="#cfebd0" />
                  </linearGradient>

                  <linearGradient id="route-highlight" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#15803d" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>

                  <linearGradient id="haat-sea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f6f8f3" />
                    <stop offset="70%" stopColor="#eaf3f6" />
                    <stop offset="100%" stopColor="#d6eaf2" />
                  </linearGradient>
                  <filter id="haat-land-shadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#2f5a3a" floodOpacity="0.18" />
                  </filter>
                  <filter id="mandi-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
                  </filter>
                </defs>

                {/* Sea: the Bay of Bengal and neighbouring land read as soft water around the real coast */}
                <rect x="0" y="0" width={mapW} height={mapH} fill="url(#haat-sea)" />

                {/* Bangladesh: real border and islands (Natural Earth 10m), projected exactly like the markers */}
                <g filter="url(#haat-land-shadow)">
                  {BANGLADESH_LAND.map((d, i) => (
                    <path key={i} d={d} fill="url(#bg-map-grad)" stroke="#8fb889" strokeWidth="1.1" strokeLinejoin="round" />
                  ))}
                </g>

                {/* Main rivers: OpenStreetMap courses, a pale bank under a deeper core */}
                {BANGLADESH_RIVERS.map((r) => (
                  <g key={r.id} aria-hidden="true">
                    {r.paths.map((d, i) => (
                      <path key={"b" + i} d={d} fill="none" stroke="#cfe8f2" strokeWidth={r.width + 2.4} strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                    {r.paths.map((d, i) => (
                      <path key={"c" + i} d={d} fill="none" stroke="#7fbcd6" strokeWidth={r.width} strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                    ))}
                  </g>
                ))}

                {/* River and sea labels at their real positions */}
                {RIVER_LABELS.map((l) => {
                  const pt = geoToSvg(l.lat, l.lon, mapW, mapH);
                  return (
                    <text key={l.text} x={pt.x} y={pt.y} fill="#2d6f82" fontSize={l.sea ? 13 : 11.5} fontStyle={l.sea ? "normal" : "italic"} fontWeight={l.sea ? "bold" : "normal"} opacity={l.sea ? 0.7 : 0.95} textAnchor="middle" transform={l.rotate ? `rotate(${l.rotate} ${pt.x} ${pt.y})` : undefined} style={{ paintOrder: "stroke" }} stroke="#f4faf7" strokeWidth="3">
                      {l.text}
                    </text>
                  );
                })}
                <text x={mapW - 8} y={mapH - 8} textAnchor="end" fontSize="8.5" fill="#5b7a72" opacity="0.85">{HAAT_GEO_SOURCE.label}</text>

                {/* National Transit Corridors (Highways) */}
                {TRANSIT_CORRIDORS.map((corridor) => {
                  const isCurrent = corridor.id === activeCorridor.id;
                  const pathStr = getCorridorSvgPath(corridor.waypoints);
                  return (
                    <g key={corridor.id}>
                      {/* Casing line */}
                      <path
                        d={pathStr}
                        fill="none"
                        stroke={isCurrent ? "#166534" : "#a8a29e"}
                        strokeWidth={isCurrent ? "4" : "2"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isCurrent ? 0.95 : 0.4}
                      />
                      {/* Center dashed line */}
                      <path
                        d={pathStr}
                        fill="none"
                        stroke={isCurrent ? "#facc15" : "#ffffff"}
                        strokeWidth={isCurrent ? "1.8" : "1"}
                        strokeDasharray={isCurrent ? "4 3" : "3 3"}
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                    </g>
                  );
                })}

                {/* Toll Bridge Icons on Highways */}
                {/* Jamuna Bridge */}
                {(() => {
                  const pt = geoToSvg(24.40, 89.78, mapW, mapH);
                  return (
                    <g transform={`translate(${pt.x - 7}, ${pt.y - 7})`}>
                      <title>বঙ্গবন্ধু যমুনা সেতু টোলপ্লাজা</title>
                      <rect width="14" height="14" rx="3" fill="#ea580c" />
                      <text x="7" y="10" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold" aria-hidden="true">ট</text>
                    </g>
                  );
                })()}

                {/* Padma Bridge */}
                {(() => {
                  const pt = geoToSvg(23.44, 90.26, mapW, mapH);
                  return (
                    <g transform={`translate(${pt.x - 7}, ${pt.y - 7})`}>
                      <title>পদ্মা সেতু টোলপ্লাজা</title>
                      <rect width="14" height="14" rx="3" fill="#ea580c" />
                      <text x="7" y="10" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold" aria-hidden="true">ট</text>
                    </g>
                  );
                })()}

                {/* Mandi & Haat Nodes */}
                {(activeLayer === "all" || activeLayer === "hubs") &&
                  MANDI_HUBS.map((hub) => {
                    const pt = geoToSvg(hub.lat, hub.lon, mapW, mapH);
                    const isSelected = hub.id === selectedHubId;
                    const isMokam = hub.type === "mokam";

                    return (
                      <g
                        key={hub.id}
                        transform={`translate(${pt.x}, ${pt.y})`}
                        onClick={() => {
                          setSelectedHubId(hub.id);
                          onSelectHub?.(hub);
                        }}
                        className="cursor-pointer transition-transform hover:scale-125"
                        role="button"
                        tabIndex={0}
                        aria-label={`${hub.districtBn} · ${hub.nameBn} (${isMokam ? "পাইকারি মোকাম" : "স্থানীয় হাট"})`}
                      >
                        {/* Ripple ring for selected */}
                        {isSelected && (
                          <circle
                            r="12"
                            fill="none"
                            stroke={isMokam ? "#d97706" : "#15803d"}
                            strokeWidth="1.5"
                            className="animate-ping"
                            opacity="0.6"
                          />
                        )}

                        {/* Node circle */}
                        <circle
                          r={isSelected ? "7" : isMokam ? "5.5" : "4.5"}
                          fill={isMokam ? "#b45309" : "#166534"}
                          stroke="#ffffff"
                          strokeWidth="2"
                          filter="url(#mandi-shadow)"
                        />

                        {/* Label: one district name per district (two Dhaka hubs would print "ঢাকা" on top of each other) */}
                        {(isSelected || MANDI_HUBS.findIndex((h) => h.districtBn === hub.districtBn) === MANDI_HUBS.indexOf(hub)) && <text
                          y={isSelected ? "-11" : "-8"}
                          textAnchor="middle"
                          fontSize={isSelected ? "13" : "12"}
                          fontWeight={isSelected ? "bold" : "600"}
                          fill="#1c1917"
                          className="pointer-events-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
                        >
                          {hub.districtBn}
                        </text>}
                      </g>
                    );
                  })}

                {/* Animated Simulated Truck Marker */}
                {(activeLayer === "all" || activeLayer === "fleet") && (
                  <g
                    transform={`translate(${animatedTruckSvg.x}, ${animatedTruckSvg.y})`}
                    className="cursor-pointer transition-all duration-300"
                    filter="url(#mandi-shadow)"
                  >
                    {/* Pulsing radius */}
                    <circle r="14" fill="#15803d" opacity="0.2" className="animate-pulse" />
                    {/* Truck icon background pin */}
                    <circle r="10" fill="#15803d" stroke="#ffffff" strokeWidth="2" />
                    {/* Mini truck representation */}
                    <g transform="translate(-6, -6) scale(0.42)">
                      <path
                        d="M2 4h10l3 4v6H2z M12 8h3v2h-3z"
                        fill="#ffffff"
                      />
                      <circle cx="5" cy="14" r="2" fill="#ffffff" />
                      <circle cx="12" cy="14" r="2" fill="#ffffff" />
                    </g>
                    {/* Live tooltip banner on truck */}
                    <g transform="translate(14, -10)">
                      <rect
                        width="88"
                        height="20"
                        rx="5"
                        fill="#1c1917"
                        opacity="0.9"
                      />
                      <text
                        x="6"
                        y="13"
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {selectedTrip.cropBn.split(" ")[0]} · {simProgress}%
                      </text>
                    </g>
                  </g>
                )}
              </svg>
            </div>

            {/* Scrubber / Simulator Slider */}
            <div className="mt-2 w-full max-w-[420px] rounded-xl border border-line bg-white/90 p-2.5 shadow-2xs backdrop-blur-xs">
              <div className="flex items-center justify-between text-[12px] font-bold text-stone-700">
                <span className="flex items-center gap-1">
                  <Truck size={13} className="text-emerald-700" aria-hidden />
                  {activeCorridor.nameBn}
                </span>
                <span className="font-mono text-emerald-800">
                  {animatedTruckPos.currentWaypointBn}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simProgress}
                onChange={(e) => {
                  setIsSimulating(false);
                  setSimProgress(Number(e.target.value));
                }}
                className="mt-1 h-2 w-full cursor-pointer accent-green-800 min-h-[44px]"
                aria-label="ট্রাক চলাচলের অগ্রগতি স্লাইডার"
              />
              <div className="flex justify-between text-[12px] text-stone-500">
                <span>যাত্রা শুরু ({activeCorridor.waypoints[0].nameBn.split(" ")[0]})</span>
                <span>গন্তব্য ({activeCorridor.waypoints[activeCorridor.waypoints.length - 1].nameBn.split(" ")[0]})</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Active Trip Telemetry & Selected Mandi Inspector */}
          <div className="space-y-4">
            {/* Active Live Trip Telemetry Card */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-green-50/30 p-4 shadow-2xs">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-emerald-950">
                  <Truck size={17} className="text-emerald-700" aria-hidden />
                  {selectedTrip.truckNo}
                </span>
                <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 font-mono text-[12px] font-bold text-emerald-900">
                  গতি: {selectedTrip.speedKmh} কিমি/ঘণ্টা
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
                <div>
                  <span className="text-[12px] text-stone-500">বোঝাই মাল:</span>
                  <strong className="block font-semibold text-stone-900">{selectedTrip.cropBn}</strong>
                </div>
                <div>
                  <span className="text-[12px] text-stone-500">বর্তমান অবস্থান:</span>
                  <strong className="block font-semibold text-emerald-900">{animatedTruckPos.currentWaypointBn}</strong>
                </div>
                <div>
                  <span className="text-[12px] text-stone-500">উৎপত্তিস্থল:</span>
                  <span className="block text-stone-800">{selectedTrip.originBn}</span>
                </div>
                <div>
                  <span className="text-[12px] text-stone-500">গন্তব্য মোকাম:</span>
                  <span className="block text-stone-800">{selectedTrip.destinationBn}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[12px] font-bold">
                  <span className="text-stone-700">যাত্রাপথের অগ্রগতি</span>
                  <span className="font-mono text-emerald-800">{simProgress}% সম্পূর্ণ</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${simProgress}%` }}
                  />
                </div>
              </div>

              {/* Route Transit Risk Alert */}
              <div className={`mt-3 flex items-start gap-2 rounded-xl p-2.5 text-[12px] ${
                routeRisk.riskLevel === "high"
                  ? "border border-red-200 bg-red-50 text-red-950"
                  : routeRisk.riskLevel === "medium"
                  ? "border border-amber-200 bg-amber-50 text-amber-950"
                  : "border border-green-200 bg-green-50 text-green-950"
              }`}>
                <ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
                <div>
                  <strong>পরিবহন ঝুঁকি সূচক: {routeRisk.spoilageRiskScore}/১০০</strong>
                  <p className="mt-0.5 leading-snug">{routeRisk.adviceBn}</p>
                </div>
              </div>
            </div>

            {/* Selected Mandi Details Inspector */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-muted">
                    <Store size={13} aria-hidden /> {selectedHub.type === "mokam" ? "পাইকারি মোকাম" : "গ্রামীণ হাট"}
                  </span>
                  <h3 className="font-display text-[17px] font-bold text-ink">{selectedHub.nameBn}</h3>
                  <span className="text-[12px] text-muted">
                    {selectedHub.districtBn} জেলা · {selectedHub.divisionBn} বিভাগ
                  </span>
                </div>
                <span className={`rounded-xl px-2.5 py-1 text-[12px] font-bold ${
                  selectedHub.type === "mokam" ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900"
                }`}>
                  {selectedHub.type === "mokam" ? "পাইকারি আড়ত" : "কৃষক হাট"}
                </span>
              </div>

              <p className="mt-2 text-[12.5px] leading-relaxed text-stone-700">
                {selectedHub.descriptionBn}
              </p>

              <div className="mt-3">
                <span className="text-[12px] font-bold text-stone-600">প্রধান কেনাবেচা হওয়া ফসল:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedHub.primaryCropsBn.map((crop) => (
                    <span
                      key={crop}
                      className="rounded-lg bg-stone-100 px-2 py-0.5 text-[12px] font-medium text-stone-800"
                    >
                      {crop}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectHub?.(selectedHub);
                  }}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 text-[12.5px] font-bold text-white hover:bg-stone-800 min-h-[44px] min-w-[44px]"
                >
                  <Navigation size={14} aria-hidden />
                  এই হাটের দূরত্ব দিয়ে হিসাব করুন
                </button>
              </div>
            </div>

            {/* Quick Fleet Selection Bar */}
            <div className="space-y-2">
              <span className="text-[12px] font-bold text-stone-700">অন্যান্য চলমান ট্রাক নির্বাচন করুন:</span>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {INITIAL_LIVE_TRIPS.map((trip) => {
                  const on = trip.id === selectedTripId;
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => {
                        setSelectedTripId(trip.id);
                        setSimProgress(trip.progressPct);
                      }}
                      className={`flex flex-col rounded-xl border p-2 text-left text-[12px] transition-all ${
                        on
                          ? "border-emerald-600 bg-emerald-50/70 font-semibold text-emerald-950 shadow-2xs"
                          : "border-line bg-white hover:bg-stone-50"
                      } min-h-[44px] min-w-[44px]`}
                    >
                      <span className="font-bold">{trip.truckNo}</span>
                      <span className="text-stone-600 truncate">{trip.cropBn}</span>
                      <span className="font-mono text-[12px] text-emerald-800">{trip.progressPct}% সম্পন্ন</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full Fleet List View */
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-stone-100 text-[12px] font-bold text-stone-600">
                <tr>
                  <th className="px-3.5 py-2.5">ট্রাক নম্বর</th>
                  <th className="px-3 py-2.5">ফসল ও পরিমাণ</th>
                  <th className="px-3 py-2.5">রুট (কোথা থেকে কোথায়)</th>
                  <th className="px-3 py-2.5">বর্তমান অবস্থান</th>
                  <th className="px-3 py-2.5">অগ্রগতি</th>
                  <th className="px-3 py-2.5 text-right">গতি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {INITIAL_LIVE_TRIPS.map((trip) => (
                  <tr key={trip.id} className="hover:bg-stone-50/70">
                    <td className="px-3.5 py-3 font-bold text-stone-900">{trip.truckNo}</td>
                    <td className="px-3 py-3 font-medium text-emerald-900">{trip.cropBn}</td>
                    <td className="px-3 py-3 text-stone-700">
                      {trip.originBn} ➔ {trip.destinationBn}
                    </td>
                    <td className="px-3 py-3 text-stone-800">{trip.currentWaypointBn}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${trip.progressPct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[12px] font-bold">{trip.progressPct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold">{trip.speedKmh} কিমি/ঘণ্টা</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-stone-500">
            * ট্র্যাকিং ডেটা সাধারণ মডেল ও জাতীয় মহাসড়ক (N5, N8, N1, N2) করিডোরের গতির ওপর ভিত্তি করে ডেমো সিমুলেশন।
          </p>
        </div>
      )}
    </section>
  );
}
