"use client";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Ranked } from "@/lib/health/hospitals";
import { directionsUrl, telHref } from "@/lib/health/hospitals";

/*
 * Hospitals around the person on an OpenStreetMap map. Loaded only in the browser (next/dynamic, ssr: false).
 * Pins are plain HTML (no image files): red for the top three, teal for the rest, a red dot for "you are here".
 */
const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
const pin = (n: number, top: boolean) => L.divIcon({ className: "", html: `<div class="em-marker ${top ? "em-marker-top" : ""}"><span>${n}</span></div>`, iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] });
const youIcon = L.divIcon({ className: "", html: '<div class="em-marker em-marker-you"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

function Fit({ here, list }: { here: [number, number]; list: Ranked[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [here, ...list.slice(0, 6).map((h): [number, number] => [h.lat, h.lon])];
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 15 });
    else map.setView(here, 13);
  }, [map, here, list]);
  return null;
}

export default function HospitalMap({ here, list, bn }: { here: [number, number]; list: Ranked[]; bn: boolean }) {
  return (
    <MapContainer center={here} zoom={13} scrollWheelZoom={false} className="h-[340px] w-full rounded-2xl sm:h-[420px]" aria-label={bn ? "কাছের হাসপাতালের মানচিত্র" : "Map of nearby hospitals"}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
      <Marker position={here} icon={youIcon}><Popup>{bn ? "আপনি এখানে" : "You are here"}</Popup></Marker>
      {list.slice(0, 25).map((h, i) => (
        <Marker key={h.id} position={[h.lat, h.lon]} icon={pin(i + 1, i < 3)}>
          <Popup>
            <strong>{bn ? bnNum(i + 1) : i + 1}. {bn ? (h.nameBn ?? h.name) : (h.nameEn ?? h.name)}</strong><br />
            {bn ? `${bnNum(h.km.toFixed(1))} কিমি` : `${h.km.toFixed(1)} km`}<br />
            <a href={directionsUrl(h.lat, h.lon)} target="_blank" rel="noopener noreferrer">{bn ? "পথ দেখুন" : "Directions"}</a>
            {h.phone && <> · <a href={telHref(h.phone)}>{bn ? "ফোন" : "Call"}</a></>}
          </Popup>
        </Marker>
      ))}
      <Fit here={here} list={list} />
    </MapContainer>
  );
}
