import { NextResponse } from "next/server";
import {
  telegram,
  answerCallback,
  sendChatAction,
  toTelegramHtml,
  escapeHtml,
  telegramConfigured,
} from "@/lib/telegram";
import {
  linkChat,
  readSnapshot,
  tripIdForChat,
  tripIdForToken,
  touchLink,
  unlinkChat,
} from "@/lib/trip-link";
import {
  kvGet,
  kvSet,
  kvDel,
  kvGetJSON,
  kvSetJSON,
  storeIsDurable,
} from "@/lib/store";
import { ask, contextFromSnapshot, AssistantError } from "@/lib/assistant";
import {
  formatDay,
  formatStop,
  istNow,
  readableDate,
  rupees,
  scheduleFor,
  tripDayFor,
} from "@/lib/trip-schedule";

/**
 * The Telegram bot.
 *
 * Two jobs: answer questions about the trip using the same assistant the app
 * uses, and respond to a handful of commands that are faster than asking.
 *
 * The route always replies 200, even on failure. Telegram retries any non-2xx
 * delivery, so returning 500 on a bad update turns one broken message into a
 * retry storm that replies to the guest repeatedly.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const muteKey = (chatId: number | string) => `mute:${chatId}`;
const historyKey = (chatId: number | string) => `hist:${chatId}`;
const HISTORY_TTL = 60 * 60 * 12;

const TELEGRAM_STYLE = `
## Answering over Telegram

You are replying inside a chat app, on a phone, to someone who may be walking
down a beach road. Keep it under 120 words unless they ask for detail. No
tables, no headings, no markdown links. Short paragraphs or a few bullet lines.
Give the answer first; context after, only if it helps.

Never invent a stop that is not in their itinerary — if they ask for something
that is not planned, say so and suggest what you would swap it for.
`.trim();

type TgUser = { id: number; first_name?: string };
type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
};
type TgUpdate = {
  message?: TgMessage;
  callback_query?: {
    id: string;
    from: TgUser;
    data?: string;
    message?: TgMessage;
  };
};

const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || "https://travel-concierge-pi.vercel.app";

async function readHistory(chatId: number) {
  return (
    (await kvGetJSON<{ role: string; text: string }[]>(historyKey(chatId))) ??
    []
  );
}

async function pushHistory(chatId: number, role: string, text: string) {
  const history = await readHistory(chatId);
  history.push({ role, text });
  await kvSetJSON(historyKey(chatId), history.slice(-8), HISTORY_TTL);
}

/** Every reply needs the trip; this centralises the "not linked yet" path. */
async function requireTrip(chatId: number) {
  const tripId = await tripIdForChat(chatId);
  if (!tripId) return null;
  // Every interaction pushes the expiry back out, so an in-use link never
  // lapses underneath the guest.
  void touchLink(chatId, tripId);
  return readSnapshot(tripId);
}

const NOT_LINKED =
  "I'm not following a trip for you yet.\n\n" +
  "Open TravelBuddy, confirm your plan, then tap <b>Connect Telegram</b> on the Plan tab. " +
  "That link brings your whole itinerary in here.";

