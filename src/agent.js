/**
 * Sarathi — agent loop.
 *
 * This is the difference between a chatbot and an agent: the model is given a
 * tool surface and runs a multi-turn loop, calling tools and reasoning over the
 * results until it can answer. Nothing is retrieved-and-stuffed; the model
 * decides what to look up.
 */

const path = require("path");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const { declarations, impl } = require("./tools");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const MODEL = process.env.SARATHI_MODEL || "gemini-2.5-flash";
const MAX_STEPS = 8;

let client = null;
function getClient() {
  if (client) return client;
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VERTEX_API_KEY ||
    ""
  ).trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in sarathi/.env");
  client = new GoogleGenAI({ apiKey });
  return client;
}

const SYSTEM = `You are Sarathi, the in-trip concierge for a Wayzyy homestay guest in Goa.

RULES
1. Never name a venue, price or distance that did not come back from a tool. If a tool returned nothing, say so.
2. Always call get_booking_context first if you do not yet know where the guest is staying.
3. When weather is bad, search with monsoon_safe true.
4. Before changing a plan, call reschedule_day and report the actual diff it returns.
5. Reply in plain WhatsApp prose. Short. No markdown, no headers, no bullet characters, no lists.
6. Lead with ONE recommendation and why it suits them right now, then name one alternative in the same breath. Two to four sentences, warm and direct, like a friend who lives there.`;

/** Free-tier friendly: retry on 429 with the delay the API asks for, then fall back. */
async function generateWithRetry(ai, req, attempt = 0) {
  try {
    return await ai.models.generateContent({ ...req, model: MODEL });
  } catch (err) {
    const msg = String(err?.message || "");
    const is429 = err?.status === 429 || msg.includes("RESOURCE_EXHAUSTED");
    if (!is429 || attempt >= 4) throw err;
    const m = msg.match(/"retryDelay":"(\d+)s"/);
    const waitMs = (m ? parseInt(m[1], 10) + 2 : 20) * 1000;
    process.stdout.write(
      `\x1b[2m  … rate-limited, waiting ${Math.round(waitMs / 1000)}s\x1b[0m\n`,
    );
    await new Promise((r) => setTimeout(r, waitMs));
    return generateWithRetry(ai, req, attempt + 1);
  }
}

/**
 * Run the agent to completion.
 * @returns {{reply: string, trace: Array}}
 */
async function run(userMessage, { bookingId, today, onStep } = {}) {
  const ai = getClient();
  const trace = [];

  const contents = [
    {
      role: "user",
      parts: [
        {
          text:
            `${SYSTEM}\n\nContext: booking_id=${bookingId}. Today is ${today}.\n\n` +
            `Guest message: ${userMessage}`,
        },
      ],
    },
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await generateWithRetry(ai, {
      contents,
      config: { tools: [{ functionDeclarations: declarations }] },
    });

    const cand = res.candidates?.[0];
    const parts = cand?.content?.parts || [];
    const calls = parts
      .filter((p) => p.functionCall)
      .map((p) => p.functionCall);

    if (calls.length === 0) {
      const reply = (
        res.text ||
        parts
          .map((p) => p.text)
          .filter(Boolean)
          .join("")
      ).trim();
      return { reply, trace };
    }

    contents.push({ role: "model", parts });

    const responseParts = [];
    for (const call of calls) {
      const fn = impl[call.name];
      const args = call.args || {};
      const started = Date.now();
      let result;
      try {
        result = fn ? fn(args) : { error: `unknown tool ${call.name}` };
      } catch (err) {
        result = { error: String(err.message) };
      }
      const ms = Date.now() - started;

      const entry = { step: step + 1, tool: call.name, args, result, ms };
      trace.push(entry);
      if (onStep) onStep(entry);

      responseParts.push({
        functionResponse: { name: call.name, response: { result } },
      });
    }

    contents.push({ role: "user", parts: responseParts });
  }

  return { reply: "(agent hit step limit)", trace };
}

module.exports = { run, MODEL };
