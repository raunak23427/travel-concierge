"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import {
  Bell,
  BellOff,
  CalendarDays,
  ChevronRight,
  LogOut,
  MapPin,
  RotateCcw,
  Sparkles,
  Trash2,
  Wallet,
  Clock,
  Waves,
  UtensilsCrossed,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import TravelShell from "./TravelShell";
import TelegramConnect from "./TelegramConnect";
import { useTravel } from "./TravelProvider";
import { useTheme } from "./ThemeProvider";
import BrandLoader from "@/components/ui/BrandLoader";
import {
  readPlanHistory,
  removeArchivedPlan,
  formatArchivedDate,
  type ArchivedPlan,
} from "@/lib/plan-history";
import {
  TRANSPORT_META,
  readTransportModes,
  type TransportMode,
} from "@/lib/goa-geo";
import type { SavedTrip } from "@/lib/trip-updates";

/**
 * Everything about the traveller rather than the trip.
 *
 * The app already knew all of this — swipe tags, budget split, transport
 * choices, archived plans — but it was scattered across screens that each
 * owned one slice. This is the one place to see what the app thinks of you,
 * and to undo any of it.
 */

type Planner = {
  sessionData?: {
    budgetSplit?: Record<string, number>;
    budget?: number;
    stayArea?: string;
    stayProperty?: string;
    arriveGoa?: string;
    departGoa?: string;
    adults?: number;
    children?: number;
    nights?: number;
    days?: number;
  };
  profileTags?: {
    vibes?: string[];
    activities?: string[];
    stays?: string[];
    food?: string[];
  };
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** The planner writes under the signed-in email; guests get their own key. */
function readPlanner(): Planner | null {
  try {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith("tb:planner:"),
    );
    if (!key) return null;
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-black/35">
        {label}
      </p>
      {children}
    </section>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_8px_rgba(0,0,0,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

function TagRow({
  Icon,
  colour,
  tint,
  label,
  tags,
}: {
  Icon: typeof Sparkles;
  colour: string;
  tint: string;
  label: string;
  tags?: string[];
}) {
  if (!tags?.length) return null;
  return (
    <Card>
      <p className="flex items-center gap-2 text-[12.5px] font-bold text-black">
        <span
          className="grid h-6 w-6 flex-none place-items-center rounded-lg"
          style={{ background: tint }}
        >
          <Icon size={13} style={{ color: colour }} />
        </span>
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.slice(0, 10).map((t) => (
          <span
            key={t}
            className="rounded-full bg-[#F7F7FA] px-2.5 py-1 text-[11.5px] font-semibold text-black/70"
          >
            {t}
          </span>
        ))}
      </div>
    </Card>
  );
}

export default function ProfileScreen() {
  const { data: session, status } = useSession();
  const { trip, ready, reminders, setReminders, notifications } = useTravel();
  const { choice, resolved, setChoice } = useTheme();
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [modes, setModes] = useState<TransportMode[]>([]);
  const [history, setHistory] = useState<ArchivedPlan[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setPlanner(readPlanner());
    setModes(readTransportModes());
    setHistory(readPlanHistory());
  }, []);

  if (!ready || status === "loading")
    return (
      <TravelShell>
        <BrandLoader message="Loading your profile" />
      </TravelShell>
    );

  const user = session?.user;
  const isGuest = !user?.email;
  const name = user?.name || "Guest traveller";
  const initial = (user?.name || "G").trim().charAt(0).toUpperCase();
  const tags = planner?.profileTags;
  const budgetSplit = planner?.sessionData?.budgetSplit;
  const stay = planner?.sessionData;

  /** Wipe every trace of this device's trips and start the flow again. */
  const resetEverything = () => {
    try {
      Object.keys(localStorage)
        .filter(
          (k) =>
            k.startsWith("tb:travel:v1:") ||
            k.startsWith("tb:planner:") ||
            k.startsWith("tb:plans:") ||
            k.startsWith("travelbuddy:"),
        )
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {
      /* private mode */
    }
    window.location.href = "/welcome";
  };

  return (
    <TravelShell>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        /* TravelShell's <main> already carries pb-32 for the floating nav;
           another pb-32 here left a screen of dead space at the bottom. */
        className="flex flex-col gap-7 px-5 pb-6 pt-2"
      >
        {/* Who you are */}
        <div className="flex items-center gap-3.5">
          {user?.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.image}
              alt=""
              width={60}
              height={60}
              className="h-[60px] w-[60px] flex-none rounded-full object-cover shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
            />
          ) : (
            <span className="grid h-[60px] w-[60px] flex-none place-items-center rounded-full bg-[#FFD233] text-[24px] font-bold text-black shadow-[0_4px_14px_rgba(255,210,51,0.4)]">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-[22px] font-semibold tracking-[-0.01em] text-black">
              {name}
            </h1>
            <p className="mt-0.5 truncate text-[12.5px] text-black/45">
              {user?.email || "Exploring without an account"}
            </p>
          </div>
        </div>

        {isGuest && (
          <Link
            href="/login"
            className="flex h-[46px] items-center justify-center gap-2 rounded-full bg-[#FFD233] text-[14.5px] font-bold text-black transition-transform active:scale-[0.98]"
          >
            Sign in to keep your trips
            <ChevronRight size={16} />
          </Link>
        )}

        {/* Current trip, at a glance */}
        {trip?.days?.length ? (
          <Section label="Current trip">
            <Link href="/itinerary" className="block">
              <Card className="flex items-center gap-3">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#E1F3EC]">
                  <MapPin size={17} className="text-[#2DA87F]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-black">
                    {trip.name || `Trip to ${trip.destination}`}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-black/45">
                    {trip.days.length} days
                    {stay?.stayArea ? ` · ${stay.stayArea}` : ""}
                    {trip.bookedAt ? " · confirmed" : ""}
                  </span>
                </span>
                <ChevronRight size={17} className="flex-none text-black/25" />
              </Card>
            </Link>
          </Section>
        ) : null}

        {/* What the swipes decided about you */}
        {(tags?.vibes?.length ||
          tags?.activities?.length ||
          tags?.food?.length) && (
          <Section label="Your travel profile">
            <TagRow
              Icon={Sparkles}
              colour="#C79100"
              tint="#FFF4D6"
              label="Vibes"
              tags={tags?.vibes}
            />
            <TagRow
              Icon={Waves}
              colour="#2F7FD6"
              tint="#E4EFFB"
              label="Activities"
              tags={tags?.activities}
            />
            <TagRow
              Icon={UtensilsCrossed}
              colour="#E9633B"
              tint="#FDEAE3"
              label="Food"
              tags={tags?.food}
            />
            <Link href="/plan?new=1" className="block">
              <Card className="flex items-center gap-3">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#F5E8F8]">
                  <Sparkles size={15} className="text-[#B45FC4]" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-semibold text-black">
                  Swipe again to change your taste
                </span>
                <ChevronRight size={16} className="flex-none text-black/25" />
              </Card>
            </Link>
          </Section>
        )}

        {/* Stay + budget */}
        {(stay?.stayArea || budgetSplit) && (
          <Section label="Trip preferences">
            {stay?.stayArea && (
              <Card>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#E4EFFB]">
                    <CalendarDays size={15} className="text-[#2F7FD6]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-black">
                      {stay.stayProperty || stay.stayArea}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-black/45">
                      {stay.arriveGoa && stay.departGoa
                        ? `${stay.arriveGoa} → ${stay.departGoa}`
                        : "Dates not set"}
                      {stay.adults
                        ? ` · ${stay.adults + (stay.children || 0)} guests`
                        : ""}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {budgetSplit && (
              <Card>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#FFF4D6]">
                    <Wallet size={15} className="text-[#C79100]" />
                  </span>
                  <p className="flex-1 text-[13px] font-bold text-black">
                    Budget
                  </p>
                  <p className="tnum text-[13px] font-bold text-black">
                    {rupees(
                      planner?.sessionData?.budget ||
                        Object.values(budgetSplit).reduce((a, b) => a + b, 0),
                    )}
                  </p>
                </div>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {Object.entries(budgetSplit)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-[74px] flex-none text-[11.5px] capitalize text-black/50">
                          {k}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F1F5]">
                          <span
                            className="block h-full rounded-full bg-[#FFD233]"
                            style={{
                              width: `${Math.min(100, (v / Math.max(...Object.values(budgetSplit))) * 100)}%`,
                            }}
                          />
                        </span>
                        <span className="tnum w-[62px] flex-none text-right text-[11.5px] font-semibold text-black/70">
                          {rupees(v)}
                        </span>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {modes.length > 0 && (
              <Card>
                <p className="text-[12.5px] font-bold text-black">
                  Getting around
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {modes.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-[#F7F7FA] px-2.5 py-1 text-[11.5px] font-semibold text-black/70"
                    >
                      {TRANSPORT_META[m]?.icon} {m}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </Section>
        )}

        {/* Settings */}
        <Section label="Settings">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#F5E8F8]">
                {resolved === "dark" ? (
                  <Moon size={15} className="text-[#B45FC4]" />
                ) : (
                  <Sun size={15} className="text-[#B45FC4]" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-black">
                  Appearance
                </span>
                <span className="mt-0.5 block text-[11.5px] text-black/45">
                  {choice === "system"
                    ? `Following your device — currently ${resolved}`
                    : `Always ${choice}`}
                </span>
              </span>
            </div>

            <div className="mt-3 flex gap-1.5 rounded-full bg-[#F7F7FA] p-1">
              {(
                [
                  { key: "light", label: "Light", Icon: Sun },
                  { key: "dark", label: "Dark", Icon: Moon },
                  { key: "system", label: "Auto", Icon: Monitor },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={choice === key}
                  onClick={() => setChoice(key)}
                  className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-bold transition-all ${
                    choice === key
                      ? "bg-[#FFD233] text-[#1A1A1A] shadow-[0_2px_8px_rgba(255,210,51,0.35)]"
                      : "text-black/45"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#FDEAE3]">
              {reminders ? (
                <Bell size={15} className="text-[#E9633B]" />
              ) : (
                <BellOff size={15} className="text-[#E9633B]" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-black">
                Trip reminders
              </span>
              <span className="mt-0.5 block text-[11.5px] text-black/45">
                {reminders
                  ? "You'll be nudged before each stop"
                  : "Reminders are off"}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={reminders}
              aria-label="Trip reminders"
              onClick={() => setReminders(!reminders)}
              className={`relative h-[30px] w-[52px] flex-none rounded-full transition-colors ${reminders ? "bg-[#FFD233]" : "bg-[#E5E5EA]"}`}
            >
              <span
                className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-all ${reminders ? "left-[25px]" : "left-[3px]"}`}
              />
            </button>
          </Card>

          <Link href="/notifications" className="block">
            <Card className="flex items-center gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#E4EFFB]">
                <Clock size={15} className="text-[#2F7FD6]" />
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-bold text-black">
                Updates
              </span>
              <span className="text-[12px] text-black/45">
                {notifications.length}
              </span>
              <ChevronRight size={16} className="flex-none text-black/25" />
            </Card>
          </Link>

          <TelegramConnect trip={trip} />
        </Section>

        {/* Past plans */}
        {history.length > 0 && (
          <Section label={`Previous plans (${history.length})`}>
            {history.map((plan) => (
              <Card key={plan.id} className="flex items-center gap-3">
                <span className="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-xl bg-[#F7F7FA]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={plan.image}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-black">
                    {plan.name}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-black/45">
                    {plan.dayCount} days · {rupees(plan.estimatedCost)} ·{" "}
                    {formatArchivedDate(plan.archivedAt)}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${plan.name}`}
                  onClick={() => {
                    removeArchivedPlan(plan.id);
                    setHistory(readPlanHistory());
                  }}
                  className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[#FDEAE3] text-[#E9633B] transition-transform active:scale-95"
                >
                  <Trash2 size={14} />
                </button>
              </Card>
            ))}
          </Section>
        )}

        {/* Account */}
        <Section label="Account">
          {!isGuest && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/welcome" })}
              className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-transform active:scale-[0.99]"
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#F7F7FA]">
                <LogOut size={15} className="text-black/60" />
              </span>
              <span className="flex-1 text-[13px] font-bold text-black">
                Sign out
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-transform active:scale-[0.99]"
          >
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#FDEAE3]">
              <RotateCcw size={15} className="text-[#E9633B]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-[#E9633B]">
                Start over
              </span>
              <span className="mt-0.5 block text-[11.5px] text-black/45">
                Clears your trip, swipes and saved plans
              </span>
            </span>
          </button>
        </Section>
      </motion.div>

      {confirmReset && (
        <div className="fixed inset-y-0 left-1/2 z-50 flex w-full max-w-[448px] -translate-x-1/2 items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-6 pb-10">
            <h2 className="text-[19px] font-bold text-black">Start over?</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-black/50">
              Your itinerary, swipe answers, transport choices and{" "}
              {history.length > 0
                ? `all ${history.length} saved plans`
                : "saved plans"}{" "}
              will be removed from this device. This can&apos;t be undone.
            </p>
            <button
              type="button"
              onClick={resetEverything}
              className="mt-5 w-full rounded-full bg-[#E9633B] py-4 text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
            >
              Clear everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="mt-2 w-full py-3.5 text-[14px] font-semibold text-[#8E8E93]"
            >
              Keep my data
            </button>
          </div>
        </div>
      )}
    </TravelShell>
  );
}
