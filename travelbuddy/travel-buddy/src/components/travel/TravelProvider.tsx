"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import {
  addNotices,
  dueReminders,
  emptyTravelState,
  fromPlanner,
  isNotice,
  parseTravelState,
  type SavedTrip,
  type TripNotice,
  type TravelState,
} from "@/lib/trip-updates";
import { syncActivityNotices } from "@/lib/activity-notifications";
import { syncPriceNotices } from "@/lib/price-notifications";
import { connectedTripId, syncTrip } from "@/lib/trip-sync";
import { archivePlan } from "@/lib/plan-history";

type Connection = "local" | "connecting" | "live" | "reconnecting" | "offline";
interface TravelContextValue extends TravelState {
  ready: boolean;
  error: string;
  connection: Connection;
  unread: number;
  saveTrip: (trip: SavedTrip, message?: string, day?: number) => void;
  markRead: (id?: string) => void;
  setReminders: (enabled: boolean) => void;
}
const TravelContext = createContext<TravelContextValue | null>(null);

export function TravelProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const scope = `tb:travel:v1:${session?.user?.email || "guest"}`;
  const [state, setState] = useState<TravelState>(emptyTravelState);
  const stateRef = useRef(state);
  const loadedScope = useRef("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<Connection>("local");

  const commit = useCallback(
    (update: (current: TravelState) => TravelState) => {
      if (!loadedScope.current) return;
      let current = stateRef.current;
      // Merge against the latest stored snapshot before a write from another tab.
      try {
        const raw = localStorage.getItem(loadedScope.current);
        if (raw) current = parseTravelState(raw);
      } catch {
        /* Keep the usable in-memory snapshot. */
      }
      const next = update(current);
      if (next === current) return;
      stateRef.current = next;
      setState(next);
      try {
        localStorage.setItem(loadedScope.current, JSON.stringify(next));
        setError("");
      } catch {
        setError(
          "Changes are available in this tab but could not be saved on this device.",
        );
      }
    },
    [],
  );

  const publishNotices = useCallback(
    (incoming: TripNotice[]) => {
      if (!incoming.length) return;
      let fresh: TripNotice[] = [];
      commit((current) => {
        const existing = new Set(
          current.notifications.map((notice) => notice.id),
        );
        const next = addNotices(current, incoming);
        fresh = next.notifications.filter(
          (notice) =>
            !existing.has(notice.id) &&
            incoming.some((item) => item.id === notice.id),
        );
        return next;
      });
      // The feed remains the source of truth. When the browser has permission,
      // mirror the same notice as an OS notification while the app is open.
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        fresh.forEach((notice) => {
          try {
            new Notification(notice.title, {
              body: notice.message,
              tag: notice.id,
            });
          } catch {
            /* Some browsers disable notifications outside a secure context. */
          }
        });
      }
    },
    [commit],
  );

  useEffect(() => {
    if (status === "loading") return;
    setReady(false);
    setError("");
    let next = emptyTravelState();
    try {
      const raw = localStorage.getItem(scope);
      next = parseTravelState(raw);
      // Only migrate the legacy anonymous planner into the guest scope.
      if (!raw && !session?.user?.email) {
        const legacy = JSON.parse(
          sessionStorage.getItem("demo_hackathon_state") || "null",
        );
        if (legacy?.itinerary)
          next.trip = fromPlanner(
            legacy.itinerary,
            legacy.sessionData || {},
            legacy.sessionId || "legacy-trip",
          );
      }
    } catch {
      setError(
        "Saved trip data could not be loaded. Your previous storage has not been overwritten.",
      );
    }
    loadedScope.current = scope;
    stateRef.current = next;
    setState(next);
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== scope && event.key !== null) return;
      try {
        const saved = parseTravelState(event.newValue);
        stateRef.current = saved;
        setState(saved);
      } catch {
        setError("An update from another tab could not be loaded.");
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      loadedScope.current = "";
      window.removeEventListener("storage", sync);
    };
  }, [scope, status, session?.user?.email]);

  useEffect(() => {
    if (!ready) return;
    const check = () =>
      stateRef.current.reminders && stateRef.current.trip
        ? publishNotices(dueReminders(stateRef.current.trip, new Date()))
        : undefined;
    check();
    const timer = window.setInterval(check, 15000);
    const resume = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [ready, scope, state.trip, state.reminders, publishNotices]);

  useEffect(() => {
    if (!ready || !state.trip || !state.reminders) return;
    let cancelled = false;
    const check = async () => {
      const trip = stateRef.current.trip;
      if (!trip || !stateRef.current.reminders) return;
      const at = new Date();
      const incoming = await syncActivityNotices(trip, at);
      // Prices move on their own clock, so they are checked on the same
      // timer rather than given one of their own.
      const priced = syncPriceNotices(trip, at);
      if (!cancelled) publishNotices([...incoming, ...priced]);
    };
    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    const resume = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [ready, state.trip, state.reminders, publishNotices]);

  useEffect(() => {
    if (!ready) return;
    const endpoint = process.env.NEXT_PUBLIC_NOTIFICATION_STREAM_URL;
    let source: EventSource | null = null;
    const connect = () => {
      source?.close();
      if (!navigator.onLine) {
        setConnection("offline");
        return;
      }
      if (!endpoint) {
        setConnection("local");
        return;
      }
      // A same-origin endpoint keeps session cookies out of third-party requests.
      if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
        setConnection("local");
        setError("The live update connection is not configured correctly.");
        return;
      }
      setConnection("connecting");
      source = new EventSource(endpoint);
      source.onopen = () => setConnection("live");
      source.onerror = () =>
        setConnection(navigator.onLine ? "reconnecting" : "offline");
      source.onmessage = (event) => {
        try {
          const notice: unknown = JSON.parse(event.data);
          if (!isNotice(notice)) throw new Error("Invalid notification");
          commit((current) =>
            addNotices(current, [{ ...notice, read: false }]),
          );
        } catch {
          setError(
            "A live update could not be read. Your saved itinerary is still available.",
          );
        }
      };
    };
    connect();
    window.addEventListener("online", connect);
    window.addEventListener("offline", connect);
    return () => {
      source?.close();
      window.removeEventListener("online", connect);
      window.removeEventListener("offline", connect);
    };
  }, [ready, scope, commit]);

  const saveTrip = useCallback(
    (trip: SavedTrip, message?: string, day?: number) => {
      commit((current) => {
        // A different trip is replacing this one, so file the old one away
        // first. Archiving used to happen only on an explicit delete, which
        // meant planning a second trip silently threw the first one out and
        // "Previous plans" stayed empty for anyone who never pressed delete.
        if (current.trip && current.trip.id !== trip.id) {
          archivePlan(current.trip);
        }
        const next = {
          ...current,
          trip,
          notifications:
            current.trip?.id === trip.id ? current.notifications : [],
        };
        return message
          ? addNotices(next, [
              {
                id: crypto.randomUUID(),
                tripId: trip.id,
                kind: "change",
                title: "Itinerary updated",
                message,
                createdAt: new Date().toISOString(),
                day,
                read: false,
              },
            ])
          : next;
      });
    },
    [commit],
  );

  /**
   * Keep the bot's copy of the itinerary current.
   *
   * This lives in the provider rather than in the Connect card because the
   * guest edits their plan all over the app, and a card mounted on one screen
   * would only ever see the edits made on that screen. Debounced, so dragging
   * a slider or retyping a time does not fire a request per keystroke.
   */
  useEffect(() => {
    const trip = state.trip;
    if (!ready || !trip?.days?.length) return;
    if (connectedTripId() !== trip.id) return;
    const timer = setTimeout(() => {
      void syncTrip(trip);
    }, 1500);
    return () => clearTimeout(timer);
  }, [state.trip, ready]);

  const active = ready && loadedScope.current === scope && status !== "loading";
  const visibleState = active ? state : emptyTravelState();
  return (
    <TravelContext.Provider
      value={{
        ...visibleState,
        ready: active,
        error,
        connection,
        unread: visibleState.notifications.filter((n) => !n.read).length,
        saveTrip,
        markRead: (id) =>
          commit((current) => ({
            ...current,
            notifications: current.notifications.map((n) =>
              !id || n.id === id ? { ...n, read: true } : n,
            ),
          })),
        setReminders: (enabled) => {
          if (
            enabled &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "default"
          ) {
            void Notification.requestPermission();
          }
          commit((current) => ({ ...current, reminders: enabled }));
        },
      }}
    >
      {children}
    </TravelContext.Provider>
  );
}

export function useTravel() {
  const context = useContext(TravelContext);
  if (!context) throw new Error("useTravel requires TravelProvider");
  return context;
}
