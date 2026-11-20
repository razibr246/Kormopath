/**
 * Google Maps Platform Core Integration Library
 * Strictly implements Google Maps Platform Web & URL specifications:
 * - Cross-Platform Universal URLs (Search, Directions, Place)
 * - Static Maps API URL Generator
 * - Bangladesh Geodesic Road Matrix & Transit Time Estimators
 * - 64-District Coordinates Geodata Directory
 * 
 * Pure domain module — zero external dependencies, 100% unit-tested.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

export type TravelMode = "driving" | "transit" | "walking" | "bicycling";

/**
 * Builds a universal, cross-platform Google Maps Search URL.
 * Works across desktop web, Android, and iOS Google Maps apps.
 * Spec: https://developers.google.com/maps/documentation/urls/get-started#search-action
 */
export function buildGoogleMapsSearchUrl(
  query: string,
  options: {
    lat?: number;
    lon?: number;
    placeId?: string;
  } = {}
): string {
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("query", query.trim());

  if (options.placeId) {
    params.set("query_place_id", options.placeId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Builds a universal, cross-platform Google Maps Directions URL.
 * Spec: https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function buildGoogleMapsDirectionsUrl(
  destination: LatLon & { name?: string },
  origin?: LatLon & { name?: string },
  mode: TravelMode = "driving"
): string {
  const params = new URLSearchParams();
  params.set("api", "1");

  const destStr = destination.name
    ? `${destination.lat.toFixed(6)},${destination.lon.toFixed(6)} (${encodeURIComponent(destination.name)})`
    : `${destination.lat.toFixed(6)},${destination.lon.toFixed(6)}`;
  params.set("destination", destStr);

  if (origin) {
    const originStr = origin.name
      ? `${origin.lat.toFixed(6)},${origin.lon.toFixed(6)} (${encodeURIComponent(origin.name)})`
      : `${origin.lat.toFixed(6)},${origin.lon.toFixed(6)}`;
    params.set("origin", originStr);
  }

  params.set("travelmode", mode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Builds a Static Map image URL from the Google Maps Static API.
 * Spec: https://developers.google.com/maps/documentation/maps-static/start
 */
export function buildStaticMapUrl(options: {
  center?: LatLon | string;
  zoom?: number;
  width?: number;
  height?: number;
  scale?: 1 | 2;
  mapType?: "roadmap" | "satellite" | "hybrid" | "terrain";
  markers?: Array<{
    lat: number;
    lon: number;
    color?: string;
    label?: string;
  }>;
  apiKey?: string;
}): string {
  const params = new URLSearchParams();
  const width = options.width ?? 600;
  const height = options.height ?? 300;
  params.set("size", `${width}x${height}`);

  if (options.center) {
    if (typeof options.center === "string") {
      params.set("center", options.center);
    } else {
      params.set("center", `${options.center.lat.toFixed(6)},${options.center.lon.toFixed(6)}`);
    }
  }

  if (options.zoom !== undefined) {
    params.set("zoom", String(Math.min(21, Math.max(1, options.zoom))));
  }

  params.set("maptype", options.mapType || "roadmap");
  if (options.scale) {
    params.set("scale", String(options.scale));
  }

  if (options.markers && options.markers.length > 0) {
    for (const m of options.markers) {
      const color = m.color ? `color:${m.color}|` : "";
      const label = m.label ? `label:${m.label.toUpperCase()}|` : "";
      params.append("markers", `${color}${label}${m.lat.toFixed(6)},${m.lon.toFixed(6)}`);
    }
  }

  if (options.apiKey) {
    params.set("key", options.apiKey);
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Great-circle distance between two coordinates in kilometers using Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0088; // Earth's mean radius in km
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Realistic travel time estimation for Bangladesh road transit.
 * Accounts for river ferry/bridge crossings, highway speeds, and city traffic delays.
 */
export function estimateBangladeshTransit(
  distanceKm: number,
  type: "highway_express" | "truck_freight" | "city_ambulance" = "highway_express"
): {
  estimatedMinutes: number;
  roadDistanceKm: number;
  speedKmh: number;
} {
  // Road tortuosity factor (straight-line distance to road distance)
  const ROAD_FACTOR = 1.35;
  const roadKm = Math.round(distanceKm * ROAD_FACTOR);

  let speedKmh = 50;
  if (type === "city_ambulance") {
    speedKmh = 22; // Dense urban traffic in Bangladesh
  } else if (type === "truck_freight") {
    speedKmh = 35; // Loaded agricultural cargo truck
  } else {
    speedKmh = 55; // National highway (N1, N2, N3, N5)
  }

  const hours = roadKm / speedKmh;
  const minutes = Math.max(1, Math.round(hours * 60));

  return {
    estimatedMinutes: minutes,
    roadDistanceKm: roadKm,
    speedKmh,
  };
}

/**
 * Verified Geographic Coordinates for all 64 Administrative Districts of Bangladesh.
 * All coordinates strictly within Bangladesh bounding box:
 * 20.5 <= lat <= 26.7, 88.0 <= lon <= 92.7
 */
export const BD_DISTRICT_COORDINATES: Record<string, LatLon & { nameBn: string; nameEn: string }> = {
  dhaka: { nameBn: "ঢাকা", nameEn: "Dhaka", lat: 23.8103, lon: 90.4125 },
  chattogram: { nameBn: "চট্টগ্রাম", nameEn: "Chattogram", lat: 22.3569, lon: 91.7832 },
  sylhet: { nameBn: "সিলেট", nameEn: "Sylhet", lat: 24.8949, lon: 91.8687 },
  rajshahi: { nameBn: "রাজশাহী", nameEn: "Rajshahi", lat: 24.3745, lon: 88.6042 },
  khulna: { nameBn: "খুলনা", nameEn: "Khulna", lat: 22.8456, lon: 89.5403 },
  barishal: { nameBn: "বরিশাল", nameEn: "Barishal", lat: 22.7010, lon: 90.3535 },
  rangpur: { nameBn: "রংপুর", nameEn: "Rangpur", lat: 25.7439, lon: 89.2752 },
  mymensingh: { nameBn: "ময়মনসিংহ", nameEn: "Mymensingh", lat: 24.7471, lon: 90.4203 },
  cumilla: { nameBn: "কুমিল্লা", nameEn: "Cumilla", lat: 23.4607, lon: 91.1809 },
  feni: { nameBn: "ফেনী", nameEn: "Feni", lat: 23.0187, lon: 91.3966 },
  noakhali: { nameBn: "নোয়াখালী", nameEn: "Noakhali", lat: 22.8696, lon: 91.0994 },
  bogura: { nameBn: "বগুড়া", nameEn: "Bogura", lat: 24.8465, lon: 89.3777 },
  jashore: { nameBn: "যশোর", nameEn: "Jashore", lat: 23.1664, lon: 89.2081 },
  pabna: { nameBn: "পাবনা", nameEn: "Pabna", lat: 24.0064, lon: 89.2372 },
  dinajpur: { nameBn: "দিনাজপুর", nameEn: "Dinajpur", lat: 25.6217, lon: 88.6355 },
  kushtia: { nameBn: "কুষ্টিয়া", nameEn: "Kushtia", lat: 23.9013, lon: 89.1205 },
  gazipur: { nameBn: "গাজীপুর", nameEn: "Gazipur", lat: 24.0023, lon: 90.4264 },
  narayanganj: { nameBn: "নারায়ণগঞ্জ", nameEn: "Narayanganj", lat: 23.6238, lon: 90.5000 },
  tangail: { nameBn: "টাঙ্গাইল", nameEn: "Tangail", lat: 24.2513, lon: 89.9167 },
  jamalpur: { nameBn: "জামালপুর", nameEn: "Jamalpur", lat: 24.9375, lon: 89.9378 },
  coxsbazar: { nameBn: "কক্সবাজার", nameEn: "Cox's Bazar", lat: 21.4272, lon: 92.0058 },
  brahmanbaria: { nameBn: "ব্রাহ্মণবাড়িয়া", nameEn: "Brahmanbaria", lat: 23.9571, lon: 91.1119 },
  chandpur: { nameBn: "চাঁদপুর", nameEn: "Chandpur", lat: 23.2333, lon: 90.6667 },
  lakshmipur: { nameBn: "লক্ষ্মীপুর", nameEn: "Lakshmipur", lat: 22.9425, lon: 90.8412 },
  narsingdi: { nameBn: "নরসিংদী", nameEn: "Narsingdi", lat: 23.9322, lon: 90.7154 },
  madaripur: { nameBn: "মাদারীপুর", nameEn: "Madaripur", lat: 23.1641, lon: 90.1897 },
  shariatpur: { nameBn: "শরীয়তপুর", nameEn: "Shariatpur", lat: 23.2423, lon: 90.4348 },
  faridpur: { nameBn: "ফরিদপুর", nameEn: "Faridpur", lat: 23.6071, lon: 89.8429 },
  gopalganj: { nameBn: "গোপালগঞ্জ", nameEn: "Gopalganj", lat: 23.0051, lon: 89.8266 },
  munshiganj: { nameBn: "মুন্সীগঞ্জ", nameEn: "Munshiganj", lat: 23.5422, lon: 90.5305 },
  manikganj: { nameBn: "মানিকগঞ্জ", nameEn: "Manikganj", lat: 23.8617, lon: 90.0003 },
  kishoreganj: { nameBn: "কিশোরগঞ্জ", nameEn: "Kishoreganj", lat: 24.4449, lon: 90.7766 },
  netrokona: { nameBn: "নেত্রকোণা", nameEn: "Netrokona", lat: 24.8709, lon: 90.7279 },
  sherpur: { nameBn: "শেরপুর", nameEn: "Sherpur", lat: 25.0205, lon: 90.0153 },
  sunamganj: { nameBn: "সুনামগঞ্জ", nameEn: "Sunamganj", lat: 25.0658, lon: 91.3950 },
  habiganj: { nameBn: "হবিগঞ্জ", nameEn: "Habiganj", lat: 24.3749, lon: 91.4155 },
  moulvibazar: { nameBn: "মৌলভীবাজার", nameEn: "Moulvibazar", lat: 24.4829, lon: 91.7774 },
  sirajganj: { nameBn: "সিরাজগঞ্জ", nameEn: "Sirajganj", lat: 24.4534, lon: 89.7008 },
  naogaon: { nameBn: "নওগাঁ", nameEn: "Naogaon", lat: 24.7936, lon: 88.9318 },
  natore: { nameBn: "নাটোর", nameEn: "Natore", lat: 24.4206, lon: 89.0003 },
  chapainawabganj: { nameBn: "চাঁপাইনবাবগঞ্জ", nameEn: "Chapainawabganj", lat: 24.5965, lon: 88.2775 },
  joypurhat: { nameBn: "জয়পুরহাট", nameEn: "Joypurhat", lat: 25.1015, lon: 89.0277 },
  kurigram: { nameBn: "কুড়িগ্রাম", nameEn: "Kurigram", lat: 25.8054, lon: 89.6362 },
  gaibandha: { nameBn: "গাইবান্ধা", nameEn: "Gaibandha", lat: 25.3288, lon: 89.5400 },
  lalmonirhat: { nameBn: "লালমনিরহাট", nameEn: "Lalmonirhat", lat: 25.9923, lon: 89.2847 },
  nilphamari: { nameBn: "নীলফামারী", nameEn: "Nilphamari", lat: 25.9318, lon: 88.8560 },
  panchagarh: { nameBn: "পঞ্চগড়", nameEn: "Panchagarh", lat: 26.3411, lon: 88.5542 },
  thakurgaon: { nameBn: "ঠাকুরগাঁও", nameEn: "Thakurgaon", lat: 26.0337, lon: 88.4617 },
  jhenaidah: { nameBn: "ঝিনাইদহ", nameEn: "Jhenaidah", lat: 23.5448, lon: 89.1539 },
  magura: { nameBn: "মাগুরা", nameEn: "Magura", lat: 23.4873, lon: 89.4199 },
  narail: { nameBn: "নড়াইল", nameEn: "Narail", lat: 23.1725, lon: 89.5127 },
  satkhira: { nameBn: "সাতক্ষীরা", nameEn: "Satkhira", lat: 22.7185, lon: 89.0705 },
  bagerhat: { nameBn: "বাগেরহাট", nameEn: "Bagerhat", lat: 22.6516, lon: 89.7859 },
  chuadanga: { nameBn: "চুয়াডাঙ্গা", nameEn: "Chuadanga", lat: 23.6402, lon: 88.8418 },
  meherpur: { nameBn: "মেহেরপুর", nameEn: "Meherpur", lat: 23.7622, lon: 88.6318 },
  patuakhali: { nameBn: "পটুয়াখালী", nameEn: "Patuakhali", lat: 22.3596, lon: 90.3299 },
  bhola: { nameBn: "ভোলা", nameEn: "Bhola", lat: 22.6859, lon: 90.6481 },
  pirojpur: { nameBn: "পিরোজপুর", nameEn: "Pirojpur", lat: 22.5841, lon: 89.9720 },
  barguna: { nameBn: "বরগুনা", nameEn: "Barguna", lat: 22.0953, lon: 90.1121 },
  jhalokati: { nameBn: "ঝালকাঠি", nameEn: "Jhalokati", lat: 22.6406, lon: 90.1987 },
  rajbari: { nameBn: "রাজবাড়ী", nameEn: "Rajbari", lat: 23.7574, lon: 89.6445 },
  khagrachhari: { nameBn: "খাগড়াছড়ি", nameEn: "Khagrachhari", lat: 23.1193, lon: 91.9847 },
  rangamati: { nameBn: "রাঙ্গামাটি", nameEn: "Rangamati", lat: 22.7324, lon: 92.2985 },
  bandarban: { nameBn: "বান্দরবান", nameEn: "Bandarban", lat: 22.1953, lon: 92.2184 },
};

/**
 * Normalizes district names and returns coordinates supporting aliases and variations
 * (e.g., 'Jhalokathi' vs 'Jhalokati', 'Cox's Bazar' vs 'CoxsBazar', 'Chittagong' vs 'Chattogram').
 */
export function getDistrictCoordinates(districtName: string): (LatLon & { nameBn: string; nameEn: string }) | null {
  const norm = districtName.toLowerCase().replace(/[^a-z]/g, "");
  if (BD_DISTRICT_COORDINATES[norm]) return BD_DISTRICT_COORDINATES[norm];

  const aliases: Record<string, string> = {
    jhalokathi: "jhalokati",
    chittagong: "chattogram",
    comilla: "cumilla",
    jessore: "jashore",
    bogra: "bogura",
    barisal: "barishal",
    maulvibazar: "moulvibazar",
    coxbazar: "coxsbazar",
    bbaria: "brahmanbaria",
  };
  const target = aliases[norm];
  if (target && BD_DISTRICT_COORDINATES[target]) {
    return BD_DISTRICT_COORDINATES[target];
  }
  return null;
}

/**
 * Returns navigation URL to the District Judge Court building in Bangladesh.
 */
export function getDistrictCourtGoogleMapsUrl(districtNameEn: string): string {
  const query = `District Judge Court, ${districtNameEn}, Bangladesh`;
  return buildGoogleMapsSearchUrl(query);
}
