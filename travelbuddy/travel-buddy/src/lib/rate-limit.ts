import { kvIncr } from "./store";

/**
 * Fixed-window limit per client per minute. The routes behind this spend
 * paid search credits, so an open endpoint is a budget anyone can drain.
 * Fails open when the store is unreachable — the credit caps still hold.
 */
export async function withinLimit(
  req: Request,
  scope: string,
  perMinute: number,
): Promise<boolean> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const minute = Math.floor(Date.now() / 60000);
  const n = await kvIncr(`rl:${scope}:${ip}:${minute}`, 120);
  return n === null || n <= perMinute;
}
