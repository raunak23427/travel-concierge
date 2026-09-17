/**
 * Geography for the Goa itinerary: exact locations, real road distances and
 * realistic travel times.
 *
 * Everything here is based on open map data:
 *   - a local gazetteer for the places the itinerary actually uses, so the
 *     common path needs no network at all and is exact;
 *   - Nominatim (OpenStreetMap) to geocode anything the gazetteer misses;
 *   - TomTom Routing API for real road distance and duration.
 *
 * Both services are best-effort. Geocoding can fall back to a local gazetteer;
 * routing falls back to a great-circle estimate when the API is unavailable.
 */

export type LatLng = { lat: number; lng: number };

export type TransportMode =
  "Scooter" | "Rental Car" | "Taxi" | "Walking" | "Public Transport" | "Ferry";

export type TomTomTravelMode =
  | "car"
  | "motorcycle"
  | "pedestrian"
  | "bicycle"
  | "taxi"
  | "bus";

export const TRANSPORT_META: Record<
  TransportMode,
  {
    icon: string;
    /** Legacy profile used by the transport-cost display. */
    profile: "driving" | "cycling" | "foot";
    /** Rupees per km, indicative Goa rates. */
    perKm: number;
    /** Flat cost added per journey (booking fee, minimum fare). */
    base: number;
    /** Multiplier on the routed duration — buses stop, scooters filter. */
    timeFactor: number;
    note: string;
  }
> = {
  Scooter: {
    icon: "🛵",
    profile: "driving",
    perKm: 3,
    base: 0,
    timeFactor: 1.0,
    note: "~₹400/day rental plus fuel",
  },
  "Rental Car": {
    icon: "🚗",
    profile: "driving",
    perKm: 9,
    base: 0,
    timeFactor: 1.15,
    note: "~₹1800/day, parking can be tight",
  },
  Taxi: {
    icon: "🚕",
    profile: "driving",
    perKm: 22,
    base: 60,
    timeFactor: 1.1,
    note: "App cabs and pre-paid stands",
  },
  Walking: {
    icon: "🚶",
    profile: "foot",
    perKm: 0,
    base: 0,
    timeFactor: 1.0,
    note: "Only sensible under ~2 km",
  },
  "Public Transport": {
    icon: "🚌",
    profile: "driving",
    perKm: 2,
    base: 10,
    timeFactor: 2.1,
    note: "Cheap, frequent on the main roads",
  },
  Ferry: {
    icon: "⛴",
    profile: "driving",
    perKm: 0,
    base: 0,
    timeFactor: 1.4,
    note: "Free river crossings, runs to a timetable",
  },
};

/**
 * Coordinates for the places this itinerary actually references. Hand-checked
 * against OpenStreetMap so the common case is exact and needs no request.
 */
