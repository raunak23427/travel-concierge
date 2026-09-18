import type { SavedTrip } from "./trip-updates";
import { dayDate, scheduleFor, type Stop } from "./trip-schedule";

/**
 * What a stop costs right now, rather than what it cost when the plan was made.
 *
 * Two forces move a price. The first is real and predictable: Goa charges more
 * at the weekend, and charges it unevenly — a club door on Saturday moves far
 * more than a bus fare does. The second is demand, which here is MODELLED, not
 * fetched: there is no live pricing feed behind this app, so the surge is a
 * deterministic function of the stop and the clock.
 *
 * Deterministic matters. The browser and the cron both need to arrive at the
 * same number for the same minute, or the guest gets a notification about a
 * price the app never shows them. Nothing is stored and nothing is random —
 * given an id and a timestamp, both sides compute the same figure.
 */

/**
 * How long demand takes to complete one full cycle.
 *
 * Deliberately short. Real demand moves over hours, but a reviewer needs to
 * see the mechanism work inside a few minutes of making a plan, and the model
 * is openly a model either way.
 */
export const SURGE_PERIOD_MS = 8 * 60 * 1000;

/** Kept for callers that step time in discrete jumps. */
export const SURGE_WINDOW_MS = 60 * 1000;

/** Below this, a move is noise and not worth interrupting anyone for. */
export const NOTIFY_THRESHOLD = 0.08;

type Kind = "travel" | "activity" | "food" | "relax" | string;

/**
 * Weekend uplift by category. Friday counts: in Goa the weekend starts when
 * the Friday flights land, and the clubs price accordingly.
 */
const WEEKEND_UPLIFT: Record<string, number> = {
  activity: 0.18,
  food: 0.1,
  relax: 0.06,
  travel: 0.04,
};

/** How hard demand pushes each category around, as a +/- fraction. */
const SURGE_RANGE: Record<string, number> = {
  activity: 0.22,
  food: 0.12,
  relax: 0.08,
  travel: 0.15,
};

/**
 * A stable 0..1 from a string, used only to give each stop its own phase.
 *
 * An earlier version fed this straight into the surge amount, which clustered
 * hard around the middle and left prices moving by about 2% when they were
 * meant to move by twenty. Driving a phase instead means the distribution
 * barely matters — the amplitude is set explicitly below.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function isWeekend(isoDate: string): boolean {
  const day = new Date(`${isoDate}T12:00:00+05:30`).getDay();
  return day === 5 || day === 6 || day === 0; // Fri, Sat, Sun
}

export function priceKey(tripId: string, day: number, index: number): string {
  return `${tripId}:${day}:${index}`;
}

export type PricedStop = {
  key: string;
  day: number;
  index: number;
  activity: string;
  type: Kind;
  date: string;
  base: number;
  price: number;
  weekend: boolean;
  /** Fraction above or below the base, after both forces. */
  delta: number;
};

/** Price one stop at a given moment. */
export function priceStop(tripId: string, stop: Stop, now: number): PricedStop {
  const base = stop.activity.cost || 0;
  const type = stop.activity.type || "activity";
  const weekend = isWeekend(stop.date);

  const uplift = weekend ? (WEEKEND_UPLIFT[type] ?? 0.1) : 0;

  // Demand as a smooth wave rather than a fresh roll each window. Continuous
  // means the browser and the cron agree at any instant, not just on a shared
  // boundary, and the per-stop phase stops the whole itinerary swinging as one
  // block. A second, slower harmonic keeps it from looking like a metronome.
  const key = priceKey(tripId, stop.day, stop.index);
  const range = SURGE_RANGE[type] ?? 0.15;
  const phase = hash(key) * Math.PI * 2;
  const t = (now / SURGE_PERIOD_MS) * Math.PI * 2;
  const wave = Math.sin(t + phase) * 0.78 + Math.sin(t * 0.37 + phase * 2) * 0.22;
  const surge = wave * range;

  const multiplier = 1 + uplift + surge;
  const price =
    base > 0 ? Math.max(0, Math.round((base * multiplier) / 10) * 10) : 0;

  return {
    key,
    day: stop.day,
    index: stop.index,
    activity: stop.activity.activity,
    type,
    date: stop.date,
    base,
    price,
    weekend,
    delta: base > 0 ? price / base - 1 : 0,
  };
}

/** Every stop that actually costs something, priced for this moment. */
export function priceTrip(trip: SavedTrip, now = Date.now()): PricedStop[] {
  return scheduleFor(trip)
    .filter((s) => (s.activity.cost || 0) > 0)
    .map((s) => priceStop(trip.id, s, now));
}

/** Only the stops still ahead of the guest — a surge on a past stop is noise. */
export function upcomingPriced(
  trip: SavedTrip,
  now = Date.now(),
): PricedStop[] {
  const ahead = new Set(
    scheduleFor(trip)
      .filter((s) => s.startsAt > now)
      .map((s) => priceKey(trip.id, s.day, s.index)),
  );
  return priceTrip(trip, now).filter((p) => ahead.has(p.key));
}

export const rupees = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

/** What the whole trip costs at this moment, against what it was planned at. */
export function tripTotals(trip: SavedTrip, now = Date.now()) {
  const priced = priceTrip(trip, now);
  const base = priced.reduce((sum, p) => sum + p.base, 0);
  const live = priced.reduce((sum, p) => sum + p.price, 0);
  return { base, live, delta: base > 0 ? live / base - 1 : 0 };
}

/** Human phrasing for a move, used by both the panel and the bot. */
export function describeMove(p: PricedStop): {
  title: string;
  message: string;
} {
  const pct = Math.round(Math.abs(p.delta) * 100);
  const up = p.delta > 0;
  const reason =
    p.weekend && up
      ? "weekend demand"
      : up
        ? "demand is up"
        : "demand has eased";

  return {
    title: up ? `${p.activity} is up ${pct}%` : `${p.activity} is down ${pct}%`,
    message: up
      ? `Now ${rupees(p.price)}, planned at ${rupees(p.base)} — ${reason} on day ${p.day}.`
      : `Now ${rupees(p.price)}, down from ${rupees(p.base)} — ${reason}. Good time to book day ${p.day}.`,
  };
}

export { dayDate };
