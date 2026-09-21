import type { SavedTrip, TripNotice } from "./trip-updates";
import {
  NOTIFY_THRESHOLD,
  describeMove,
  rupees,
  upcomingPriced,
  type PricedStop,
} from "./pricing";

/**
 * Turning price movement into notices, without becoming a nuisance.
 *
 * Prices are recomputed constantly, so the interesting question is not "what
 * changed" but "what changed enough, and haven't we already said so". Each
 * stop remembers the price it was last announced at, and only a move of
 * NOTIFY_THRESHOLD *against that* speaks up. Without the baseline the same
 * surge gets reported every time the timer fires.
 */

const KEY = "tb:prices:announced";

/** A headline below this is not worth anyone's attention. */
const MIN_HEADLINE = 0.06;

/** Price last announced for a stop, and when. */
type Seen = { price: number; at: number };
type Announced = Record<string, Seen>;

/**
 * Two stops moving at once is news; thirteen is noise. The demand model runs
 * on an eight-minute wave and the sync ticks every sixty seconds, so without
 * these a full itinerary produces a near-continuous stream.
 */
const COOLDOWN_MS = 12 * 60 * 1000;
const MAX_PER_SYNC = 2;

function read(): Announced {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<
      string,
      number | Seen
    >;
    const out: Announced = {};
    for (const [key, value] of Object.entries(raw)) {
      // Earlier builds stored a bare price. Treat those as announced long ago
      // so an upgrade does not re-announce the whole itinerary at once.
      out[key] =
        typeof value === "number" ? { price: value, at: 0 } : value;
    }
    return out;
  } catch {
    return {};
  }
}

function write(value: Announced): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* private mode — worst case a notice repeats */
  }
}

/** Forget a trip's history, so a fresh plan starts quiet. */
export function resetAnnouncedPrices(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function noticeFor(trip: SavedTrip, p: PricedStop, now: Date): TripNotice {
  const { title, message } = describeMove(p);
  return {
    // Stable per stop and per window, so a double-fire cannot duplicate it.
    id: `price:${p.key}:${Math.round(p.price)}`,
    tripId: trip.id,
    kind: p.delta > 0 ? "alert" : "change",
    title,
    message,
    createdAt: now.toISOString(),
    day: p.day,
    read: false,
  };
}

/**
 * Notices for anything that has moved materially since it was last announced.
 *
 * Called on the same timer as the weather sync. Returns an empty list most of
 * the time, which is the intended behaviour.
 */
export function syncPriceNotices(
  trip: SavedTrip,
  now = new Date(),
): TripNotice[] {
  if (!trip?.days?.length) return [];

  const announced = read();
  const out: TripNotice[] = [];
  let dirty = false;

  const stops = upcomingPriced(trip, now.getTime()).filter((p) => p.base > 0);
  if (!stops.length) return [];

  // First sight of this plan. Announcing every stop here would be a dozen
  // notifications for something the guest just did, but staying silent is
  // worse: the plan was costed at base prices and some stops already differ,
  // which is exactly the thing worth knowing.
  //
  // One summary per day, which matches how the weather briefings are shaped —
  // a single trip-wide card next to five weather cards read as though pricing
  // were the afterthought. Then per-stop alerts from here on.
  const nowMs = now.getTime();
  const firstSight = stops.every((p) => announced[p.key] === undefined);
  if (firstSight) {
    const byDay = new Map<number, PricedStop[]>();
    for (const p of stops) {
      const list = byDay.get(p.day);
      if (list) list.push(p);
      else byDay.set(p.day, [p]);
    }

    for (const day of [...byDay.keys()].sort((a, b) => a - b).slice(0, 5)) {
      const dayStops = byDay.get(day)!;
      const planned = dayStops.reduce((sum, p) => sum + p.base, 0);
      const live = dayStops.reduce((sum, p) => sum + p.price, 0);
      const moved = dayStops.filter(
        (p) => Math.abs(p.delta) >= NOTIFY_THRESHOLD,
      ).length;
      const diff = live - planned;

      out.push({
        id: `price:opening:${trip.id}:${day}`,
        tripId: trip.id,
        kind: "change",
        title:
          diff === 0
            ? `Day ${day} is tracking at the price it was costed`
            : diff > 0
              ? `Day ${day} is ${rupees(Math.abs(diff))} above what it was costed at`
              : `Day ${day} is ${rupees(Math.abs(diff))} cheaper than costed`,
        message:
          `Watching ${dayStops.length} stop${dayStops.length === 1 ? "" : "s"} on this day for weekend and demand pricing. ` +
          `Right now it comes to ${rupees(live)} against ${rupees(planned)} planned` +
          (moved ? `, with ${moved} already moved materially.` : ".") +
          ` You'll get an alert here when anything shifts.`,
        createdAt: now.toISOString(),
        day,
        read: false,
      });
    }

    for (const p of stops) announced[p.key] = { price: p.price, at: nowMs };
    write(announced);
    return out;
  }

  // Biggest movers first, so the cap below keeps the most interesting ones
  // rather than whichever happens to sit earliest in the itinerary.
  const candidates = [...stops].sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
  );

  for (const p of candidates) {
    const last = announced[p.key];
    if (last === undefined) {
      announced[p.key] = { price: p.price, at: nowMs };
      dirty = true;
      continue;
    }

    // Two different questions, and both have to pass. Has it MOVED enough
    // since we last spoke, and does it STAND far enough from the planned
    // price to be worth a headline? Without the second test a price
    // oscillating around its base produces "up 1%" alerts.
    const move = Math.abs(p.price - last.price) / p.base;
    if (move < NOTIFY_THRESHOLD) continue;
    if (Math.abs(p.delta) < MIN_HEADLINE) {
      announced[p.key] = { price: p.price, at: last.at };
      dirty = true;
      continue;
    }

    // Quiet this stop for a while even if it keeps swinging. The baseline
    // still tracks, so nothing is lost — it just is not said again yet.
    if (nowMs - last.at < COOLDOWN_MS) continue;

    if (out.length >= MAX_PER_SYNC) break;

    out.push(noticeFor(trip, p, now));
    announced[p.key] = { price: p.price, at: nowMs };
    dirty = true;
  }

  if (dirty) write(announced);
  return out;
}
