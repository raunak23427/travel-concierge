import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Groq-backed assistant.
 *
 * The key never reaches the browser: the client posts its question plus a
 * snapshot of the live trip, and this route assembles the prompt server-side
 * from assistant-skill.md and that snapshot. Because the snapshot is sent
 * with every message, the assistant's context follows the itinerary — swap a
 * restaurant on the Replace sheet and the next answer already knows.
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

type Ctx = {
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
};

/** Render the trip as compact prose — cheaper and clearer than raw JSON. */
function describeTrip(c: Ctx): string {
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

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "Assistant is not configured on this deployment." },
      { status: 503 },
    );

  let body: {
    question?: string;
    history?: { role: string; text: string }[];
    context?: Ctx;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const question = (body.question || "").trim();
  if (!question)
    return NextResponse.json(
      { error: "Ask me something first." },
      { status: 400 },
    );

  const skill = await loadSkill();
  const system = `${skill}\n\n---\n\n## This guest's trip, as it stands right now\n\n${describeTrip(body.context || {})}`;

  // Keep the last few turns so follow-ups make sense, without unbounded growth.
  const history = (body.history || []).slice(-8).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.text,
  }));

  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 600,
        messages: [
          { role: "system", content: system },
          ...history,
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("Groq error", r.status, detail.slice(0, 300));
      return NextResponse.json(
        { error: "The assistant is busy right now. Try again in a moment." },
        { status: 502 },
      );
    }

    const j = await r.json();
    const answer = j?.choices?.[0]?.message?.content?.trim();
    if (!answer)
      return NextResponse.json(
        { error: "No answer came back." },
        { status: 502 },
      );

    return NextResponse.json({ answer });
  } catch (e) {
    console.error("Groq request failed", e);
    return NextResponse.json(
      {
        error:
          "Couldn't reach the assistant. Check your connection and try again.",
      },
      { status: 502 },
    );
  }
}
