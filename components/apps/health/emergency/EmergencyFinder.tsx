"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Ambulance, Building2, Clock, Copy, ExternalLink, LocateFixed, MapPin, Navigation, Phone, Share2, ShieldAlert } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { usePersistentState, storageKey } from "@/lib/clientStore";
import { DISTRICTS } from "@/lib/haatbazar";
import {
  EMERGENCY_TYPES, FACILITIES, NINE_NINE_NINE, OSM_COPYRIGHT, OVERPASS_POLICY, ESTIMATE_SPEED_KMH, ROAD_FACTOR,
  ambulanceStations, directionsUrl, distanceKm, mapsPointUrl, parseOverpass, rankHospitals, telHref,
  type EmergencyType, type Place, type Ranked,
} from "@/lib/health/hospitals";
import "./emergency.css";

/*
 * Nearest emergency hospital finder. No account, no payment, no waiting: 999 is always the first button.
 * Hospitals come from OpenStreetMap (api/health/hospitals); a facility is shown only as "in the map data" or
 * "call to confirm", never as "available". The person's position stays in this page; only a rounded area is
 * sent to our server to search, and only the chosen district (not the position) can be remembered.
 */
const HospitalMap = dynamic(() => import("./HospitalMap"), {
  ssr: false,
  loading: () => <div className="grid h-[340px] place-items-center rounded-2xl border border-slate-200 bg-white text-[14px] text-slate-600 sm:h-[420px]">মানচিত্র আসছে… · Loading map…</div>,
});

const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
type Status = "idle" | "locating" | "searching" | "done" | "error";
interface Result { places: Place[]; osmBase: string | null; fetchedAt: string; radiusKm: number; offline?: boolean }

// Offline copy of the same OpenStreetMap selection (scripts/build-hospital-snapshot.py), used when the live Overpass
// service is busy or unreachable, so the finder never comes back empty-handed. Filtered to the radius on the phone.
const SNAPSHOT_URL = "/health/osm-hospitals-bd.json";
async function fromSnapshot(lat: number, lon: number, radiusKm: number): Promise<Result> {
  const r = await fetch(SNAPSHOT_URL);
  if (!r.ok) throw new Error("snapshot unavailable");
  const j = (await r.json()) as { osmBase?: string; elements?: Array<{ lat?: number; lon?: number; center?: { lat: number; lon: number } }> };
  const els = Array.isArray(j.elements) ? j.elements : [];
  const near = (km: number) => els.filter((e) => { const la = e.lat ?? e.center?.lat; const lo = e.lon ?? e.center?.lon; return typeof la === "number" && typeof lo === "number" && distanceKm(lat, lon, la, lo) <= km; });
  let used = radiusKm, picked = near(radiusKm);
  if (picked.filter((e) => (e as { tags?: Record<string, string> }).tags?.emergency !== "ambulance_station").length < 3 && radiusKm < 25) { used = 25; picked = near(25); }
  return { places: parseOverpass({ elements: picked }), osmBase: j.osmBase ?? null, fetchedAt: new Date().toISOString(), radiusKm: used, offline: true };
}

