import { NextResponse } from "next/server";

/**
 * Turn a photo into trip preferences.
 *
 * The guest uploads something that looks like the trip they want — a
 * waterfall, a beach at dusk, a busy café — and we read it for taste rather
 * than for objects. "There is water in this image" is useless; "this person
 * wants nature over nightlife" is the whole point.
 *
 * This used to POST to the Node backend, which is not deployed, so the
 * feature did nothing in production.
 *
 * Model choice took a few attempts and the reasons matter:
 *
 *   CLIP zero-shot would have been the natural fit — score an image against
 *   our own tag vocabulary, no free-form output to map back. But
 *   api-inference.huggingface.co is retired, and the router reports CLIP as
 *   "not supported by provider hf-inference". Zero-shot image classification
 *   has no live provider on this account at all.
 *
 *   So: a small vision-language model, asked to pick from the same closed
 *   vocabulary. gemma-3-4b-it is the lightest one this token can reach that
 *   handles images, and it is the tag list rather than the model that keeps
 *   the output usable.
 */

const MODEL = process.env.HF_IMAGE_MODEL || "google/gemma-3-4b-it";
const HF_URL = "https://router.huggingface.co/v1/chat/completions";

/** The recommender only understands these, so the model may only return these. */
const VOCAB = {
  vibes: [
    "Nightlife & Clubs",
    "Party & Social",
    "Beach & Chill",
    "Peaceful & Relaxing",
    "Nature & Adventure",
    "Family Friendly",
    "Romantic & Couple",
  ],
  activities: [
    "Water Sports",
    "Boating & Kayaking",
    "Yachts & Sailing",
    "Casino & Entertainment",
    "Nature & Adventure",
    "Cycling & Exploring",
    "Nightlife & Experiences",
  ],
  food: [
    "Non-Vegetarian",
    "Pure Vegetarian",
    "Seafood",
    "North Indian",
    "Authentic Goan",
    "International & Café Food",
    "Desserts & Bakeries",
  ],
};

const PROMPT = `You read a traveller's photo and infer what kind of Goa trip they want.

Reply with ONLY a JSON object, no prose and no code fence:
{"vibes":[],"activities":[],"food":[]}

Choose only from these exact strings.
Vibes: ${VOCAB.vibes.join(", ")}.
Activities: ${VOCAB.activities.join(", ")}.
Food: ${VOCAB.food.join(", ")}.

At most three per list, strongest first. Leave a list empty rather than
guessing — a landscape photo says nothing about food.`;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Scored = { tag: string; confidence: number };

/** Model output is untrusted: keep only strings that are in the vocabulary. */
function clean(values: unknown, allowed: string[]): Scored[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: Scored[] = [];
  values.forEach((v, i) => {
    if (typeof v !== "string") return;
    const tag = allowed.find((a) => a.toLowerCase() === v.trim().toLowerCase());
    if (!tag || seen.has(tag)) return;
    seen.add(tag);
    // Ranked, not scored — the model gives an order, not probabilities, and
    // inventing a number here would be dressing a guess up as a measurement.
    out.push({ tag, confidence: Math.round((0.9 - i * 0.15) * 100) / 100 });
  });
  return out.slice(0, 3);
}

export async function POST(req: Request) {
  const token = process.env.HF_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: "Photo analysis is not configured on this deployment." },
      { status: 503 },
    );

  let body: { image?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const raw = (body.image || "").replace(/^data:[^;]+;base64,/, "");
  if (!raw)
    return NextResponse.json({ error: "No image supplied" }, { status: 400 });

  // A phone photo can be enormous; a clear message beats a 413 from upstream.
  if (raw.length > 8_000_000)
    return NextResponse.json(
      { error: "That image is too large — try one under 5MB." },
      { status: 413 },
    );

  const dataUrl = `data:${body.mimeType || "image/jpeg"};base64,${raw}`;

  let res: Response;
  try {
    res = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch (e) {
    console.error("HF unreachable", e);
    return NextResponse.json(
      { error: "Couldn't reach the vision model. Try again." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("HF error", res.status, detail.slice(0, 250));
    return NextResponse.json(
      {
        error:
          res.status === 429
            ? "The vision model is busy. Try again in a moment."
            : "Couldn't read that image. Try another one.",
      },
      { status: 502 },
    );
  }

  const json = await res.json().catch(() => null);
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content)
    return NextResponse.json(
      { error: "The vision model returned nothing." },
      { status: 502 },
    );

  // It fences the JSON about half the time, whatever the prompt says.
  const match = content.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown> = {};
  try {
    parsed = match ? JSON.parse(match[0]) : {};
  } catch {
    console.error("HF returned unparseable JSON", content.slice(0, 200));
    return NextResponse.json(
      { error: "Couldn't make sense of that image. Try another one." },
      { status: 502 },
    );
  }

  const result = {
    vibes: clean(parsed.vibes, VOCAB.vibes),
    activities: clean(parsed.activities, VOCAB.activities),
    food: clean(parsed.food, VOCAB.food),
    stays: [] as Scored[],
  };

  if (!result.vibes.length && !result.activities.length && !result.food.length)
    return NextResponse.json(
      { error: "Nothing recognisable in that one — try a clearer photo." },
      { status: 422 },
    );

  return NextResponse.json(result);
}
