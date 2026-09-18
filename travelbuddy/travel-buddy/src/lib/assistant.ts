import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TripSnapshot } from "./trip-link";

/**
 * The assistant, independent of how the question arrived.
 *
 * Both the in-app chat and the Telegram bot call ask() with the same trip
 * shape, so there is exactly one prompt, one skill file and one model. When
 * the itinerary changes the snapshot changes, and every surface picks it up on
 * the next message — no cache to invalidate.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Chosen from what this key can actually reach — llama-3.3 is not on the
// account. Verified against GET /openai/v1/models.
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

let cachedSkill: string | null = null;
async function loadSkill(): Promise<string> {
  if (cachedSkill) return cachedSkill;
  try {
    cachedSkill = await readFile(
      path.join(process.cwd(), "src/data/assistant-skill.md"),
      "utf8",
    );
  } catch {
    cachedSkill = "You are the TravelBuddy assistant for trips to Goa, India.";
  }
  return cachedSkill;
}

export type Ctx = {
  destination?: string;
  stay?: Record<string, unknown>;
  budget?: Record<string, unknown>;
  transportModes?: string[];
  profileTags?: Record<string, string[]>;
  days?: {
    day: number;
    title: string;
    items?: {
      time?: string;
      activity?: string;
      description?: string;
      cost?: number;
      type?: string;
    }[];
  }[];
  totalCost?: number;
  booked?: boolean;
  /** Set for chat surfaces where the guest is mid-trip right now. */
  today?: { day: number; date: string; localTime: string };
};

/** Render the trip as compact prose — cheaper and clearer than raw JSON. */
export function describeTrip(c: Ctx): string {
  if (!c || Object.keys(c).length === 0)
    return "The guest has not planned a trip yet. Help them get started, and ask what kind of trip they want if it would help.";

  const out: string[] = [];
  out.push(`Destination: ${c.destination || "Goa, India"}.`);

  if (c.stay) {
    const s = c.stay as Record<string, string | number>;
    const bits: string[] = [];
    if (s.property) bits.push(String(s.property));
    if (s.area) bits.push(String(s.area));
    if (bits.length) out.push(`Staying at ${bits.join(", ")}.`);
    if (s.checkIn && s.checkOut)
      out.push(
        `Stay ${s.checkIn} to ${s.checkOut} (${s.nights ?? "?"} nights, ${s.guests ?? "?"} guests).`,
      );
    if (s.arriveGoa && s.departGoa && s.arriveGoa !== s.checkIn)
      out.push(`In Goa ${s.arriveGoa} to ${s.departGoa}.`);
  }

  if (c.budget) {
    const b = c.budget as Record<string, number>;
    const parts = Object.entries(b)
      .filter(([k]) => k !== "total")
      .map(([k, v]) => `${k} ₹${Number(v).toLocaleString("en-IN")}`);
    if (parts.length)
      out.push(
        `Budget: ${parts.join(", ")}${b.total ? ` (total ₹${Number(b.total).toLocaleString("en-IN")})` : ""}. Keep suggestions inside these.`,
      );
  }

  if (c.transportModes?.length)
    out.push(
      `Getting about by: ${c.transportModes.join(", ")}. Do not assume any other mode.`,
    );

  if (c.profileTags) {
    const t = Object.entries(c.profileTags)
      .filter(([, v]) => Array.isArray(v) && v.length)
      .map(([k, v]) => `${k}: ${(v as string[]).slice(0, 8).join(", ")}`);
    if (t.length) out.push(`Travel profile — ${t.join("; ")}.`);
  }

  if (c.today)
    out.push(
      `Right now it is ${c.today.localTime} on ${c.today.date}, which is day ${c.today.day} of this trip. Answer as if you are with them today.`,
    );

  if (c.days?.length) {
    out.push("", "Current itinerary:");
    for (const d of c.days) {
      out.push(`Day ${d.day} — ${d.title}`);
      for (const it of d.items || []) {
        const cost = it.cost ? ` (₹${it.cost.toLocaleString("en-IN")})` : "";
        out.push(
          `  ${it.time || ""} ${it.activity || ""}${cost}${it.description ? ` — ${it.description}` : ""}`.trim(),
        );
      }
    }
    if (c.totalCost)
      out.push(`Trip total: ₹${Number(c.totalCost).toLocaleString("en-IN")}.`);
  } else {
    out.push("No itinerary generated yet.");
  }

  out.push(
    c.booked
      ? "This trip is booked and confirmed."
      : "This trip is not booked yet.",
  );
  return out.join("\n");
}

/** Build the assistant's view of a trip from a stored snapshot. */
export function contextFromSnapshot(snapshot: TripSnapshot): Ctx {
  const trip = snapshot.trip;
  const days = trip.days || [];
  const activities = days
    .flatMap((d) => d.items || [])
    .reduce((sum, i) => sum + (i.cost || 0), 0);
  return {
    destination: trip.destination,
    stay: trip.hotel
      ? {
          property: trip.planning?.stayProperty || trip.hotel.name,
          area: trip.planning?.stayArea,
          checkIn: trip.startDate,
          checkOut: trip.endDate,
          nights: Math.max(0, days.length - 1),
          guests: trip.travelers,
        }
      : undefined,
    budget: snapshot.budget,
    transportModes: snapshot.transportModes,
    profileTags: snapshot.profileTags,
    days: days.map((d) => ({ day: d.day, title: d.title, items: d.items })),
    totalCost: activities + (trip.hotel?.totalCost || 0),
    booked: Boolean(trip.bookedAt),
  };
}

export type Turn = { role: string; text: string };

export class AssistantError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function ask({
  question,
  history = [],
  context = {},
  extraSystem,
  maxTokens = 2000,
}: {
  question: string;
  history?: Turn[];
  context?: Ctx;
  /** Surface-specific rules, e.g. how to format for a chat app. */
  extraSystem?: string;
  /**
   * gpt-oss is a reasoning model: its private reasoning is billed against this
   * budget before a single visible word is written. A cap that looks generous
   * for the answer alone (600) silently truncated replies mid-word, so this is
   * deliberately large — length is controlled by the prompt, not the cap.
   */
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key)
    throw new AssistantError(
      "Assistant is not configured on this deployment.",
      503,
    );

  const skill = await loadSkill();
  const system = [
    skill,
    "---",
    "## This guest's trip, as it stands right now",
    "",
    describeTrip(context),
    extraSystem ? `\n---\n\n${extraSystem}` : "",
  ].join("\n\n");

  // Keep the last few turns so follow-ups make sense, without unbounded growth.
  const turns = history.slice(-8).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.text,
  }));

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: maxTokens,
        // Keep reasoning cheap; these are short, grounded travel answers.
        reasoning_effort: "low",
        messages: [
          { role: "system", content: system },
          ...turns,
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (e) {
    console.error("Groq request failed", e);
    throw new AssistantError(
      "Couldn't reach the assistant. Check your connection and try again.",
      502,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Groq error", res.status, detail.slice(0, 300));
    throw new AssistantError(
      "The assistant is busy right now. Try again in a moment.",
      502,
    );
  }

  const json = await res.json();
  const answer = json?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new AssistantError("No answer came back.", 502);
  return answer;
}
