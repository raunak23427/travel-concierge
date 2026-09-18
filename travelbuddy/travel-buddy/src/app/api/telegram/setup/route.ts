import { NextResponse } from "next/server";
import { setCommands, setWebhook, telegramConfigured } from "@/lib/telegram";
import { storeIsDurable } from "@/lib/store";

/**
 * One-shot bot registration, so setting this up is a single request rather
 * than hand-assembled curl against api.telegram.org with a token in the shell
 * history. Registers the webhook and the command menu together.
 *
 * Guarded by CRON_SECRET because calling it repoints the bot at an arbitrary
 * URL — that is a hijack, not a convenience.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!telegramConfigured())
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is not set on this deployment." },
      { status: 503 },
    );

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret)
    return NextResponse.json(
      {
        error:
          "TELEGRAM_WEBHOOK_SECRET is not set. Without it anyone could post fake updates to the bot.",
      },
      { status: 503 },
    );

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${req.headers.get("host") ?? ""}`;
  const url = `${base.replace(/\/$/, "")}/api/telegram`;

  const hook = await setWebhook(url, webhookSecret);
  if (!hook)
    return NextResponse.json(
      { error: "Telegram rejected the webhook registration." },
      { status: 502 },
    );

  await setCommands();

  return NextResponse.json({
    ok: true,
    webhook: url,
    durableStorage: storeIsDurable,
    warning: storeIsDurable
      ? undefined
      : "Storage is in-memory — trip links will be lost on cold start. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
  });
}
