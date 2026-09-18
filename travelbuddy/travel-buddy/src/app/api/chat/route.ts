import { NextResponse } from "next/server";
import { ask, AssistantError, type Ctx, type Turn } from "@/lib/assistant";

/**
 * In-app assistant.
 *
 * The key never reaches the browser: the client posts its question plus a
 * snapshot of the live trip, and the shared assistant assembles the prompt
 * server-side. Because the snapshot travels with every message, the context
 * follows the itinerary — swap a restaurant on the Replace sheet and the next
 * answer already knows. The Telegram bot calls the same ask().
 */

export async function POST(req: Request) {
  let body: { question?: string; history?: Turn[]; context?: Ctx };
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

  try {
    const answer = await ask({
      question,
      history: body.history || [],
      context: body.context || {},
    });
    return NextResponse.json({ answer });
  } catch (e) {
    const error =
      e instanceof AssistantError
        ? e
        : new AssistantError("Something went wrong.", 500);
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
}
