import {
  kvDel,
  kvGetJSON,
  kvSAdd,
  kvSetJSON,
  kvSMembers,
  kvSRem,
  kvGet,
  kvSet,
} from "./store";
import type { SavedTrip } from "./trip-updates";

/**
 * Binding a trip to the people following it.
 *
 * One trip, many chats: the guest connects their own Telegram, then shares the
 * same invite link with whoever they are travelling with, and everyone gets the
 * nudges and can ask the assistant. That is why a trip owns a *set* of chats
 * rather than a single id.
 *
 * Keys
 *   trip:<tripId>            the snapshot the bot reasons over
 *   token:<token>            short-lived invite -> tripId
 *   chat:<chatId>            which trip a Telegram chat is following
 *   trip:<tripId>:chats      every chat following that trip
 *   trips:linked             every trip with at least one follower (cron scans this)
 *   sent:<tripId>:<slot>     de-duplication marker for a single notification
 */

export type TripSnapshot = {
  tripId: string;
  /** Written by the browser on every save, so the bot follows edits. */
  updatedAt: string;
  trip: SavedTrip;
  /** Swipe-derived taste tags, so the assistant recommends in character. */
  profileTags?: Record<string, string[]>;
  transportModes?: string[];
  budget?: Record<string, number>;
};

// The invite is how a guest brings companions in, and they may join days
// after the link was made, so it outlives the trip rather than the session.
const TOKEN_TTL = 60 * 60 * 24 * 60;
const SNAPSHOT_TTL = 60 * 60 * 24 * 180;

export const tripKey = (id: string) => `trip:${id}`;
export const tokenKey = (t: string) => `token:${t}`;
export const chatKey = (c: string | number) => `chat:${c}`;
export const tripChatsKey = (id: string) => `trip:${id}:chats`;
export const LINKED_TRIPS = "trips:linked";

export async function saveSnapshot(snapshot: TripSnapshot): Promise<void> {
  await kvSetJSON(tripKey(snapshot.tripId), snapshot, SNAPSHOT_TTL);
}

export async function readSnapshot(
  tripId: string,
): Promise<TripSnapshot | null> {
  return kvGetJSON<TripSnapshot>(tripKey(tripId));
}

/** URL-safe, unguessable, short enough to read aloud. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function issueToken(tripId: string): Promise<string> {
  const token = newToken();
  await kvSet(tokenKey(token), tripId, TOKEN_TTL);
  return token;
}

/**
 * Tokens are deliberately NOT consumed on redemption. The same invite is how
 * a guest brings their travel companions in, so it stays valid until it expires.
 */
export async function tripIdForToken(token: string): Promise<string | null> {
  return kvGet(tokenKey(token));
}

export async function linkChat(
  chatId: string | number,
  tripId: string,
): Promise<void> {
  const previous = await kvGet(chatKey(chatId));
  if (previous && previous !== tripId) await unlinkChat(chatId);
  await kvSet(chatKey(chatId), tripId, SNAPSHOT_TTL);
  await kvSAdd(tripChatsKey(tripId), String(chatId));
  await kvSAdd(LINKED_TRIPS, tripId);
}

export async function unlinkChat(chatId: string | number): Promise<void> {
  const tripId = await kvGet(chatKey(chatId));
  await kvDel(chatKey(chatId));
  if (!tripId) return;
  await kvSRem(tripChatsKey(tripId), String(chatId));
  const remaining = await kvSMembers(tripChatsKey(tripId));
  if (remaining.length === 0) await kvSRem(LINKED_TRIPS, tripId);
}

export async function tripIdForChat(
  chatId: string | number,
): Promise<string | null> {
  return kvGet(chatKey(chatId));
}

/**
 * Push every expiry on this link back out to the full window.
 *
 * Called on each interaction, so a link that is in use never lapses — a
 * guest mid-trip should not be quietly unlinked because some counter
 * started the day they connected.
 */
export async function touchLink(
  chatId: string | number,
  tripId: string,
): Promise<void> {
  await kvSet(chatKey(chatId), tripId, SNAPSHOT_TTL);
  const snapshot = await readSnapshot(tripId);
  if (snapshot) await saveSnapshot(snapshot);
  await kvSAdd(LINKED_TRIPS, tripId);
}

export async function chatsForTrip(tripId: string): Promise<string[]> {
  return kvSMembers(tripChatsKey(tripId));
}

export async function linkedTripIds(): Promise<string[]> {
  return kvSMembers(LINKED_TRIPS);
}
