import type { SavedTrip, TripNotice } from "./trip-updates";
import {
  NOTIFY_THRESHOLD,
  describeMove,
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

type Announced = Record<string, number>;

function read(): Announced {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Announced;
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

  for (const p of upcomingPriced(trip, now.getTime())) {
    if (p.base <= 0) continue;

    // First sight of a stop establishes its baseline silently — nobody wants
    // the whole itinerary announced the moment a plan is made.
    const last = announced[p.key];
    if (last === undefined) {
      announced[p.key] = p.price;
      dirty = true;
      continue;
    }

    // Two different questions, and both have to pass. Has it MOVED enough
    // since we last spoke, and does it STAND far enough from the planned
    // price to be worth a headline? Without the second test a price
    // oscillating around its base produces "up 1%" alerts.
    const move = Math.abs(p.price - last) / p.base;
    if (move < NOTIFY_THRESHOLD) continue;
    if (Math.abs(p.delta) < MIN_HEADLINE) {
      announced[p.key] = p.price;
      dirty = true;
      continue;
    }

    out.push(noticeFor(trip, p, now));
    announced[p.key] = p.price;
    dirty = true;
  }

  if (dirty) write(announced);
  return out;
}