async function handleCommand(
  chatId: number,
  command: string,
  argument: string,
  firstName?: string,
): Promise<boolean> {
  switch (command) {
    case "/start": {
      if (!argument) {
        await telegram.send(
          chatId,
          `Hello${firstName ? ` ${escapeHtml(firstName)}` : ""} 👋\n\n` +
            "I'm your Goa trip guide. I'll nudge you before each stop, answer anything about your plan, " +
            "and keep track of what's next.\n\n" +
            NOT_LINKED,
          {
            keyboard: [[{ text: "Open TravelBuddy", url: appUrl() }]],
          },
        );
        return true;
      }
      const tripId = await tripIdForToken(argument);
      if (!tripId) {
        // Saying "expired" here was actively misleading. With no durable
        // store the token was very likely never readable by THIS instance,
        // which is a deployment problem, not something the guest did.
        await telegram.send(
          chatId,
          storeIsDurable
            ? "That invite link has expired. Open the Plan tab in TravelBuddy and tap <b>Connect Telegram</b> again for a fresh one."
            : "I couldn't read that invite.\n\n<b>This deployment has no database configured</b>, so invites only survive for a few minutes. Ask whoever set the app up to add the storage keys — then links last for good.",
        );
        return true;
      }
      await linkChat(chatId, tripId);
      const snapshot = await readSnapshot(tripId);
      const trip = snapshot?.trip;
      await telegram.send(
        chatId,
        `✅ Connected to <b>${escapeHtml(trip?.name || "your Goa trip")}</b>.\n\n` +
          (trip?.startDate
            ? `${escapeHtml(readableDate(trip.startDate))} → ${escapeHtml(readableDate(trip.endDate))}\n`
            : "") +
          `${trip?.days?.length || 0} days planned.\n\n` +
          "I'll message you before each stop. Ask me anything — where to eat, what to wear, how long the drive is.\n\n" +
          "Share this same link with whoever you're travelling with and they'll get the updates too.",
        {
          keyboard: [
            [
              { text: "Today's plan", data: "today" },
              { text: "What's next", data: "next" },
            ],
          ],
        },
      );
      return true;
    }

    case "/help":
      await telegram.send(
        chatId,
        "<b>What I can do</b>\n\n" +
          "• /today — everything on for today\n" +
          "• /next — your next stop\n" +
          "• /plan — the full itinerary\n" +
          "• /budget — what it all costs\n" +
          "• /mute and /unmute — pause the nudges\n" +
          "• /stop — unlink this trip\n\n" +
          "Or just ask me. <i>“is Baga good for breakfast?”</i>, " +
          "<i>“how far is Dudhsagar from the hotel?”</i>, <i>“what should I wear tonight?”</i>",
      );
      return true;

    case "/stop":
      await unlinkChat(chatId);
      await kvDel(historyKey(chatId));
      await telegram.send(
        chatId,
        "Unlinked. I won't message you about this trip again.\n\nTap <b>Connect Telegram</b> in the app whenever you want me back.",
      );
      return true;

    case "/mute":
      await kvSet(muteKey(chatId), "1");
      await telegram.send(
        chatId,
        "🔕 Notifications paused. You can still ask me anything — /unmute brings the nudges back.",
      );
      return true;

    case "/unmute":
      await kvDel(muteKey(chatId));
      await telegram.send(chatId, "🔔 Notifications back on.");
      return true;
  }

  // Everything below needs a linked trip.
  const snapshot = await requireTrip(chatId);
  if (!snapshot) {
    await telegram.send(chatId, NOT_LINKED, {
      keyboard: [[{ text: "Open TravelBuddy", url: appUrl() }]],
    });
    return true;
  }
  const trip = snapshot.trip;

  switch (command) {
    case "/today": {
      const now = istNow();
      const day = tripDayFor(trip, now.date);
      if (!day) {
        const first = trip.days?.[0];
        await telegram.send(
          chatId,
          `You're not in Goa today — the trip starts ${escapeHtml(readableDate(trip.startDate))}.\n\n` +
            (first
              ? formatDay(trip, first.day, `First day: ${first.title}`)
              : ""),
        );
        return true;
      }
      await telegram.send(chatId, formatDay(trip, day, `Today — day ${day}`), {
        keyboard: [[{ text: "What's next", data: "next" }]],
      });
      return true;
    }

    case "/next": {
      const upcoming = scheduleFor(trip).find((s) => s.startsAt > Date.now());
      if (!upcoming) {
        await telegram.send(
          chatId,
          "Nothing left on the schedule — that's the trip done. Hope it was a good one. 🌴",
        );
        return true;
      }
      const minutes = Math.round((upcoming.startsAt - Date.now()) / 60000);
      const when =
        minutes < 60
          ? `in ${minutes} min`
          : minutes < 60 * 24
            ? `in about ${Math.round(minutes / 60)} h`
            : `on ${readableDate(upcoming.date)}`;
      await telegram.send(
        chatId,
        `<b>Next up, ${escapeHtml(when)}</b>\n\n${formatStop(upcoming.activity)}`,
      );
      return true;
    }

    case "/plan": {
      const blocks = (trip.days || []).map((d) => formatDay(trip, d.day));
      await telegram.send(
        chatId,
        `<b>${escapeHtml(trip.name || `Trip to ${trip.destination}`)}</b>\n\n` +
          blocks.join("\n\n──────────\n\n"),
      );
      return true;
    }

    case "/budget": {
      const items = (trip.days || []).flatMap((d) => d.items || []);
      const activities = items.reduce((sum, i) => sum + (i.cost || 0), 0);
      const stay = trip.hotel?.totalCost || 0;
      const byType = new Map<string, number>();
      for (const item of items)
        byType.set(item.type, (byType.get(item.type) || 0) + (item.cost || 0));
      const lines = [...byType.entries()]
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `• ${k}: <b>${rupees(v)}</b>`);
      await telegram.send(
        chatId,
        "<b>Estimated cost</b>\n\n" +
          (stay ? `• stay: <b>${rupees(stay)}</b>\n` : "") +
          lines.join("\n") +
          `\n\nTotal: <b>${rupees(activities + stay)}</b>` +
          `\n\n<i>Estimates from your plan — not a bill.</i>`,
      );
      return true;
    }
  }

  return false;
}

