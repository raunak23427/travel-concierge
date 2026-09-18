import { NextResponse } from "next/server";
import { telegram, escapeHtml, telegramConfigured } from "@/lib/telegram";
import { chatsForTrip, linkedTripIds, readSnapshot } from "@/lib/trip-link";
import { kvGet, kvSetIfAbsent } from "@/lib/store";
import {
  NOTIFY_THRESHOLD,
  describeMove,
  rupees,
  upcomingPriced,
} from "@/lib/pricing";
import {
  dueStops,
  formatDay,
  formatStop,
  istNow,
  readableDate,
  tripDayFor,
} from "@/lib/trip-schedule";

/**
 * The thing that makes this a trip companion rather than a chatbot.
 *
 * Runs every few minutes and asks one question per trip: is there anything the
 * guest should know in the next little while? Three kinds of message —
 * a morning briefing, a nudge before each stop, and a look at tomorrow night.
 *
 * Every send is guarded by a de-duplication key written with SET NX, so a
 * double-fire of the cron, an overlapping run, or a retry cannot send the same
 * nudge twice. That matters more than it sounds: duplicate push at 7am is how
 * people mute a bot forever.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How long before a stop to nudge. Also the window width, so nothing is missed. */
const LEAD_MIN = 45;
const WINDOW_MIN = 20;

const BRIEFING_FROM = 7 * 60 + 30; // 07:30 IST
const BRIEFING_TO = 9 * 60;
const TOMORROW_FROM = 21 * 60; // 21:00 IST
const TOMORROW_TO = 22 * 60 + 30;

const DEDUPE_TTL = 60 * 60 * 36;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Without a secret configured the endpoint is open; fine locally, and the
  // worst an attacker achieves is making us re-check work already deduped.
  if (!secret) return true;
  const header =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

/** Send to everyone following a trip, skipping anyone who muted. */
async function fanOut(tripId: string, text: string, silent = false) {
  const chats = await chatsForTrip(tripId);
  let sent = 0;
  for (const chatId of chats) {
    if (await kvGet(`mute:${chatId}`)) continue;
    if (await telegram.send(chatId, text, { silent })) sent++;
  }
  return sent;
}

/** Claim a notification slot. Returns false if someone already sent it. */
async function claim(key: string) {
  return kvSetIfAbsent(`sent:${key}`, new Date().toISOString(), DEDUPE_TTL);
}

export async function POST(req: Request) {
  if (!authorised(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!telegramConfigured())
    return NextResponse.json({ ok: true, skipped: "no bot token" });

  const now = istNow();
  const nowMs = Date.now();
  const tripIds = await linkedTripIds();
  const report: Record<string, number> = {
    trips: tripIds.length,
    briefings: 0,
    nudges: 0,
    tomorrow: 0,
    priceAlerts: 0,
  };

  for (const tripId of tripIds) {
    const snapshot = await readSnapshot(tripId);
    if (!snapshot) continue;
    const trip = snapshot.trip;
    const today = tripDayFor(trip, now.date);

    // 1. Morning briefing — the whole day, once, early.
    if (
      today !== null &&
      now.minutesOfDay >= BRIEFING_FROM &&
      now.minutesOfDay < BRIEFING_TO &&
      (await claim(`${tripId}:brief:${now.date}`))
    ) {
      const body = formatDay(trip, today, `Good morning — day ${today}`);
      report.briefings += await fanOut(
        tripId,
        `${body}\n\n<i>Ask me anything about today.</i>`,
      );
    }

    // 2. A nudge shortly before each stop.
    for (const { stop, minutesAway } of dueStops(
      trip,
      nowMs,
      LEAD_MIN,
      WINDOW_MIN,
    )) {
      if (
        !(await claim(`${tripId}:stop:${stop.date}:${stop.day}:${stop.index}`))
      )
        continue;

      const rounded = Math.max(1, Math.round(minutesAway / 5) * 5);
      report.nudges += await fanOut(
        tripId,
        `⏰ <b>In about ${rounded} minutes</b>\n\n${formatStop(stop.activity)}`,
      );
    }

    // 3. Price movement on anything still ahead of them.
    //
    // The browser runs the same model over the same itinerary, so the figure
    // quoted here is the figure the app is showing. Claimed once per stop per
    // price, which is what stops a surge being announced every sweep.
    for (const priced of upcomingPriced(trip, nowMs)) {
      if (priced.base <= 0) continue;
      // Same bar as the in-app panel, so the two never disagree about what
      // counts as newsworthy.
      if (Math.abs(priced.delta) < NOTIFY_THRESHOLD) continue;
      if (!(await claim(`${tripId}:price:${priced.key}:${priced.price}`)))
        continue;

      const { title, message } = describeMove(priced);
      const arrow = priced.delta > 0 ? "📈" : "📉";
      report.priceAlerts += await fanOut(
        tripId,
        `${arrow} <b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}` +
          `\n\n<i>Planned at ${escapeHtml(rupees(priced.base))}.</i>`,
        priced.delta < 0, // a drop is good news, not something to buzz about
      );
    }

    // 4. Tomorrow, the night before — quietly.
    const tomorrow = new Date(`${now.date}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowDate = tomorrow.toISOString().slice(0, 10);
    const tomorrowDay = tripDayFor(trip, tomorrowDate);
    if (
      tomorrowDay !== null &&
      now.minutesOfDay >= TOMORROW_FROM &&
      now.minutesOfDay < TOMORROW_TO &&
      (await claim(`${tripId}:eve:${now.date}`))
    ) {
      report.tomorrow += await fanOut(
        tripId,
        formatDay(
          trip,
          tomorrowDay,
          `Tomorrow — ${escapeHtml(readableDate(tomorrowDate))}`,
        ),
        true,
      );
    }
  }

  return NextResponse.json({ ok: true, at: now.localTime, ...report });
}

/** GET behaves identically, so a plain cron URL works. */
export async function GET(req: Request) {
  return POST(req);
}
