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
  type TravelState,
} from "@/lib/trip-updates";

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
      commit((current) =>
        current.reminders && current.trip
          ? addNotices(current, dueReminders(current.trip, new Date()))
          : current,
      );
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
  }, [ready, scope, state.trip, state.reminders, commit]);

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
        setReminders: (enabled) =>
          commit((current) => ({ ...current, reminders: enabled })),
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
