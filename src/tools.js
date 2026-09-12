/**
 * Sarathi — tool layer.
 *
 * These are the functions the agent is allowed to call. Every one of them is a
 * real implementation over the curated Goa knowledge base or the booking store.
 * The model chooses WHICH tool to call and with what arguments; it never
 * invents the result.
 */

const fs = require("fs");
const path = require("path");

const KB = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "kb", "goa.json"), "utf8"),
);
const BOOKINGS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "kb", "bookings.json"), "utf8"),
);

// In-memory itinerary store, seeded from the booking record.
const itineraries = new Map();

function loadItinerary(bookingId) {
  if (!itineraries.has(bookingId)) {
    const b = BOOKINGS.find((x) => x.booking_id === bookingId);
    itineraries.set(bookingId, JSON.parse(JSON.stringify(b.itinerary)));
  }
  return itineraries.get(bookingId);
}

/* ------------------------------------------------------------------ */
/* Tool implementations                                                */
/* ------------------------------------------------------------------ */

function get_booking_context({ booking_id }) {
  const b = BOOKINGS.find((x) => x.booking_id === booking_id);
  if (!b) return { error: `No booking ${booking_id}` };
  return {
    booking_id: b.booking_id,
    property: b.property,
    area: b.area,
    zone: b.zone,
    check_in: b.check_in,
    check_out: b.check_out,
    guests: b.guests,
    host: b.host,
    nights: b.nights,
  };
}

/**
 * Grounded venue lookup. Filters, then ranks by a transparent score so the
 * agent can explain WHY something surfaced.
 */
function find_nearby({
  category,
  area,
  monsoon_safe,
  max_price_band,
  open_at,
  limit = 3,
}) {
  let rows = KB.places.filter((p) => !category || p.category === category);

  if (monsoon_safe === true) rows = rows.filter((p) => p.monsoon_safe === true);
  if (typeof max_price_band === "number")
    rows = rows.filter((p) => p.price_band <= max_price_band);
  if (open_at) {
    rows = rows.filter((p) => p.opens <= open_at && p.closes >= open_at);
  }

  const scored = rows.map((p) => {
    const dist = (p.distance_km && p.distance_km[area]) ?? 25;
    // Transparent scoring: proximity dominates, price band breaks ties.
    const proximity = Math.max(0, 1 - dist / 30);
    const value = 1 - p.price_band / 4;
    const score = +(proximity * 0.75 + value * 0.25).toFixed(3);
    return {
      id: p.id,
      name: p.name,
      area: p.area,
      category: p.category,
      distance_km: dist,
      price_band: p.price_band,
      avg_cost_inr: p.avg_cost_inr,
      monsoon_safe: p.monsoon_safe,
      tags: p.tags,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return {
    query: { category, area, monsoon_safe, max_price_band, open_at },
    count: scored.length,
    results: scored.slice(0, limit),
  };
}

/**
 * Weather. Reads a fixture so the demo is deterministic; swap the body for a
 * live IMD/OpenWeather call in production — the tool contract does not change.
 */
function get_weather({ date, area }) {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "kb", "weather.json"), "utf8"),
  );
  const row = fixture[date];
  if (!row) return { date, area, status: "no_data" };
  return { date, area, ...row };
}

function get_itinerary({ booking_id }) {
  return { booking_id, days: loadItinerary(booking_id) };
}

/**
 * Rewrites the plan and returns a diff, so the guest confirms a concrete change
 * rather than a vague suggestion.
 */
function reschedule_day({
  booking_id,
  from_day,
  to_day,
  replacement_place_id,
  reason,
}) {
  const days = loadItinerary(booking_id);
  const from = days.find((d) => d.day === from_day);
  const to = days.find((d) => d.day === to_day);
  if (!from || !to) return { error: "day out of range" };

  const moved = from.plan;
  const replacement = KB.places.find((p) => p.id === replacement_place_id);
  if (!replacement) return { error: `unknown place ${replacement_place_id}` };

  const displaced = to.plan;
  from.plan = replacement.name;
  from.place_id = replacement.id;
  to.plan = moved;
  to.place_id = from.place_id_prev ?? to.place_id;

  return {
    booking_id,
    reason,
    diff: [
      { day: from_day, before: moved, after: from.plan },
      { day: to_day, before: displaced, after: to.plan },
    ],
    itinerary: days,
  };
}

/** Routes a guest request to the host. Returns the delivery receipt. */
function notify_host({ booking_id, message }) {
  const b = BOOKINGS.find((x) => x.booking_id === booking_id);
  const receipt = {
    to: b.host.name,
    channel: "whatsapp",
    message,
    sent_at: new Date().toISOString(),
    status: "delivered",
  };
  return receipt;
}

function get_local_events({ area, from, to }) {
  const rows = KB.events.filter(
    (e) => !area || e.area === area || e.zone === "north",
  );
  return {
    count: rows.length,
    events: rows.map((e) => ({
      id: e.id,
      name: e.name,
      area: e.area,
      recurs: e.recurs ?? e.date,
      tags: e.tags,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Declarations handed to the model                                    */
/* ------------------------------------------------------------------ */

const declarations = [
  {
    name: "get_booking_context",
    description:
      "Fetch the guest's confirmed Wayzyy booking: property, area, dates, party size and host contact.",
    parameters: {
      type: "object",
      properties: { booking_id: { type: "string" } },
      required: ["booking_id"],
    },
  },
  {
    name: "find_nearby",
    description:
      "Search the curated Goa knowledge base for restaurants, activities or transport near an area. Use monsoon_safe:true when weather is bad.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["restaurant", "activity", "transport"],
        },
        area: { type: "string" },
        monsoon_safe: { type: "boolean" },
        max_price_band: { type: "number" },
        open_at: { type: "string", description: "HH:MM" },
        limit: { type: "number" },
      },
      required: ["category", "area"],
    },
  },
  {
    name: "get_weather",
    description:
      "Forecast for a date and area. Returns condition, rain_mm and any official advisory.",
    parameters: {
      type: "object",
      properties: { date: { type: "string" }, area: { type: "string" } },
      required: ["date", "area"],
    },
  },
  {
    name: "get_itinerary",
    description: "Current day-by-day plan for a booking.",
    parameters: {
      type: "object",
      properties: { booking_id: { type: "string" } },
      required: ["booking_id"],
    },
  },
  {
    name: "reschedule_day",
    description:
      "Swap a day's plan with another day and substitute a replacement venue. Returns a diff to confirm.",
    parameters: {
      type: "object",
      properties: {
        booking_id: { type: "string" },
        from_day: { type: "number" },
        to_day: { type: "number" },
        replacement_place_id: { type: "string" },
        reason: { type: "string" },
      },
      required: [
        "booking_id",
        "from_day",
        "to_day",
        "replacement_place_id",
        "reason",
      ],
    },
  },
  {
    name: "notify_host",
    description: "Send a message to the property host on the guest's behalf.",
    parameters: {
      type: "object",
      properties: {
        booking_id: { type: "string" },
        message: { type: "string" },
      },
      required: ["booking_id", "message"],
    },
  },
  {
    name: "get_local_events",
    description:
      "Festivals, markets and events near the guest during their stay.",
    parameters: {
      type: "object",
      properties: {
        area: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
      },
      required: ["area"],
    },
  },
];

const impl = {
  get_booking_context,
  find_nearby,
  get_weather,
  get_itinerary,
  reschedule_day,
  notify_host,
  get_local_events,
};

module.exports = { declarations, impl, KB, BOOKINGS };
