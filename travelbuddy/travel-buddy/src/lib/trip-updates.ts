import type {
  FlightInfo,
  HotelInfo,
  ItineraryActivity,
  ItineraryDay,
  TransferInfo,
  TripItinerary,
} from "@/data/itineraryMock";
import type { SessionData } from "@/components/onboarding/SessionInit";

export interface SavedTrip {
  planning?: { stayArea: string; stayProperty: string; arriveGoa: string; departGoa: string; budget: number; adults: number; children: number };
  plannerSignature?: string;
  id: string;
  name: string;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  timeZone: string;
  travelers: number;
  image: string;
  days: ItineraryDay[];
  flights: FlightInfo[];
  hotel: HotelInfo | null;
  transfers: TransferInfo[];
}

export type NoticeKind = "reminder" | "change" | "alert";
export interface TripNotice {
  id: string;
  tripId: string;
  kind: NoticeKind;
  title: string;
  message: string;
  createdAt: string;
  day?: number;
  read: boolean;
}

export interface TravelState {
  version: 1;
  trip: SavedTrip | null;
  notifications: TripNotice[];
  reminders: boolean;
}

export const emptyTravelState = (): TravelState => ({
  version: 1,
  trip: null,
  notifications: [],
  reminders: true,
});
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const strings = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => typeof value[key] === "string");

