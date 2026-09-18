/**
 * Telegram transport.
 *
 * Deliberately shaped as a Notifier rather than called directly, because
 * WhatsApp is the platform most of our guests actually use and we expect to add
 * it once business verification clears. Everything above this file — the
 * scheduler, the assistant — talks to the interface, not to Telegram.
 */

export interface Notifier {
  send(
    to: string | number,
    text: string,
    options?: SendOptions,
  ): Promise<boolean>;
}

export type SendOptions = {
  /** Inline buttons, laid out one row per inner array. */
  keyboard?: { text: string; url?: string; data?: string }[][];
  silent?: boolean;
};

// Telegram supports self-hosted Bot API servers, so the host is configurable
// rather than hardcoded. It also lets the bot be driven against a stub.
const API = (method: string) =>
  `${process.env.TELEGRAM_API_BASE || "https://api.telegram.org"}/bot${
    process.env.TELEGRAM_BOT_TOKEN
  }/${method}`;

export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);

async function call<T>(
  method: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  if (!telegramConfigured()) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN is not set");
    return null;
  }
  try {
    const res = await fetch(API(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      console.error("[telegram]", method, res.status, json?.description);
      return null;
    }
    return json.result as T;
  } catch (e) {
    console.error("[telegram] unreachable", method, e);
    return null;
  }
}

/**
 * Telegram's HTML mode accepts a small tag set and rejects stray angle
 * brackets, so escape everything that is not one of our own tags. A restaurant
 * called "Fisherman's Wharf & Co" should not 400 the whole message.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The model writes Markdown; Telegram's HTML mode is far more forgiving than
 * its Markdown parsers, so convert the few things that matter and drop the
 * rest rather than risking an unparseable message.
 */
export function toTelegramHtml(markdown: string): string {
  return (
    escapeHtml(markdown)
      // Bullets first: "* item" must not be read as the start of an emphasis run.
      .replace(/^\s*[-*]\s+/gm, "• ")
      .replace(/^#{1,6}\s*(.+)$/gm, "<b>$1</b>")
      // [\s\S] rather than the /s flag, which this tsconfig's target rejects.
      .replace(/\*\*([\s\S]+?)\*\*/g, "<b>$1</b>")
      .replace(/\*([^*\n]+)\*/g, "<i>$1</i>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
  );
}

/**
 * Telegram rejects anything over 4096 characters. Split on line boundaries
 * where possible, and hard-split any single line that is itself too long —
 * a full /plan for a long trip genuinely exceeds the limit, and dropping the
 * tail would silently lose days off the end of someone's itinerary.
 */
export function chunk(text: string, limit = 3800): string[] {
  if (text.length <= limit) return [text];
  const parts: string[] = [];
  let current = "";

  const flush = () => {
    if (current) parts.push(current);
    current = "";
  };

  for (const line of text.split("\n")) {
    if (line.length > limit) {
      flush();
      for (let i = 0; i < line.length; i += limit)
        parts.push(line.slice(i, i + limit));
      continue;
    }
    if (current && current.length + 1 + line.length > limit) flush();
    current = current ? `${current}\n${line}` : line;
  }

  flush();
  return parts;
}

export const telegram: Notifier = {
  async send(to, text, options) {
    let ok = true;
    for (const part of chunk(text)) {
      const result = await call<unknown>("sendMessage", {
        chat_id: to,
        text: part,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        disable_notification: options?.silent ?? false,
        ...(options?.keyboard
          ? {
              reply_markup: {
                inline_keyboard: options.keyboard.map((row) =>
                  row.map((b) => ({
                    text: b.text,
                    ...(b.url ? { url: b.url } : { callback_data: b.data }),
                  })),
                ),
              },
            }
          : {}),
      });
      if (!result) ok = false;
    }
    return ok;
  },
};

/** Stops the button's spinner. Telegram nags if this is never called. */
export async function answerCallback(id: string, text?: string) {
  await call("answerCallbackQuery", { callback_query_id: id, text });
}

export async function sendChatAction(chatId: string | number) {
  await call("sendChatAction", { chat_id: chatId, action: "typing" });
}

export async function setWebhook(url: string, secret: string) {
  return call<unknown>("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function setCommands() {
  return call<unknown>("setMyCommands", {
    commands: [
      { command: "today", description: "What's on today" },
      { command: "next", description: "Your next stop" },
      { command: "plan", description: "The whole itinerary" },
      { command: "budget", description: "What the trip costs" },
      { command: "mute", description: "Pause notifications" },
      { command: "unmute", description: "Resume notifications" },
      { command: "stop", description: "Unlink this trip" },
      { command: "help", description: "How to use this bot" },
    ],
  });
}