async function handleQuestion(chatId: number, question: string) {
  const snapshot = await requireTrip(chatId);
  await sendChatAction(chatId);

  const now = istNow();
  const context = snapshot
    ? {
        ...contextFromSnapshot(snapshot),
        today: {
          day: tripDayFor(snapshot.trip, now.date) ?? 0,
          date: now.date,
          localTime: now.localTime,
        },
      }
    : {};

  try {
    const answer = await ask({
      question,
      history: await readHistory(chatId),
      context,
      extraSystem: TELEGRAM_STYLE,
      maxTokens: 1600,
    });
    await pushHistory(chatId, "user", question);
    await pushHistory(chatId, "assistant", answer);
    await telegram.send(chatId, toTelegramHtml(answer));
  } catch (e) {
    const message =
      e instanceof AssistantError
        ? e.message
        : "Something went wrong on my side. Try again in a moment.";
    await telegram.send(chatId, escapeHtml(message));
  }
}

export async function POST(req: Request) {
  if (!telegramConfigured())
    return NextResponse.json({ ok: true, skipped: "no bot token" });

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    // Not Telegram. Say nothing useful.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.callback_query) {
      const query = update.callback_query;
      const chatId = query.message?.chat.id ?? query.from.id;
      await answerCallback(query.id);
      if (query.data)
        await handleCommand(
          chatId,
          `/${query.data}`,
          "",
          query.from.first_name,
        );
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const text = message?.text?.trim();
    if (!message || !text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;

    if (text.startsWith("/")) {
      // "/start abc123" and "/start@MyBot abc123" both arrive here.
      const [rawCommand, ...rest] = text.split(/\s+/);
      const command = rawCommand.split("@")[0].toLowerCase();
      const handled = await handleCommand(
        chatId,
        command,
        rest.join(" ").trim(),
        message.from?.first_name,
      );
      if (handled) return NextResponse.json({ ok: true });
      // An unknown slash command is almost always a question phrased oddly.
    }

    await handleQuestion(chatId, text);
  } catch (e) {
    // Swallow deliberately: a thrown error means a Telegram retry, which means
    // the guest gets the same reply two or three times.
    console.error("[telegram] update failed", e);
  }

  return NextResponse.json({ ok: true });
}

/** Lets you confirm the route is live without opening Telegram. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: telegramConfigured(),
    secured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
  });
}