const GAZETTEER: Record<string, LatLng> = {
  "goa airport": { lat: 15.3808, lng: 73.8314 },
  "dabolim airport": { lat: 15.3808, lng: 73.8314 },
  "manohar international airport": { lat: 15.744, lng: 73.858 },
  "mopa airport": { lat: 15.744, lng: 73.858 },
  panjim: { lat: 15.4989, lng: 73.8278 },
  panaji: { lat: 15.4989, lng: 73.8278 },
  fontainhas: { lat: 15.4959, lng: 73.8302 },
  "old goa": { lat: 15.5009, lng: 73.9116 },
  "basilica of bom jesus": { lat: 15.5009, lng: 73.9116 },
  "se cathedral": { lat: 15.5035, lng: 73.9118 },
  "mandovi river": { lat: 15.4988, lng: 73.8267 },
  "dinner cruise on mandovi": { lat: 15.4988, lng: 73.8267 },
  "dudhsagar waterfalls": { lat: 15.3144, lng: 74.3143 },
  "dudhsagar falls": { lat: 15.3144, lng: 74.3143 },
  "fort aguada": { lat: 15.4925, lng: 73.7736 },
  "chapora fort": { lat: 15.603, lng: 73.736 },
  "mangeshi temple": { lat: 15.4402, lng: 73.9772 },
  "spice plantation": { lat: 15.4027, lng: 74.0078 },
  ponda: { lat: 15.4027, lng: 74.0078 },
  candolim: { lat: 15.5177, lng: 73.7627 },
  "candolim beach": { lat: 15.5186, lng: 73.7626 },
  calangute: { lat: 15.5439, lng: 73.7553 },
  baga: { lat: 15.5553, lng: 73.7517 },
  anjuna: { lat: 15.5735, lng: 73.74 },
  "anjuna beach": { lat: 15.5735, lng: 73.74 },
  "anjuna flea market": { lat: 15.5757, lng: 73.7436 },
  vagator: { lat: 15.596, lng: 73.737 },
  arpora: { lat: 15.568, lng: 73.765 },
  assagao: { lat: 15.586, lng: 73.777 },
  siolim: { lat: 15.619, lng: 73.769 },
  morjim: { lat: 15.63, lng: 73.734 },
  arambol: { lat: 15.6868, lng: 73.7043 },
  mandrem: { lat: 15.6606, lng: 73.7075 },
  palolem: { lat: 15.01, lng: 74.0233 },
  agonda: { lat: 15.043, lng: 74.01 },
  colva: { lat: 15.2793, lng: 73.922 },
  benaulim: { lat: 15.2622, lng: 73.9238 },
  margao: { lat: 15.2832, lng: 73.9862 },
  vasco: { lat: 15.3981, lng: 73.8113 },
  "grande island": { lat: 15.3667, lng: 73.7667 },
  "divar island": { lat: 15.5175, lng: 73.895 },
  "chorao island": { lat: 15.5236, lng: 73.8747 },
};

/** Centre of the itinerary map when nothing better is known. */
export const GOA_CENTRE: LatLng = { lat: 15.4, lng: 73.9 };

const CACHE_KEY = "travelbuddy:geocode-cache";
const memory = new Map<string, LatLng | null>();

function readCache(): Record<string, LatLng> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeCache(key: string, value: LatLng) {
  try {
    const c = readCache();
    c[key] = value;
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* private mode — memory cache still applies */
  }
}