export function EmergencyFinder() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const num = (v: number | string) => (bn ? bnNum(v) : String(v));

  const [type, setType] = useState<EmergencyType>("other");
  const [area, setArea] = usePersistentState<string>(storageKey("mediscan", "emergencyArea"), "", (r) => (typeof r === "string" && (r === "" || DISTRICTS.some((d) => d.id === r)) ? r : null));
  const [place, setPlace] = useState("");
  const [here, setHere] = useState<[number, number] | null>(null);
  const [hereLabel, setHereLabel] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The saved OpenStreetMap copy answers at once; the live query runs alongside and replaces it when (if) it arrives,
  // so a busy map server never makes someone in an emergency wait. Only a newer search can overwrite a result.
  const searchId = useRef(0);
  const search = async (lat: number, lon: number, label: string, radiusKm: number) => {
    const id = ++searchId.current;
    setHere([lat, lon]); setHereLabel(label); setStatus("searching"); setMsg(""); setOpen(null); setResult(null);
    let shown = false;
    const snapshot = fromSnapshot(lat, lon, radiusKm).then((snap) => {
      if (id === searchId.current && !shown && snap.places.length) { shown = true; setResult(snap); setStatus("done"); }
    }).catch(() => { /* no saved copy: the live result or the error below decides */ });
    const live = (async () => {
      let r = await fetch(`/api/health/hospitals?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&r=${radiusKm}`);
      let j = await r.json();
      // Few results in a small radius: widen once before giving up.
      if (r.ok && Array.isArray(j.places) && j.places.filter((p: Place) => p.kind !== "ambulance_station").length < 3 && radiusKm < 25) {
        r = await fetch(`/api/health/hospitals?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&r=25`);
        j = await r.json();
      }
      if (!r.ok || !Array.isArray(j.places)) throw new Error(bn ? j.error ?? "" : j.errorEn ?? "");
      if (id !== searchId.current) return;
      shown = true;
      setResult({ places: j.places, osmBase: j.osmBase ?? null, fetchedAt: j.fetchedAt, radiusKm: j.radiusKm });
      setStatus("done");
    })();
    try { await live; } catch (e) {
      await snapshot;
      if (id !== searchId.current || shown) return; // the saved copy is already on screen
      setStatus("error");
      setMsg((e as Error).message || T("ম্যাপের তথ্য এখন আনা যাচ্ছে না। জরুরি হলে এখনই ৯৯৯-এ ফোন করুন।", "Map data is unavailable right now. In an emergency, call 999 now."));
    }
  };

  const findNearest = () => {
    if (!("geolocation" in navigator)) { setStatus("error"); setMsg(T("এই ফোনে অবস্থান জানা যায় না। নিচে জেলা বেছে নিন।", "This device can't share its location. Choose your district below.")); return; }
    setStatus("locating"); setMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (latitude < 20.5 || latitude > 26.7 || longitude < 88 || longitude > 92.7) { setStatus("error"); setMsg(T("আপনার অবস্থান বাংলাদেশের বাইরে দেখাচ্ছে। নিচে জেলা বেছে নিন।", "Your location appears to be outside Bangladesh. Choose a district below.")); return; }
        search(latitude, longitude, T("আপনার বর্তমান অবস্থান", "Your current location"), 10);
      },
      (err) => {
        setStatus("error");
        setMsg(err.code === err.PERMISSION_DENIED
          ? T("অবস্থান জানার অনুমতি দেওয়া হয়নি। নিচে জেলা বেছে নিন — অথবা এখনই ৯৯৯-এ ফোন করুন।", "Location permission was not given. Choose your district below, or call 999 now.")
          : T("অবস্থান পাওয়া যায়নি। নিচে জেলা বেছে নিন।", "Couldn't get your location. Choose your district below."));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const searchArea = () => {
    const d = DISTRICTS.find((x) => x.id === area);
    if (!d) return;
    search(d.lat, d.lon, `${d.nameBn}${place.trim() ? ` · ${place.trim().slice(0, 60)}` : ""}`, 15);
  };

  const ranked: Ranked[] = useMemo(() => (result && here ? rankHospitals(result.places, here[0], here[1], type) : []), [result, here, type]);
  const ambulances: Ranked[] = useMemo(() => (result && here ? ambulanceStations(result.places, here[0], here[1]).slice(0, 5) : []), [result, here]);
  const busy = status === "locating" || status === "searching";

  const share = async () => {
    if (!here) return;
    const url = mapsPointUrl(here[0], here[1]);
    const text = T("আমি এখানে আছি, জরুরি সাহায্য দরকার:", "I am here and need emergency help:");
    try {
      if (navigator.share) { await navigator.share({ text: `${text} ${url}` }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 2500);
    } catch { /* the person closed the share sheet */ }
  };

  useEffect(() => { setOpen(null); }, [type]);

  return (
    <div className="space-y-6" data-testid="emergency-finder">
      {/* 999 first: never behind a search, a map or a step. */}
      <section aria-labelledby="em-h" className="rounded-2xl border-2 border-red-300 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-[62ch] flex-1">
            <p className="text-[13px] font-semibold leading-[1.4] text-red-800">{T("জরুরি অবস্থা · কোনো নিবন্ধন বা টাকা লাগবে না", "Emergency · no sign-up, no payment")}</p>
            <h1 id="em-h" className="mt-1 text-[clamp(28px,5vw,44px)] font-semibold leading-[1.1] text-slate-900">{T("কাছের জরুরি ", "Nearest emergency ")}<em className="kp-em">{T("হাসপাতাল", "hospital")}</em></h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{T("জীবন ঝুঁকিতে থাকলে আগে ৯৯৯-এ ফোন করুন। তারপর কাছের যে হাসপাতাল আপনার সমস্যার চিকিৎসা দিতে পারে, তা খুঁজুন।", "If a life is at risk, call 999 first. Then find the nearest hospital that can treat this kind of emergency.")}</p>
          </div>
          <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-9 !rounded-full !text-[13px] font-semibold" aria-label={bn ? "EN, Switch to English" : "বাং, বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <a href="tel:999" className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-red-700 px-6 text-[19px] font-bold leading-[1.4] text-white hover:bg-red-800" data-testid="call-999">
            <Phone size={22} aria-hidden /> {T("৯৯৯-এ কল করুন", "Call 999")}
          </a>
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            {T("৯৯৯ পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্সের সাথে যুক্ত করে। অ্যাম্বুলেন্স সেবা বিনামূল্যে নয়। স্বাস্থ্য পরামর্শ: ", "999 connects you to police, fire service and ambulance help. Ambulance service is not free. Health advice: ")}
            <a href="tel:16263" className="font-semibold text-sky-800 underline">{T("১৬২৬৩", "16263")}</a>
          </p>
        </div>
      </section>

      {/* Find */}
      <section aria-labelledby="find-h" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="em-radar" data-state={busy ? "busy" : status === "done" ? "done" : "idle"} aria-hidden>
            <div className="em-radar-disc">
              <div className="em-radar-beam" />
              <div className="em-radar-ring" />
              <div className="em-radar-ring" />
              <div className="em-radar-ring" />
              <div className="em-radar-dot" />
            </div>
            <MapPin className="em-radar-pin" size={22} />
          </div>
          <div className="w-full min-w-0 flex-1 space-y-4">
            <h2 id="find-h" className="text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{T("কী ধরনের জরুরি অবস্থা?", "What kind of emergency?")}</h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={T("জরুরি অবস্থার ধরন", "Emergency type")} data-testid="emergency-type">
              {EMERGENCY_TYPES.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={type === t.id} data-type={t.id} onClick={() => setType(t.id)}
                  className={`min-h-[44px] rounded-full border px-3.5 text-[14px] font-semibold leading-[1.4] transition-colors ${type === t.id ? "border-sky-800 bg-sky-800 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-sky-500"}`}>
                  {bn ? t.bn : t.en}
                </button>
              ))}
            </div>
            <button type="button" onClick={findNearest} disabled={busy} data-testid="find-nearest"
              className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-sky-800 px-5 text-[17px] font-bold leading-[1.4] text-white hover:bg-sky-900 disabled:opacity-70 sm:w-auto">
              <LocateFixed size={20} aria-hidden /> {status === "locating" ? T("অবস্থান খোঁজা হচ্ছে…", "Finding your location…") : status === "searching" ? T("হাসপাতাল খোঁজা হচ্ছে…", "Searching hospitals…") : T("নিকটতম জরুরি হাসপাতাল খুঁজুন", "Find nearest emergency hospital")}
            </button>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-[13.5px] font-semibold text-slate-700">{T("অথবা জেলা বেছে নিন", "Or choose your district")}
                <select value={area} onChange={(e) => setArea(e.target.value)} data-testid="area-select" className="mt-1 block min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]">
                  <option value="">{T("— জেলা —", "— District —")}</option>
                  {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.nameBn}</option>)}
                </select>
              </label>
              <label className="text-[13.5px] font-semibold text-slate-700">{T("এলাকা (ঐচ্ছিক, নিজের মনে রাখার জন্য)", "Area (optional, for your own reference)")}
                <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={60} placeholder={T("যেমন: মিরপুর ১০", "e.g. Mirpur 10")} className="mt-1 block min-h-[48px] w-full rounded-xl border border-slate-300 px-3 text-[15px]" />
              </label>
              <button type="button" onClick={searchArea} disabled={!area || busy} className="kp-btn-ghost min-h-[48px] justify-center">{T("এই জেলায় খুঁজুন", "Search this district")}</button>
            </div>
            <p className="text-[12.5px] leading-relaxed text-slate-600">{T("জেলা বাছলে জেলা শহরের কাছ থেকে খোঁজা হয়, তাই দূরত্ব আনুমানিক। আপনার সঠিক অবস্থান কোথাও সংরক্ষণ হয় না।", "A district search starts from the district town, so distances are approximate. Your exact position is never stored.")}</p>
          </div>
        </div>
        {msg && <p role="alert" className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-900">{msg} <a href="tel:999" className="underline">{T("৯৯৯", "999")}</a></p>}
      </section>

      {status === "done" && here && result && (
        <>
          <section aria-labelledby="res-h" className="space-y-4" data-testid="hospital-results">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="res-h" className="text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">
                  {ranked.length ? T(`সবচেয়ে উপযুক্ত ${num(Math.min(3, ranked.length))}টি আগে`, `Most relevant ${Math.min(3, ranked.length)} first`) : T("কাছে কোনো হাসপাতাল পাওয়া যায়নি", "No hospital found nearby")}
                </h2>
                <p className="text-[13.5px] text-slate-600">{hereLabel} · {T(`${num(result.radiusKm)} কিমির মধ্যে`, `within ${result.radiusKm} km`)} · {T(`${num(ranked.length)}টি হাসপাতাল`, `${ranked.length} hospitals`)}</p>
              </div>
              <button type="button" onClick={share} className="kp-btn-ghost min-h-[44px]"><Share2 size={16} aria-hidden /> {copied ? T("লিংক কপি হয়েছে", "Link copied") : T("আমার অবস্থান পাঠান", "Share my location")}</button>
            </div>
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13.5px] leading-relaxed text-amber-950">
              <ShieldAlert size={15} className="mr-1 inline" aria-hidden />
              {T("তালিকা OpenStreetMap-এর তথ্য থেকে। তথ্য অসম্পূর্ণ বা পুরোনো হতে পারে — রওনা দেওয়ার আগে হাসপাতালে ফোন করে নিশ্চিত হোন। শয্যা, আইসিইউ বা ডাক্তার খালি আছে কি না আমরা জানি না।", "This list comes from OpenStreetMap. It can be incomplete or out of date — call the hospital to confirm before you go. We do not know whether beds, ICU or doctors are free.")}
            </p>
            {!ranked.length && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-[15px] text-slate-700">
                {T("ম্যাপের তথ্যে এখানে কোনো হাসপাতাল নেই। ৯৯৯ বা ১৬২৬৩-এ ফোন করে কাছের হাসপাতালের খোঁজ নিন।", "The map data has no hospital here. Call 999 or 16263 to find the nearest hospital.")}
              </div>
            )}
            <ol className="grid gap-3 lg:grid-cols-3">
              {ranked.slice(0, 12).map((h, i, shown) => {
                const nameOf = (x: typeof h) => bn ? (x.nameBn ?? x.name) : (x.nameEn ?? x.name);
                const name = nameOf(h);
                // Two places with the same name (branches) are told apart by their map address, else by distance.
                const twin = shown.some((o) => o.id !== h.id && nameOf(o) === name);
                const where = twin ? (h.address?.split(",")[0]?.trim() || T(`${num(h.km.toFixed(1))} কিমি দূরে`, `${h.km.toFixed(1)} km away`)) : "";
                const top = i < 3;
                return (
                  <li key={h.id} data-testid="hospital-card" className={`em-rise rounded-2xl border bg-white p-4 ${top ? "border-sky-400" : "border-slate-200"} ${i >= 3 ? "lg:col-span-1" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <div className="flex items-start gap-3">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[14px] font-bold text-white ${top ? "bg-red-700" : "bg-sky-800"}`}>{num(i + 1)}</span>
                      <div className="min-w-0">
                        <h3 className="text-[17px] font-bold leading-snug text-slate-900">{name}{where && <span className="font-semibold text-slate-600"> · {where}</span>}</h3>
                        <p className="mt-0.5 text-[13.5px] text-slate-600">
                          <span className="font-mono">{T(`${num(h.km.toFixed(1))} কিমি`, `${h.km.toFixed(1)} km`)}</span> · <Clock size={13} className="inline" aria-hidden /> {T(`গাড়িতে আনুমানিক ${num(h.minutes)} মিনিট`, `approx. ${h.minutes} min by road`)}
                        </p>
                        {h.address && <p className="mt-0.5 text-[13px] text-slate-600">{h.address}</p>}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[12.5px] font-semibold leading-[1.4]">
                      {h.emergency === "yes"
                        ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">{T("জরুরি বিভাগ (ম্যাপের তথ্যে)", "Emergency dept. (in map data)")}</span>
                        : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{T("জরুরি বিভাগ: ফোন করে নিশ্চিত হোন", "Emergency dept.: call to confirm")}</span>}
                      {h.match === "tagged" && <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">{T("এই সমস্যার বিভাগ (ম্যাপের তথ্যে)", "Fits this emergency (in map data)")}</span>}
                      {h.open24x7 && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">{T("২৪/৭ (ম্যাপের তথ্যে)", "24/7 (in map data)")}</span>}
                      {h.kind === "clinic" && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900">{T("ক্লিনিক", "Clinic")}</span>}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {h.phone
                        ? <a href={telHref(h.phone)} data-testid="call-hospital" className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-sky-800 px-3 text-[14.5px] font-bold text-white"><Phone size={16} aria-hidden /> {T("হাসপাতালে কল", "Call hospital")}</a>
                        : <span data-testid="call-hospital" className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-slate-200 px-2 text-center text-[12.5px] leading-[1.4] text-slate-600">{T("ফোন নম্বর ম্যাপে নেই — ৯৯৯/১৬২৬৩", "No phone in map data — 999/16263")}</span>}
                      <a href={directionsUrl(h.lat, h.lon, here ? here[0] : undefined, here ? here[1] : undefined, h.name)} target="_blank" rel="noopener noreferrer" data-testid="directions" className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3 text-[14.5px] font-bold text-sky-900"><Navigation size={16} aria-hidden /> {T("পথ দেখুন", "Directions")}</a>
                    </div>
                    <button type="button" onClick={() => setOpen(open === h.id ? null : h.id)} aria-expanded={open === h.id} className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-sky-800">
                      <Building2 size={15} aria-hidden /> {open === h.id ? T("সুবিধা লুকান", "Hide facilities") : T("সুবিধা দেখুন", "View facilities")}
                    </button>
                    {open === h.id && (
                      <div className="mt-1 space-y-2">
                        <ul className="grid grid-cols-2 gap-1 text-[13px]">
                          {FACILITIES.map((f) => {
                            const has = h.facilities.includes(f.id);
                            return <li key={f.id} className={has ? "font-semibold text-emerald-800" : "text-slate-600"}>{bn ? f.bn : f.en}: {has ? T("ম্যাপের তথ্যে আছে", "in map data") : T("ফোন করে নিশ্চিত হোন", "call to confirm")}</li>;
                          })}
                        </ul>
                        {h.specialities.length > 0 && <p className="text-[12.5px] text-slate-600">{T("ম্যাপে লেখা বিভাগ: ", "Departments in map data: ")}{h.specialities.join(", ")}</p>}
                        {h.beds && <p className="text-[12.5px] text-slate-600">{T(`ম্যাপে লেখা শয্যা: ${num(h.beds)} (খালি আছে কি না নয়)`, `Beds in map data: ${h.beds} (not how many are free)`)}</p>}
                        <a href={h.osmUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-sky-800 underline">{T("ম্যাপের মূল তথ্য", "Source map entry")} <ExternalLink size={12} aria-hidden /></a>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-label={T("মানচিত্র", "Map")}>
            <HospitalMap here={here} list={ranked} bn={bn} />
          </section>
        </>
      )}

      {/* Ambulance: 999 first; ambulance stations only as the map data has them. Never "dispatched". */}
      <section aria-labelledby="amb-h" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" data-testid="ambulance-block">
        <h2 id="amb-h" className="flex items-center gap-2 text-[20px] font-extrabold text-slate-900"><Ambulance size={22} className="text-red-700" aria-hidden /> {T("অ্যাম্বুলেন্স", "Ambulance")}</h2>
        <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-slate-700">{T("অ্যাম্বুলেন্স লাগলে ৯৯৯-এ ফোন করুন — তারা অ্যাম্বুলেন্স সেবার সাথে যুক্ত করবে। ফোনে ঠিকানা আর রোগীর অবস্থা পরিষ্কার করে বলুন। অ্যাম্বুলেন্স সেবা বিনামূল্যে নয়। অ্যাম্বুলেন্স রওনা দিয়েছে কি না, তা শুধু সেবাদাতাই নিশ্চিত করতে পারে।", "For an ambulance, call 999 — they connect you to ambulance help. Say the address and the patient's condition clearly. Ambulance service is not free. Only the provider can confirm that an ambulance is on its way.")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="tel:999" className="inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-red-700 px-5 text-[16px] font-bold text-white"><Phone size={18} aria-hidden /> {T("৯৯৯ — অ্যাম্বুলেন্স", "999 — ambulance")}</a>
          {here && <button type="button" onClick={share} className="kp-btn-ghost min-h-[50px]"><Copy size={16} aria-hidden /> {copied ? T("লিংক কপি হয়েছে", "Link copied") : T("অবস্থানের লিংক পাঠান", "Share location link")}</button>}
        </div>
        {status === "done" && (
          ambulances.length
            ? <ul className="mt-4 space-y-2">{ambulances.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                  <span className="text-[15px] font-semibold text-slate-900">{bn ? (a.nameBn ?? a.name) : (a.nameEn ?? a.name)} <span className="font-mono text-[13px] font-normal text-slate-600">· {T(`${num(a.km.toFixed(1))} কিমি`, `${a.km.toFixed(1)} km`)}</span></span>
                  {a.phone ? <a href={telHref(a.phone)} className="kp-btn-ghost min-h-[44px]"><Phone size={15} aria-hidden /> {T("কল", "Call")}</a> : <span className="text-[13px] text-slate-600">{T("ফোন নম্বর ম্যাপে নেই", "No phone in map data")}</span>}
                </li>))}</ul>
            : <p className="mt-3 text-[13.5px] text-slate-600">{T("ম্যাপের তথ্যে কাছে কোনো অ্যাম্বুলেন্স স্টেশন নেই। ৯৯৯ ব্যবহার করুন।", "The map data has no ambulance station nearby. Use 999.")}</p>
        )}
        <div className="mt-3"><SourceTag confidence="reported" label={NINE_NINE_NINE.label} url={NINE_NINE_NINE.url} checked={NINE_NINE_NINE.checked} /></div>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-[13px] leading-relaxed text-slate-600">
        {result?.offline && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[14px] font-semibold text-amber-950" data-testid="offline-snapshot">
            {T(`লাইভ ম্যাপ সার্ভার এখন ব্যস্ত, তাই সংরক্ষিত কপি দেখানো হচ্ছে (তারিখ: ${result.osmBase ?? "অজানা"})। ফোন করে নিশ্চিত হোন।`, `The live map server is busy, so a saved copy is shown (dated ${result.osmBase ?? "unknown"}). Call to confirm.`)}
          </p>
        )}
        <p>{T(`হাসপাতালের তথ্য: OpenStreetMap স্বেচ্ছাসেবকদের তথ্য। ${result?.osmBase ? `ম্যাপের তথ্যের সময়: ${result.osmBase.slice(0, 10)}।` : ""} দূরত্ব সোজা পথের; গাড়ির সময় আনুমানিক (সোজা দূরত্ব × ${ROAD_FACTOR}, গড় ${ESTIMATE_SPEED_KMH} কিমি/ঘণ্টা ধরে)। এটি চিকিৎসা পরামর্শ নয়।`, `Hospital data: OpenStreetMap volunteers. ${result?.osmBase ? `Map data as of ${result.osmBase.slice(0, 10)}.` : ""} Distances are straight-line; road time is approximate (straight distance × ${ROAD_FACTOR} at an assumed ${ESTIMATE_SPEED_KMH} km/h). This is not medical advice.`)}</p>
        <div className="flex flex-wrap gap-2">
          <SourceTag confidence="reported" label={OSM_COPYRIGHT.label} url={OSM_COPYRIGHT.url} checked={OVERPASS_POLICY.checked} />
          <SourceTag confidence="official" label={OVERPASS_POLICY.label} url={OVERPASS_POLICY.url} checked={OVERPASS_POLICY.checked} />
        </div>
      </section>
    </div>
  );
}
