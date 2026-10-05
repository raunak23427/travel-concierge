import { createHash } from "node:crypto";
import { kvGetJSON, kvIncr, kvSetJSON } from "./store";
import snapshots from "@/data/serp-snapshots.json";
import type { LiveEvent, LivePlace, Provenance } from "./live-types";

export type { LiveEvent, LivePlace, Provenance };

/**
 * Live local data, through SerpApi.
 *
 * This is where the app stops being a static Goa guide. Every food and activity
 * stop in a generated plan, every booking row and every "where should we eat"
 * the bot answers comes through here as a real place with a real rating.
 *
 * Server-only: the key never reaches a browser. Three layers sit in front of
 * the network, cheapest first, because the free plan is 250 searches a month
 * and one fresh plan costs about seven:
 *
 *   1. Redis cache, 48 hours, keyed on engine + normalised query + area.
 *   2. A daily and monthly credit cap, so a busy demo cannot exhaust the plan.
 *   3. Saved responses from real SerpApi calls (src/data/serp-snapshots.json),
 *      served when there is no key or the cap is hit, and labelled as saved.
 *
 * What comes back always says which of those it was. The UI shows it, so a
 * saved result is never passed off as live.
 */

const ENDPOINT = "https://serpapi.com/search.json";
const CACHE_TTL = 60 * 60 * 48;
const DAILY_CAP = Number(process.env.SERPAPI_DAILY_CAP) || 40;
const MONTHLY_CAP = Number(process.env.SERPAPI_MONTHLY_CAP) || 230;

export const serpConfigured = Boolean(process.env.SERPAPI_API_KEY);

export type SearchResult<T> = {
  query: string;
  items: T[];
  provenance: Provenance;
  /** When the data was fetched from SerpApi, for "saved" and "cached" honesty. */
  fetchedAt?: string;
};

type Snapshots = {
  capturedAt?: string | null;
  places?: Record<string, LivePlace[]>;
  events?: Record<string, LiveEvent[]>;
};
const SAVED = snapshots as unknown as Snapshots;

// ── keys and budget ─────────────────────────────────────────────────────────

function normalise(q: string) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cacheKey(engine: string, parts: (string | number | undefined)[]) {
  const h = createHash("sha1")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);
  return `serp:v1:${engine}:${h}`;
}

/** IST calendar day and month — the budget resets on the guest's clock. */
function istStamp() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString();
  return { day: ist.slice(0, 10), month: ist.slice(0, 7) };
}

/**
 * Reserve one credit. False when either cap is reached. An unreachable store
 * reports null; that allows the call, because without a store there is no
 * cache either and the alternative is a feature that silently never works.
 */
async function reserveCredit(): Promise<boolean> {
  const { day, month } = istStamp();
  const [d, m] = await Promise.all([
    kvIncr(`serp:used:${day}`, 2 * 86400),
    kvIncr(`serp:used:${month}`, 40 * 86400),
  ]);
  if (d === null || m === null) return true;
  return d <= DAILY_CAP && m <= MONTHLY_CAP;
}

export async function serpUsage() {
  const { day, month } = istStamp();
  const [d, m] = await Promise.all([
    kvGetJSON<number>(`serp:used:${day}`),
    kvGetJSON<number>(`serp:used:${month}`),
  ]);
  return {
    configured: serpConfigured,
    today: d ?? 0,
    month: m ?? 0,
    dailyCap: DAILY_CAP,
    monthlyCap: MONTHLY_CAP,
    savedQueries: Object.keys(SAVED.places || {}).length,
    savedEvents: Object.keys(SAVED.events || {}).length,
    savedCapturedAt: SAVED.capturedAt ?? undefined,
  };
}

// ── the network ─────────────────────────────────────────────────────────────

