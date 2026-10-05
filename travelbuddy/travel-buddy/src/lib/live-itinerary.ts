import type { ItineraryActivity, TripItinerary } from "@/data/itineraryMock";
import type { LivePlanResponse, PooledPlace } from "./live-types";
import type { PreferenceProfile } from "./preference-queries";

/**
 * Fill a plan's stops with real places.
 *
 * The planner produces a well-paced skeleton — what kind of thing happens at
 * 13:00 on day two, and roughly what it costs. This replaces the named stops
 * in that skeleton with places SerpApi found for this guest's preferences near
 * where they are staying, keeping the timing and budget the planner chose.
 *
 * Travel legs, hotel meals and beach downtime are left alone: a live search
 * has nothing to add to "Arrive at Goa Airport".
 */

export type StayContext = { area?: string; lat?: number; lng?: number };

export async function fetchLivePlan(
  profile: PreferenceProfile,
  stay: StayContext,
): Promise<LivePlanResponse | null> {
  try {
    const res = await fetch("/api/live/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, stay }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as LivePlanResponse;
  } catch {
    return null;
  }
}

const SKIP = /airport|arriv|depart|check.?in|check.?out|hotel|resort|villa/i;

function hourOf(time: string) {
  const h = Number(time?.slice(0, 2));
  return Number.isFinite(h) ? h : 12;
}

export function mealFor(item: ItineraryActivity) {
  const lead = item.activity.match(
    /^(breakfast|brunch|lunch|dinner|supper)\b/i,
  )?.[1];
  if (lead) return lead[0].toUpperCase() + lead.slice(1).toLowerCase();
  const h = hourOf(item.time);
  return h < 11 ? "Breakfast" : h < 16 ? "Lunch" : "Dinner";
}

export function describePlace(p: PooledPlace) {
  const bits: string[] = [];
  if (p.category) bits.push(p.category);
  if (p.rating)
    bits.push(
      `★ ${p.rating.toFixed(1)}${p.reviews ? ` (${p.reviews.toLocaleString("en-IN")})` : ""}`,
    );
  if (p.address) bits.push(p.address.split(",").slice(0, 2).join(",").trim());
  return bits.join(" · ");
}

/**
 * Interleave a pool by the preference each place answers. The pool arrives
 * grouped by search, so taking from the top fills every slot from the first
 * query — five water-sports operators in a row, and the heritage the guest
 * also swiped for never appears. Round-robin keeps the plan as varied as the
 * profile that produced it.
 */
function interleave(pool: PooledPlace[]): PooledPlace[] {
  const groups = new Map<string, PooledPlace[]>();
  for (const p of pool) {
    const g = groups.get(p.reason);
    if (g) g.push(p);
    else groups.set(p.reason, [p]);
  }
  const lists = [...groups.values()];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  const out: PooledPlace[] = [];
  for (let i = 0; i < longest; i += 1) for (const list of lists) if (list[i]) out.push(list[i]);
  return out;
}

/** Take the next unused place from a pool, or nothing once it runs dry. */
function taker(pool: PooledPlace[], used: Set<string>, names: Set<string>) {
  const ordered = interleave(pool);
  return () => {
    const next = ordered.find((p) => !used.has(p.id) && !names.has(p.name.toLowerCase()));
    if (next) {
      used.add(next.id);
      names.add(next.name.toLowerCase());
    }
    return next;
  };
}

export function applyLivePlaces(
  itinerary: TripItinerary,
  plan: LivePlanResponse,
): TripItinerary {
  const out = JSON.parse(JSON.stringify(itinerary)) as TripItinerary;
  const used = new Set<string>();
  // Names the template keeps (beach afternoons, hotel meals) are off limits,
  // or "Candolim Beach" turns up twice in one plan.
  const names = new Set(
    out.days.flatMap((d) =>
      d.items
        .filter((i) => i.type === "travel" || i.type === "relax" || SKIP.test(i.activity))
        .map((i) => i.activity.toLowerCase()),
    ),
  );
  const nextFood = taker(plan.pools.food, used, names);
  const nextActivity = taker(plan.pools.activity, used, names);
  const nextNight = taker(plan.pools.nightlife, used, names);
  let filled = 0;

  for (const day of out.days) {
    day.items = day.items.map((item) => {
      if (
        item.type === "travel" ||
        item.type === "relax" ||
        SKIP.test(item.activity)
      )
        return item;

      let place: PooledPlace | undefined;
      if (item.type === "food") place = nextFood();
      else if (item.type === "activity") {
        // Evenings go to nightlife first: a water-sports desk at 19:00 is
        // closing, not starting.
        place =
          hourOf(item.time) >= 18
            ? (nextNight() ?? nextActivity())
            : nextActivity();
      }
      if (!place) return item;

      filled += 1;
      return {
        ...item,
        activity:
          item.type === "food"
            ? `${mealFor(item)} at ${place.name}`
            : place.name,
        description: describePlace(place) || item.description,
        place,
      };
    });
  }

  if (filled === 0) return itinerary;

  const reasons = [
    ...new Set(plan.queries.filter((q) => q.count > 0).map((q) => q.reason)),
  ];
  (
    out as TripItinerary & { recommendationReason?: { text: string } }
  ).recommendationReason = {
    text: `${filled} stops are real places from Google Maps, found for you because: ${reasons.slice(0, 3).join("; ").toLowerCase()}.`,
  };

  out.live = {
    provenance: plan.provenance,
    queries: plan.queries,
    // Kept on the plan so Replace can offer siblings without another search.
    pools: {
      food: plan.pools.food.slice(0, 14),
      activity: plan.pools.activity.slice(0, 14),
      nightlife: plan.pools.nightlife.slice(0, 6),
    },
    enrichedAt: new Date().toISOString(),
  };
  return out;
}

/** Fetch and apply in one step; returns the plan unchanged if live data is unavailable. */
export async function withLivePlaces(
  itinerary: TripItinerary,
  profile: PreferenceProfile,
  stay: StayContext,
): Promise<TripItinerary> {
  if (itinerary.live) return itinerary;
  const plan = await fetchLivePlan(profile, stay);
  return plan ? applyLivePlaces(itinerary, plan) : itinerary;
}

/** Other live places of the same kind as a stop, for the Replace sheet. */
export function liveAlternatives(
  itinerary: TripItinerary,
  item: ItineraryActivity,
  limit = 5,
): PooledPlace[] {
  const pools = itinerary.live?.pools;
  if (!pools) return [];
  const inPlan = new Set(
    itinerary.days.flatMap((d) =>
      d.items.map((i) => i.place?.id).filter(Boolean),
    ),
  );
  const pool =
    item.type === "food"
      ? pools.food
      : item.place?.kind === "nightlife"
        ? [...pools.nightlife, ...pools.activity]
        : pools.activity;
  return pool.filter((p) => !inPlan.has(p.id)).slice(0, limit);
}
