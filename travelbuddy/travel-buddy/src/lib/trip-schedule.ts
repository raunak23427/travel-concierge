import type { SavedTrip } from "./trip-updates";
import type { ItineraryActivity } from "@/data/itineraryMock";
import { escapeHtml } from "./telegram";

/**
 * Turning an itinerary into real instants.
 *
 * The app stores wall-clock times ("15:00") with no zone, because they are
 * always Goa time. Goa is IST and has never observed daylight saving, so a
 * fixed +05:30 is correct here in a way it would not be for a general travel
 * app — if this ever handles a second destination, this is the file to change.
 */

const IST_OFFSET_MIN = 5 * 60 + 30;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Today in Goa, regardless of where the server happens to be. */
export function istNow(at: Date = new Date()) {
  const shifted = new Date(at.getTime() + IST_OFFSET_MIN * 60_000);
  const date = shifted.toISOString().slice(0, 10);
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  return {
    date,
    hours,
    minutes,
    minutesOfDay: hours * 60 + minutes,
    localTime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
}

/** Epoch milliseconds for a Goa wall-clock time. */
export function instantFor(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00+05:30`);
}

export function dayDate(start: string, day: number): string {
  const date = new Date(`${start}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

export type Stop = {
  day: number;
  index: number;
  date: string;
  startsAt: number;
  activity: ItineraryActivity;
};

/** Every timed stop of the trip as an absolute instant, in order. */
export function scheduleFor(trip: SavedTrip): Stop[] {
  if (!trip.startDate) return [];
  const stops: Stop[] = [];
  for (const day of trip.days || []) {
    const date = dayDate(trip.startDate, day.day);
    if (!date) continue;
    (day.items || []).forEach((activity, index) => {
      if (!HHMM.test(activity.time)) return;
      stops.push({
        day: day.day,
        index,
        date,
        startsAt: instantFor(date, activity.time),
        activity,
      });
    });
  }
  return stops.sort((a, b) => a.startsAt - b.startsAt);
}

/** Which day of the trip a given Goa date is, or null if outside the trip. */
/**
 * Stops that deserve a nudge right now.
 *
 * The window has to be wider than the gap between cron runs, or a stop whose
 * lead time falls between two ticks is never announced. With a ten-minute cron
 * and a twenty-minute window every stop is seen at least once, and usually
 * twice — which is why the caller must still de-duplicate.
 */
export function dueStops(
  trip: SavedTrip,
  nowMs: number,
  leadMin = 45,
  windowMin = 20,
): { stop: Stop; minutesAway: number }[] {
  return scheduleFor(trip)
    .map((stop) => ({ stop, minutesAway: (stop.startsAt - nowMs) / 60000 }))
    .filter(
      ({ minutesAway }) =>
        minutesAway <= leadMin && minutesAway > leadMin - windowMin,
    );
}

export function tripDayFor(trip: SavedTrip, date: string): number | null {
  for (const day of trip.days || []) {
    if (dayDate(trip.startDate, day.day) === date) return day.day;
  }
  return null;
}

export function readableDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export const rupees = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

const ICONS: Record<string, string> = {
  travel: "🚗",
  activity: "🏄",
  food: "🍽",
  relax: "🌴",
};

export function icon(type?: string): string {
  return ICONS[type || ""] || "📍";
}

/** One stop, as a Telegram HTML line. */
export function formatStop(activity: ItineraryActivity): string {
  const cost = activity.cost ? ` · ${rupees(activity.cost)}` : "";
  return (
    `${icon(activity.type)} <b>${escapeHtml(activity.time)}</b> — ${escapeHtml(activity.activity)}${escapeHtml(cost)}` +
    (activity.description
      ? `\n    <i>${escapeHtml(activity.description)}</i>`
      : "")
  );
}

/** A whole day, as a Telegram HTML block. */
export function formatDay(
  trip: SavedTrip,
  dayNumber: number,
  heading?: string,
): string {
  const day = (trip.days || []).find((d) => d.day === dayNumber);
  if (!day) return "Nothing scheduled for that day.";
  const date = dayDate(trip.startDate, day.day);
  const lines = [
    heading
      ? `<b>${escapeHtml(heading)}</b>`
      : `<b>Day ${day.day} — ${escapeHtml(day.title)}</b>`,
    date ? `<i>${escapeHtml(readableDate(date))}</i>` : "",
    "",
    ...(day.items || []).map(formatStop),
  ].filter(Boolean);

  const total = (day.items || []).reduce((sum, i) => sum + (i.cost || 0), 0);
  if (total > 0) lines.push("", `Day total: <b>${rupees(total)}</b>`);
  return lines.join("\n");
}