async function callSerpApi(params: Record<string, string>) {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) throw new SerpError("not-configured");
  const url = new URL(ENDPOINT);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", key);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
  } catch {
    throw new SerpError("unreachable");
  }
  if (res.status === 401) throw new SerpError("bad-key");
  if (res.status === 429) throw new SerpError("rate-limited");
  if (!res.ok) throw new SerpError(`http-${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  // SerpApi reports "no results" as a 200 with an error string. That is an
  // empty answer, not a failure — caching it stops the same miss costing twice.
  if (typeof json.error === "string" && !/no results/i.test(json.error)) {
    throw new SerpError("api-error");
  }
  return json;
}

export class SerpError extends Error {
  constructor(readonly reason: string) {
    super(`SerpApi: ${reason}`);
  }
}

// ── normalisers ─────────────────────────────────────────────────────────────

type RawPlace = {
  place_id?: string;
  data_id?: string;
  title?: string;
  type?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  address?: string;
  phone?: string;
  website?: string;
  open_state?: string;
  thumbnail?: string;
  gps_coordinates?: { latitude?: number; longitude?: number };
};

function toPlace(r: RawPlace): LivePlace | null {
  if (!r.title) return null;
  const id = r.place_id || r.data_id || normalise(r.title);
  const mapsUrl =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(`${r.title} ${r.address || "Goa"}`) +
    (r.place_id ? `&query_place_id=${encodeURIComponent(r.place_id)}` : "");
  return {
    id,
    name: r.title,
    category: r.type,
    rating: typeof r.rating === "number" ? r.rating : undefined,
    reviews: typeof r.reviews === "number" ? r.reviews : undefined,
    price: r.price,
    address: r.address,
    phone: r.phone,
    website: r.website,
    lat: r.gps_coordinates?.latitude,
    lng: r.gps_coordinates?.longitude,
    openState: r.open_state,
    thumbnail: r.thumbnail,
    mapsUrl,
  };
}

type RawEvent = {
  title?: string;
  /** "10 Oct" from the Google engine; an object from the google_events docs. */
  date?: string | { start_date?: string; when?: string };
  time?: string;
  /** The Google engine puts the venue type/name here. */
  type?: string;
  address?: string[] | string;
  venue?: { name?: string };
  description?: string;
  link?: string;
  ticket_info?: { link?: string; link_type?: string }[];
  thumbnail?: string;
  image?: string;
};

function toEvent(r: RawEvent): LiveEvent | null {
  if (!r.title) return null;
  const ticket =
    r.ticket_info?.find((t) => t.link_type === "tickets") || r.ticket_info?.[0];
  const dateText = typeof r.date === "string" ? r.date : r.date?.when;
  const when = [dateText, r.time].filter(Boolean).join(" · ") || undefined;
  const parts = Array.isArray(r.address) ? r.address : r.address ? [r.address] : [];
  return {
    id: createHash("sha1")
      .update(`${r.title}|${when ?? ""}|${parts.join(",")}`)
      .digest("hex")
      .slice(0, 12),
    title: r.title,
    when,
    startDate: typeof r.date === "object" ? r.date?.start_date : undefined,
    venue: r.venue?.name || parts[0] || r.type,
    address: parts.slice(1).join(", ") || undefined,
    description: r.description,
    link: r.link,
    ticketUrl: ticket?.link,
    thumbnail: r.thumbnail || r.image,
  };
}

// ── saved responses ─────────────────────────────────────────────────────────

/**
 * The closest saved query by shared words. Demo Mode has to work for any
 * stay area, so "seafood beach shack near candolim" should still find the
 * saved "seafood beach shack near calangute" rather than nothing.
 */
function closestSaved<T>(
  bank: Record<string, T[]> | undefined,
  q: string,
): T[] | null {
  if (!bank) return null;
  const want = new Set(
    normalise(q)
      .split(" ")
      .filter((w) => w.length > 2 && w !== "near" && w !== "goa"),
  );
  let best: { key: string; score: number } | null = null;
  for (const key of Object.keys(bank)) {
    const words = normalise(key).split(" ");
    const score = words.filter((w) => want.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { key, score };
  }
  return best ? bank[best.key] : null;
}

// ── public searches ─────────────────────────────────────────────────────────

export async function searchPlaces(input: {
  q: string;
  lat?: number;
  lng?: number;
  zoom?: number;
}): Promise<SearchResult<LivePlace>> {
  const q = input.q.trim();
  const hasPoint = Number.isFinite(input.lat) && Number.isFinite(input.lng);
  // Round the point so guests staying a street apart share a cache entry.
  const ll = hasPoint
    ? `@${input.lat!.toFixed(3)},${input.lng!.toFixed(3)},${input.zoom ?? 13}z`
    : undefined;
  const key = cacheKey("maps", [normalise(q), ll]);

  const cached = await kvGetJSON<{ items: LivePlace[]; fetchedAt: string }>(
    key,
  );
  if (cached)
    return {
      query: q,
      items: cached.items,
      provenance: "cached",
      fetchedAt: cached.fetchedAt,
    };

  if (serpConfigured && (await reserveCredit())) {
    try {
      const params: Record<string, string> = {
        engine: "google_maps",
        type: "search",
        q,
        hl: "en",
        gl: "in",
      };
      if (ll) params.ll = ll;
      const json = await callSerpApi(params);
      const raw = (json.local_results as RawPlace[] | undefined) ?? [];
      const items = raw.map(toPlace).filter((p): p is LivePlace => !!p);
      const fetchedAt = new Date().toISOString();
      await kvSetJSON(key, { items, fetchedAt }, CACHE_TTL);
      return { query: q, items, provenance: "live", fetchedAt };
    } catch (e) {
      console.warn("[serpapi] maps search failed:", (e as Error).message);
    }
  }

  const saved = closestSaved(SAVED.places, q);
  if (saved)
    return {
      query: q,
      items: saved,
      provenance: "saved",
      fetchedAt: SAVED.capturedAt ?? undefined,
    };
  return { query: q, items: [], provenance: "offline" };
}

/**
 * Which window to ask Google about, from how far away the trip is. The
 * dedicated google_events engine is not available on every plan, so events
 * come from the regular Google engine's events block, steered by phrasing.
 */
export function eventsWindowFor(startIso?: string): string {
  if (!startIso) return "this month";
  const days = (Date.parse(startIso) - Date.now()) / 86400000;
  if (days <= 1) return "today";
  if (days <= 6) return "this week";
  if (days <= 13) return "next week";
  if (days <= 30) return "this month";
  return "next month";
}

export async function searchEvents(input: {
  q?: string;
  window?: string;
}): Promise<SearchResult<LiveEvent>> {
  const window = input.window || "this month";
  const q = `${(input.q || "events").trim()} in Goa ${window}`;
  const key = cacheKey("events", [normalise(q)]);

  const cached = await kvGetJSON<{ items: LiveEvent[]; fetchedAt: string }>(
    key,
  );
  if (cached)
    return {
      query: q,
      items: cached.items,
      provenance: "cached",
      fetchedAt: cached.fetchedAt,
    };

  if (serpConfigured && (await reserveCredit())) {
    try {
      const json = await callSerpApi({
        engine: "google",
        q,
        hl: "en",
        gl: "in",
        location: "Goa, India",
      });
      const raw = (json.events_results as RawEvent[] | undefined) ?? [];
      const items = raw.map(toEvent).filter((e): e is LiveEvent => !!e);
      const fetchedAt = new Date().toISOString();
      await kvSetJSON(key, { items, fetchedAt }, CACHE_TTL);
      return { query: q, items, provenance: "live", fetchedAt };
    } catch (e) {
      console.warn("[serpapi] events search failed:", (e as Error).message);
    }
  }

  const saved = closestSaved(SAVED.events, q);
  if (saved)
    return {
      query: q,
      items: saved,
      provenance: "saved",
      fetchedAt: SAVED.capturedAt ?? undefined,
    };
  return { query: q, items: [], provenance: "offline" };
}
