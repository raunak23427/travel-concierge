/**
 * The small amount of state that has to outlive the browser.
 *
 * Everything the web app knows lives in localStorage, which is fine until a
 * bot needs it: a Telegram webhook arrives on a server with nothing but a chat
 * id, and localStorage is on a phone somewhere. So the trip snapshot, the
 * invite tokens and the chat bindings live here instead.
 *
 * Backed by Upstash Redis over REST — no TCP, no connection pool, which is what
 * serverless wants. Without credentials it falls back to a process-local Map so
 * `npm run dev` works out of the box; that fallback is explicitly NOT durable
 * and says so loudly, because a serverless instance can vanish between two
 * requests and take the "database" with it.
 */

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeIsDurable = Boolean(URL_ && TOKEN);

/** Dev-only stand-in. Values are whole Redis values; sets are string arrays. */
const memory = new Map<string, { value: string; expires: number }>();
const memorySets = new Map<string, Set<string>>();

let warned = false;
function warnOnce() {
  if (warned || storeIsDurable) return;
  warned = true;
  console.warn(
    "[store] UPSTASH_REDIS_REST_URL / _TOKEN are not set — using in-memory storage. " +
      "Trip links will not survive a restart or a cold start.",
  );
}

type Command = (string | number)[];

async function run<T>(command: Command): Promise<T | null> {
  warnOnce();
  if (!storeIsDurable) return null;
  try {
    const res = await fetch(URL_!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[store] command failed", command[0], res.status);
      return null;
    }
    const json = (await res.json()) as { result?: T; error?: string };
    if (json.error) {
      console.error("[store]", command[0], json.error);
      return null;
    }
    return (json.result ?? null) as T | null;
  } catch (e) {
    console.error("[store] unreachable", command[0], e);
    return null;
  }
}

function sweep(key: string) {
  const hit = memory.get(key);
  if (hit && hit.expires && hit.expires < Date.now()) memory.delete(key);
}

export async function kvGet(key: string): Promise<string | null> {
  if (!storeIsDurable) {
    warnOnce();
    sweep(key);
    return memory.get(key)?.value ?? null;
  }
  return run<string>(["GET", key]);
}

export async function kvSet(
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<void> {
  if (!storeIsDurable) {
    warnOnce();
    memory.set(key, {
      value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
    });
    return;
  }
  await run(
    ttlSeconds ? ["SET", key, value, "EX", ttlSeconds] : ["SET", key, value],
  );
}

export async function kvDel(key: string): Promise<void> {
  if (!storeIsDurable) {
    memory.delete(key);
    return;
  }
  await run(["DEL", key]);
}

/** Set a key only if absent. Returns true when this call was the one that set it. */
export async function kvSetIfAbsent(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> {
  if (!storeIsDurable) {
    warnOnce();
    sweep(key);
    if (memory.has(key)) return false;
    memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    return true;
  }
  const result = await run<string>(["SET", key, value, "EX", ttlSeconds, "NX"]);
  return result === "OK";
}

export async function kvSAdd(key: string, member: string): Promise<void> {
  if (!storeIsDurable) {
    const set = memorySets.get(key) ?? new Set<string>();
    set.add(member);
    memorySets.set(key, set);
    return;
  }
  await run(["SADD", key, member]);
}

export async function kvSRem(key: string, member: string): Promise<void> {
  if (!storeIsDurable) {
    memorySets.get(key)?.delete(member);
    return;
  }
  await run(["SREM", key, member]);
}

export async function kvSMembers(key: string): Promise<string[]> {
  if (!storeIsDurable) return [...(memorySets.get(key) ?? [])];
  return (await run<string[]>(["SMEMBERS", key])) ?? [];
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSetJSON(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  await kvSet(key, JSON.stringify(value), ttlSeconds);
}