export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function dayDate(start: string, day: number) {
  if (!validDate(start)) return "";
  const date = new Date(`${start}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

export function formatDate(value: string) {
  return validDate(value)
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value))
    : "Dates to be confirmed";
}

export function isActivity(value: unknown): value is ItineraryActivity {
  return (
    record(value) &&
    strings(value, ["time", "activity", "description", "type"]) &&
    finite(value.cost) &&
    value.cost >= 0
  );
}

export function isDays(value: unknown): value is ItineraryDay[] {
  return (
    Array.isArray(value) &&
    value.length <= 366 &&
    value.every(
      (day) =>
        record(day) &&
        Number.isInteger(day.day) &&
        Number(day.day) > 0 &&
        typeof day.title === "string" &&
        Array.isArray(day.items) &&
        day.items.every(isActivity) &&
        (day.mustDo === undefined ||
          (record(day.mustDo) &&
            typeof day.mustDo.activity === "string" &&
            typeof day.mustDo.description === "string" &&
            finite(day.mustDo.cost))),
    ) &&
    new Set(value.map((day) => day.day)).size === value.length
  );
}

export function isTrip(value: unknown): value is SavedTrip {
  if (
    !record(value) ||
    !strings(value, [
      "id",
      "name",
      "destination",
      "country",
      "startDate",
      "endDate",
      "timeZone",
      "image",
    ])
  )
    return false;
  return (
    !!value.id &&
    isDays(value.days) &&
    finite(value.travelers) &&
    value.travelers >= 1 &&
    validTimeZone(value.timeZone as string) &&
    (value.plannerSignature === undefined ||
      typeof value.plannerSignature === "string") &&
    (value.planning === undefined || (record(value.planning) && strings(value.planning, ["stayArea", "stayProperty", "arriveGoa", "departGoa"]) && ["budget", "adults", "children"].every(key => finite((value.planning as Record<string, unknown>)[key])))) &&
    (!value.startDate || validDate(value.startDate as string)) &&
    (!value.endDate || validDate(value.endDate as string)) &&
    (!(value.startDate && value.endDate) || value.endDate >= value.startDate) &&
    Array.isArray(value.flights) &&
    value.flights.every(
      (f) =>
        record(f) &&
        strings(f, [
          "airline",
          "flightNo",
          "from",
          "to",
          "departure",
          "arrival",
        ]),
    ) &&
    (value.hotel === null ||
      (record(value.hotel) &&
        strings(value.hotel, ["name", "location"]) &&
        finite(value.hotel.nights))) &&
    Array.isArray(value.transfers) &&
    value.transfers.every(
      (t) => record(t) && strings(t, ["from", "to", "type"]) && finite(t.cost),
    )
  );
}

export function isNotice(value: unknown): value is TripNotice {
  return (
    record(value) &&
    strings(value, ["id", "tripId", "title", "message", "createdAt"]) &&
    !!value.id &&
    ["reminder", "change", "alert"].includes(value.kind as string) &&
    typeof value.read === "boolean" &&
    Number.isFinite(Date.parse(value.createdAt as string)) &&
    (value.day === undefined ||
      (Number.isInteger(value.day) && Number(value.day) > 0))
  );
}

export function parseTravelState(raw: string | null): TravelState {
  if (!raw) return emptyTravelState();
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    value.version !== 1 ||
    (value.trip !== null && !isTrip(value.trip)) ||
    !Array.isArray(value.notifications) ||
    !value.notifications.every(isNotice) ||
    typeof value.reminders !== "boolean"
  )
    throw new Error("Saved travel data is invalid.");
  return value as unknown as TravelState;
}

export function addNotices(
  state: TravelState,
  incoming: TripNotice[],
): TravelState {
  const seen = new Set(state.notifications.map((n) => n.id));
  const fresh = incoming.filter(
    (n) => n.tripId === state.trip?.id && !seen.has(n.id) && !!seen.add(n.id),
  );
  if (!fresh.length) return state;

  // Collapse repeats. Regenerating an itinerary fires the same "Itinerary
  // updated" notice every time, which stacked up as identical rows. Keep the
  // newest of any title+message pair for a trip rather than listing it twice.
  const merged = [...fresh, ...state.notifications].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const keptKeys = new Set<string>();
  const deduped = merged.filter((n) => {
    const key = `${n.tripId}|${n.kind}|${n.title}|${n.message}|${n.day ?? ""}`;
    if (keptKeys.has(key)) return false;
    keptKeys.add(key);
    return true;
  });

  return { ...state, notifications: deduped.slice(0, 500) };
}

export function dueReminders(trip: SavedTrip, now: Date): TripNotice[] {
  if (!validDate(trip.startDate)) return [];
  // Compare calendar times in the destination zone, never in the device zone.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: trip.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const current = Date.parse(
    `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`,
  );
  return trip.days.flatMap((day) =>
    day.items.flatMap((item, index) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) return [];
      const date = dayDate(trip.startDate, day.day);
      const starts = Date.parse(`${date}T${item.time}:00Z`);
      const minutes = Math.round((starts - current) / 60000);
      if (minutes < 0 || minutes > 30) return [];
      return [
        {
          id: `reminder:${trip.id}:${date}:${index}:${item.time}:${item.activity}`,
          tripId: trip.id,
          kind: "reminder" as const,
          title: item.activity,
          message: `Scheduled for ${item.time} (${trip.timeZone}). ${item.description}`,
          createdAt: now.toISOString(),
          day: day.day,
          read: false,
        },
      ];
    }),
  );
}

export function fromPlanner(
  itinerary: TripItinerary,
  details: Partial<SessionData>,
  id: string,
): SavedTrip | null {
  const trip: SavedTrip = {
    id,
    name: `Trip to ${itinerary.destination}`,
    destination: itinerary.destination,
    country: itinerary.country || "",
    startDate: validDate(details.checkIn || "") ? details.checkIn! : "",
    endDate: validDate(details.checkOut || "") ? details.checkOut! : "",
    timeZone:
      itinerary.country === "India" || itinerary.destination === "Goa"
        ? "Asia/Kolkata"
        : "UTC",
    travelers: details.travelers || 1,
    image: itinerary.image || "",
    days: itinerary.days,
    flights: itinerary.flights || [],
    hotel: itinerary.hotel || null,
    transfers: itinerary.transfers || [],
    planning: { stayArea: details.stayArea || "", stayProperty: details.stayProperty || "", arriveGoa: details.arriveGoa || "", departGoa: details.departGoa || "", budget: details.budget || itinerary.budget || itinerary.totalCost || 0, adults: details.adults || details.travelers || 1, children: details.children || 0 },
  };
  return isTrip(trip) ? trip : null;
}