/** Strip the itinerary's prose so "Lunch at Venite" looks up as "venite". */
function normalise(label: string): string {
  return label
    .toLowerCase()
    .replace(/^(lunch|dinner|breakfast|drinks|brunch|stay)\s+(at|in|on)\s+/, "")
    .replace(
      /^(visit|explore|arrive at|transfer to|check in(to)?|check out of)\s+/,
      "",
    )
    .replace(/[’'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function gazetteerHit(label: string): LatLng | null {
  const n = normalise(label);
  if (GAZETTEER[n]) return GAZETTEER[n];
  // Longest containing key wins, so "anjuna flea market" beats "anjuna".
  let best: { key: string; at: LatLng } | null = null;
  for (const [key, at] of Object.entries(GAZETTEER)) {
    if (n.includes(key) && (!best || key.length > best.key.length))
      best = { key, at };
  }
  return best ? best.at : null;
}

/** Return the closest known Goa place when an activity name cannot be geocoded. */
export function nearestKnownLocation(reference: LatLng = GOA_CENTRE): LatLng {
  const unique = Array.from(
    new Map(
      Object.values(GAZETTEER).map((point) => [
        `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`,
        point,
      ]),
    ).values(),
  );
  return unique.reduce((closest, point) =>
    haversineKm(reference, point) < haversineKm(reference, closest)
      ? point
      : closest,
  );
}

/** Resolve a place name to coordinates: gazetteer, then cache, then Nominatim. */
export async function locate(label: string): Promise<LatLng | null> {
  const hit = gazetteerHit(label);
  if (hit) return hit;

  const key = normalise(label);
  if (memory.has(key)) return memory.get(key) ?? null;
  const cached = readCache()[key];
  if (cached) {
    memory.set(key, cached);
    return cached;
  }

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1" +
      "&countrycodes=in&bounded=1&viewbox=73.60,15.85,74.35,14.85&q=" +
      encodeURIComponent(key + ", Goa");
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    if (Array.isArray(j) && j[0]) {
      const at = { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
      memory.set(key, at);
      writeCache(key, at);
      return at;
    }
  } catch {
    /* fall through */
  }
  memory.set(key, null);
  return null;
}

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Leg = {
  km: number;
  minutes: number;
  trafficDelayMinutes: number | null;
  /** true when the numbers came from TomTom rather than the fallback estimate. */
  routed: boolean;
};

const routeCache = new Map<string, Leg>();

/**
 * Real road distance and duration between two points, via TomTom Routing API.
 * The API key stays on the Next.js server route.
 * Falls back to a great-circle estimate when the service is unavailable.
 */
export async function route(
  a: LatLng,
  b: LatLng,
  profile: "driving" | "cycling" | "foot" = "driving",
  mode?: TransportMode,
  options?: { fresh?: boolean },
): Promise<Leg> {
  const key = `${profile}|${mode || "default"}|${a.lat.toFixed(4)},${a.lng.toFixed(4)}|${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
  const cached = options?.fresh ? undefined : routeCache.get(key);
  if (cached) return cached;

  const straight = haversineKm(a, b);
  const fallback: Leg = {
    km: Math.round(straight * 1.3 * 10) / 10,
    minutes: Math.max(
      2,
      Math.round(((straight * 1.3) / (profile === "foot" ? 4.5 : 28)) * 60),
    ),
    trafficDelayMinutes: null,
    routed: false,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch("/api/routing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: a,
        end: b,
        transportMode:
          profile === "foot"
            ? "pedestrian"
            : profile === "cycling"
              ? "bicycle"
              : mode === "Scooter"
                ? "motorcycle"
                : mode === "Taxi"
                  ? "taxi"
                  : mode === "Public Transport"
                    ? "bus"
                  : "car",
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    if (j?.distanceMeters != null && j?.durationSeconds != null) {
      const out: Leg = {
        km: Math.round((j.distanceMeters / 1000) * 10) / 10,
        minutes: Math.max(1, Math.round(j.durationSeconds / 60)),
        trafficDelayMinutes:
          typeof j.trafficDelaySeconds === "number"
            ? Math.max(0, Math.round(j.trafficDelaySeconds / 60))
            : null,
        routed: true,
      };
      if (!options?.fresh) routeCache.set(key, out);
      return out;
    }
  } catch {
    /* fall through to the estimate */
  }
  if (!options?.fresh) routeCache.set(key, fallback);
  return fallback;
}

/** Per-mode time and fare for a leg of a known road distance. */
export function modeEstimate(leg: Leg, mode: TransportMode) {
  const meta = TRANSPORT_META[mode];
  const minutes =
    mode === "Walking"
      ? Math.round((leg.km / 4.5) * 60)
      : Math.round(leg.minutes * meta.timeFactor);
  const cost = Math.round(meta.base + leg.km * meta.perKm);
  return { minutes, cost, ...meta };
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** Modes the guest picked on the profile screen, or a sensible default. */
export function readTransportModes(): TransportMode[] {
  const all = Object.keys(TRANSPORT_META) as TransportMode[];
  try {
    const raw = localStorage.getItem("travelbuddy:transport-modes");
    if (raw) {
      const picked = JSON.parse(raw) as string[];
      const valid = picked.filter((m): m is TransportMode =>
        all.includes(m as TransportMode),
      );
      if (valid.length) return valid;
    }
  } catch {
    /* fall through */
  }
  return ["Scooter", "Taxi"];
}
