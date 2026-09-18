"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  CloudSun,
  Clock3,
  CalendarDays,
  Droplets,
  Info,
  MapPin,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Sun,
  ThermometerSun,
  TriangleAlert,
  WifiOff,
  Wind,
  X,
} from "lucide-react";
import { useTravel } from "./TravelProvider";
import TravelShell from "./TravelShell";
import styles from "./travel.module.css";
import BrandLoader from "@/components/ui/BrandLoader";
import type { SavedTrip, TripNotice, WeatherAlertContext } from "@/lib/trip-updates";

const labels = {
  reminder: "Reminder",
  change: "Schedule update",
  alert: "Travel alert",
};
const icons = { reminder: Clock3, change: RefreshCw, alert: TriangleAlert };

const noticeColors = {
  alert: "text-[#FF3B30] bg-[#FF3B30]/10",
  reminder: "text-[#5B8FB9] bg-[#5B8FB9]/10",
  change: "text-[#F5A623] bg-[#F5A623]/10",
};

/**
 * Alerts created before structured weather context was introduced still live
 * in local storage. Read their original forecast copy and itinerary day so
 * they receive the same useful detail card without deleting a traveller's
 * notification history.
 */
function enrichLegacyWeatherNotice(notice: TripNotice, trip: SavedTrip | null): TripNotice {
  if (notice.weather || notice.kind !== "alert") return notice;
  const source = `${notice.title} ${notice.message}`;
  const temperature = Number(source.match(/(-?\d+(?:\.\d+)?)°C/i)?.[1]);
  const rainProbability = Number(source.match(/(\d+(?:\.\d+)?)%\s*rain/i)?.[1]);
  const windSpeed = Number(source.match(/wind\s*(\d+(?:\.\d+)?)\s*km\/h/i)?.[1]);
  if (![temperature, rainProbability, windSpeed].every(Number.isFinite)) return notice;

  const day = trip?.days.find((item) => item.day === notice.day);
  const activity = day?.items.find((item) => notice.title.toLowerCase().includes(item.activity.toLowerCase())) || day?.items[0];
  const time = source.match(/forecast for\s*(\d{2}:\d{2})/i)?.[1] || activity?.time;
  const condition = source.split(",")[0].replace(/^weather update:\s*/i, "").trim() || "Current conditions";
  const outdoor = (item?: typeof activity) => /beach|walk|hike|park|boat|cruise|market|outdoor|tour|sightsee|water|cycling|sunset/i.test(`${item?.activity || ""} ${item?.description || ""} ${item?.type || ""}`);
  const severe = rainProbability >= 70 || temperature >= 38 || windSpeed >= 35;
  const advisory = rainProbability >= 35 || temperature >= 32 || windSpeed >= 22;
  const severity: WeatherAlertContext["severity"] = severe ? "warning" : advisory ? "advisory" : "info";
  const destination = trip?.destination || "your destination";
  const arrival = /arriv|airport|flight/i.test(`${activity?.activity || notice.title} ${activity?.type || ""}`);
  const heading = arrival
    ? `Weather when you arrive in ${destination}`
    : severe && rainProbability >= 45
      ? `Rain may affect ${activity?.activity || "your plans"}`
      : advisory && temperature >= 32
        ? `Hot weather during ${activity?.activity || "your plans"}`
        : `Weather for ${activity?.activity || destination}`;
  const summary = activity && time
    ? `${arrival ? `You arrive at ${time}.` : `You have ${activity.activity} at ${time}.`} ${severity === "info" ? `It should be ${condition.toLowerCase()} with no major weather disruption expected.` : `Expect ${condition.toLowerCase()}; a little preparation will help keep your plans comfortable.`}`
    : `${condition}. This forecast is available for your trip day.`;
  const insights = (day?.items || []).slice(0, 4).map((item) => {
    const isOutdoor = outdoor(item);
    const impact = isOutdoor && severe ? "warning" as const : isOutdoor && advisory ? "caution" as const : "good" as const;
    const message = isOutdoor && rainProbability >= 45
      ? `${Math.round(rainProbability)}% rain chance around this outdoor plan.`
      : isOutdoor && temperature >= 32
        ? `Warm conditions around ${Math.round(temperature)}°C may make this feel intense.`
        : isOutdoor ? "Outdoor conditions look suitable." : "Comfortable conditions are expected.";
    return { activity: item.activity, time: item.time, impact, message };
  });
  const recommendations = [
    ...(temperature >= 30 ? ["Carry sunscreen", "Keep water with you"] : []),
    ...(temperature >= 32 ? ["Choose light, breathable clothing"] : []),
    ...(rainProbability >= 45 ? ["Pack a compact umbrella or rain layer"] : []),
    ...(severe && insights.some((item) => item.impact !== "good") ? ["Consider moving outdoor plans to a milder time"] : []),
  ];

  return {
    ...notice,
    weather: {
      heading,
      severity,
      condition,
      temperature: Math.round(temperature),
      rainProbability: Math.round(rainProbability),
      windSpeed: Math.round(windSpeed),
      summary,
      insights: insights.length ? insights : [{ activity: activity?.activity || "Your trip", time: time || "Planned time", impact: "good", message: "Conditions are available for your trip." }],
      recommendations: recommendations.length ? recommendations.slice(0, 4) : ["No weather changes needed"],
      why: activity && time ? `This alert is timed for ${activity.activity} at ${time}.` : "This alert is based on the forecast for your trip day.",
    },
  };
}

function relativeTime(value: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  if (!minutes) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

function NotificationDetailCard({
  notice,
  destination,
  dayTitle,
  activities,
  onClose,
}: {
  notice: TripNotice;
  destination?: string;
  dayTitle?: string;
  activities: { time: string; activity: string }[];
  onClose: () => void;
}) {
  const Icon = icons[notice.kind] || Bell;
  const weather = notice.weather;
  const title = weather?.heading || notice.title;
  const severityTone = weather?.severity === "warning"
    ? "from-[#4A1F2C] via-[#8B273B] to-[#D14B3B]"
    : weather?.severity === "advisory"
      ? "from-[#4A3515] via-[#9A6A1F] to-[#D99A28]"
      : "from-[#1A1A1A] via-[#37304F] to-[#6555A6]";
  const assistantContext = weather
    ? {
        alert: title,
        destination,
        day: notice.day,
        weather,
        itineraryInsights: weather.insights,
        recommendations: weather.recommendations,
      }
    : undefined;

  const discuss = () => {
    const question = weather
      ? `Help me plan around this weather alert for ${destination || "my trip"}: ${weather.summary} What should I do for the affected activities?`
      : `I received this ${labels[notice.kind].toLowerCase()} for ${destination || "my trip"}: “${notice.title}”. ${notice.message} Can you help me understand it and tell me what I should do?`;
    window.dispatchEvent(
      new CustomEvent("travel-assistant:open", {
        detail: { question, ...(assistantContext ? { context: assistantContext } : {}) },
      }),
    );
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={onClose}
        role="presentation"
      >
        <motion.article
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-detail-title"
          initial={{ opacity: 0, y: 36, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 36, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 330, damping: 30 }}
          onMouseDown={(event) => event.stopPropagation()}
          className="w-full max-w-[400px] overflow-hidden rounded-[30px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
        >
          <div className={`relative overflow-hidden bg-gradient-to-br ${severityTone} px-5 pb-7 pt-4 text-white`}>
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FFD233]/30 blur-2xl" />
            <div className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-[#9882FF]/40 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] backdrop-blur-sm">
                {weather ? `Weather ${weather.severity}` : labels[notice.kind]}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                aria-label="Close notification details"
              >
                <X size={17} />
              </button>
            </div>
            <div className="relative mt-8 flex items-end gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1A1A1A] shadow-lg">
                <Icon size={25} strokeWidth={2.4} />
              </div>
              <div className="min-w-0 pb-0.5">
                <p className="text-[11px] font-semibold text-white/65">{relativeTime(notice.createdAt, Date.now())}</p>
                <p className="truncate text-[13px] font-semibold text-white/90">{destination || "Your trip"}</p>
              </div>
            </div>
          </div>

          <div className="max-h-[62dvh] overflow-y-auto px-5 pb-5 pt-5">
            <h2 id="notification-detail-title" className="text-[23px] font-bold leading-tight tracking-[-0.025em] text-black">
              {title}
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-black/60">{weather?.summary || notice.message}</p>

            {weather && (
              <>
                <div className="mt-5 grid grid-cols-2 gap-2.5" aria-label="Weather details">
                  <div className="rounded-2xl bg-[#FFF8DE] px-3.5 py-3">
                    <ThermometerSun size={16} className="mb-2 text-[#E89A00]" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/35">Temperature</p>
                    <p className="mt-0.5 text-[14px] font-bold text-black">{weather.temperature}°C{weather.feelsLike !== undefined ? ` · feels ${weather.feelsLike}°` : ""}</p>
                  </div>
                  <div className="rounded-2xl bg-[#EEF7FF] px-3.5 py-3">
                    <Droplets size={16} className="mb-2 text-[#4F98D9]" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/35">Rain chance</p>
                    <p className="mt-0.5 text-[14px] font-bold text-black">{weather.rainProbability}%</p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F7FA] px-3.5 py-3">
                    <Wind size={16} className="mb-2 text-[#6C7A89]" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/35">Wind</p>
                    <p className="mt-0.5 text-[14px] font-bold text-black">{weather.windSpeed} km/h</p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F7FA] px-3.5 py-3">
                    <CloudSun size={16} className="mb-2 text-[#9882FF]" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/35">Conditions</p>
                    <p className="mt-0.5 text-[13px] font-bold text-black">{weather.condition}</p>
                  </div>
                </div>

                {weather.uvIndex !== undefined && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-black/45"><Sun size={13} className="text-[#E89A00]" /> UV index {weather.uvIndex}</p>
                )}

                <section className="mt-5" aria-label="Weather impact on your trip">
                  <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-black/35">For your trip</p>
                  <div className="mt-2.5 space-y-2.5">
                    {weather.insights.slice(0, 4).map((insight) => {
                      const isGood = insight.impact === "good";
                      return (
                        <div key={`${insight.time}-${insight.activity}`} className="flex gap-2.5 rounded-xl bg-[#FAFAFC] px-3 py-2.5">
                          {isGood ? <Check size={16} className="mt-0.5 shrink-0 text-[#34A853]" strokeWidth={3} /> : <TriangleAlert size={16} className={`mt-0.5 shrink-0 ${insight.impact === "warning" ? "text-[#E5484D]" : "text-[#E89A00]"}`} />}
                          <p className="text-[12px] leading-snug text-black/65"><span className="font-bold text-black">{insight.time} · {insight.activity}:</span> {insight.message}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-5 rounded-2xl bg-[#FFFBEA] p-4" aria-label="Weather recommendations">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-black/45"><Sparkles size={13} className="text-[#E89A00]" /> Recommended</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {weather.recommendations.map((recommendation) => (
                      <span key={recommendation} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black/65 shadow-sm">{recommendation}</span>
                    ))}
                  </div>
                </section>

                <details className="group mt-4 rounded-xl border border-[#EDEDF2] px-3.5 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-bold text-black/60">Why this alert?<ChevronDown size={15} className="transition-transform group-open:rotate-180" /></summary>
                  <p className="mt-2 text-[12px] leading-relaxed text-black/50">{weather.why}</p>
                </details>
              </>
            )}

            {!weather && <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#F7F7FA] px-3.5 py-3">
                <CalendarDays size={16} className="mb-2 text-[#F5A623]" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/35">Trip plan</p>
                <p className="mt-0.5 text-[13px] font-bold text-black">{notice.day ? `Day ${notice.day}` : "Trip update"}</p>
              </div>
              <div className="rounded-2xl bg-[#F7F7FA] px-3.5 py-3">
                <MapPin size={16} className="mb-2 text-[#9882FF]" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/35">Location</p>
                <p className="mt-0.5 truncate text-[13px] font-bold text-black">{destination || "Your destination"}</p>
              </div>
            </div>}

            {!weather && dayTitle && (
              <section className="mt-5 rounded-2xl border border-[#EDEDF2] bg-[#FCFCFD] p-4" aria-label="Related itinerary details">
                <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-black/35">Related itinerary</p>
                <h3 className="mt-1 text-[14px] font-bold text-black">{dayTitle}</h3>
                {activities.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {activities.slice(0, 3).map((activity) => (
                      <div key={`${activity.time}-${activity.activity}`} className="flex gap-2 text-[12px] leading-snug text-black/60">
                        <span className="w-10 shrink-0 font-bold text-black/40">{activity.time}</span>
                        <span>{activity.activity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="border-t border-[#EDEDF2] bg-white p-4">
            <button type="button" onClick={() => discuss()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD233] px-4 py-3.5 text-[14px] font-bold text-[#1A1A1A] shadow-[0_5px_14px_rgba(255,210,51,0.3)] transition-transform active:scale-[0.98]">
              <MessageCircle size={18} fill="currentColor" /> Discuss with Travel Assistant <ArrowUpRight size={16} />
            </button>
          </div>
        </motion.article>
      </motion.div>
    </AnimatePresence>
  );
}

export default function NotificationsScreen() {
  const {
    notifications,
    ready,
    unread,
    markRead,
    reminders,
    setReminders,
    connection,
    trip,
  } = useTravel();
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(Date.now);
  const [selectedNotice, setSelectedNotice] = useState<TripNotice | null>(null);
  
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  
  const filtered = notifications.filter(
    (n) =>
      filter === "all" || (filter === "unread" ? !n.read : n.kind === filter),
  );
  
  const today = new Date(now).toDateString();
  const groups = [
    {
      title: "Today",
      items: filtered.filter(
        (n) => new Date(n.createdAt).toDateString() === today,
      ),
    },
    {
      title: "Earlier",
      items: filtered.filter(
        (n) => new Date(n.createdAt).toDateString() !== today,
      ),
    },
  ];
  
  const connectionText = {
    local: "On-device updates",
    connecting: "Connecting...",
    live: "Live updates connected",
    reconnecting: "Reconnecting...",
    offline: "Offline",
  }[connection];

  return (
    <TravelShell>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="px-[26px] pb-[120px] min-h-[100dvh] bg-[#F5F3FF]">
        
        {/* Back to Home Row */}
        <motion.div variants={fadeInUp} className="pt-6 pb-[26px] flex">
          <Link href="/home" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-black/40 hover:text-black transition-colors bg-white/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-black/5 shadow-sm">
            <ArrowLeft size={14} /> Home
          </Link>
        </motion.div>

        {/* Notifications Hero */}
        <motion.div variants={fadeInUp} className="pb-[22px] flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10.5px] font-bold text-black/35 uppercase tracking-[0.11em] leading-none">Along for the journey</p>
            <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-black leading-none">Notifications</h1>
          </div>
          <div className="w-11 h-11 rounded-full bg-white shadow-sm border border-[#E5E5EA] flex items-center justify-center text-[#F5A623] shrink-0">
            <BellRing size={20} strokeWidth={2} />
          </div>
        </motion.div>

        {/* Status Bar */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between bg-white rounded-[16px] px-4 py-3.5 mb-2.5 shadow-sm border border-[#E5E5EA]">
          <p className="text-[13.5px] font-bold text-black/70">
            {unread
              ? `${unread} unread ${unread === 1 ? "update" : "updates"}`
              : "You're all caught up"}
            {trip ? ` for ${trip.destination}` : ""}
          </p>
          <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${connection === "live" ? "bg-[#EDFBF1] text-[#34C759]" : "bg-[#F2F2F7] text-black/40"}`}>
            {connection === "offline" && <WifiOff size={12} />}
            {connection === "live" && <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />}
            {connectionText}
          </div>
        </motion.div>

        {/* Filter Toolbar */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between mb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Filter notifications">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "reminder", label: "Reminders" },
              { id: "alert", label: "Alerts" },
            ].map((item) => (
              <button
                key={item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-colors ${filter === item.id ? "bg-[#1A1A1A] text-white shadow-md" : "bg-white text-black/60 border border-[#E5E5EA] hover:border-black/20"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            className="w-8 h-8 flex-shrink-0 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center text-black/40 hover:text-black hover:border-black/20 disabled:opacity-50 disabled:pointer-events-none transition-colors ml-2"
            disabled={!unread}
            onClick={() => markRead()}
            title="Mark all as read"
            aria-label="Mark all as read"
          >
            <CheckCheck size={16} />
          </button>
        </motion.div>

        {/* Preferences Panel */}
        <motion.aside variants={fadeInUp} className="bg-white rounded-[20px] p-4 mb-7 shadow-sm border border-[#E5E5EA]">
          <h2 className="text-[10px] font-bold text-black/35 uppercase tracking-[0.11em] mb-3">Your preferences</h2>
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex flex-col gap-0.5">
              <strong className="text-[14px] font-bold text-black leading-none">Activity reminders</strong>
              <small className="text-[12px] text-black/50 font-medium">Get ready 30 min before · 5 min reminder · weather & traffic</small>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                role="switch"
                className="sr-only"
                checked={reminders}
                disabled={!ready}
                onChange={(e) => setReminders(e.target.checked)}
              />
              <div className={`block w-11 h-6 rounded-full transition-colors ${reminders ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`}></div>
              <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${reminders ? 'translate-x-5' : 'translate-x-0'} shadow-sm`}></div>
            </div>
          </label>
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[#E5E5EA] text-[12px] font-bold text-black/40">
            <Clock3 size={14} />
            <span>{trip?.timeZone.replaceAll("_", " ") || "Destination local time"}</span>
          </div>
        </motion.aside>

        {/* Notification Feed */}
        <section aria-label="Notification feed">
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {unread} unread notifications
          </span>
          
          {!ready ? (
            <BrandLoader message="Loading updates" />
          ) : !filtered.length ? (
            <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center text-center py-12 bg-white rounded-[24px] border border-black/[0.03] shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
              <div className="w-14 h-14 rounded-full bg-[#F5F3FF] flex items-center justify-center mb-4">
                <Bell size={24} className="text-[#9882FF]" />
              </div>
              <h2 className="text-[18px] font-bold text-black mb-2">
                {filter === "unread" ? "All caught up" : "No updates here yet"}
              </h2>
              <p className="text-[14px] text-black/50 mb-5 max-w-[200px]">
                {filter === "all"
                  ? "Your next adventure is looking clear."
                  : "Nothing in this category."}
              </p>
              <Link href="/home" className="flex items-center gap-1.5 text-[14px] font-bold text-black bg-[#F2F2F7] px-4 py-2 rounded-full hover:bg-black/10 transition-colors">
                Back to my trip <ArrowUpRight size={14} />
              </Link>
            </motion.div>
          ) : (
            groups.map((group) => group.items.length > 0 && (
              <section key={group.title} className="mb-8">
                <h2 className="flex items-center gap-2 text-[15px] font-bold text-black mb-2.5">
                  {group.title}
                  <span className="px-1.5 py-0.5 rounded-full bg-black/5 text-[10px] font-bold text-black/60">{group.items.length}</span>
                </h2>
                
                <div className="flex flex-col gap-2.5">
                  <AnimatePresence>
                    {group.items.map((notice) => {
                      const displayNotice = enrichLegacyWeatherNotice(notice, trip);
                      const Icon = icons[displayNotice.kind as keyof typeof icons] || Bell;
                      const isUnread = !notice.read;
                      
                      const colorClass = noticeColors[displayNotice.kind];

                      return (
                        <motion.button
                          type="button"
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          key={notice.id}
                          onClick={() => {
                            markRead(notice.id);
                            setSelectedNotice(displayNotice);
                          }}
                          className={`relative flex w-full gap-3.5 rounded-[20px] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.07)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] ${isUnread ? 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-transparent' : 'bg-white/60 shadow-sm border border-[#E5E5EA]'}`}
                          aria-label={`Open details for ${displayNotice.weather?.heading || displayNotice.title}`}
                        >
                          {/* Unread Indicator */}
                          {isUnread && (
                            <div className="absolute top-4 -left-1 w-2.5 h-2.5 rounded-full bg-[#FFD233] border-2 border-[#F5F3FF]" />
                          )}
                          
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                            <Icon size={18} strokeWidth={2.5} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex flex-col flex-grow pt-0.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">{displayNotice.weather ? `Weather ${displayNotice.weather.severity}` : labels[displayNotice.kind]}</span>
                              <time dateTime={notice.createdAt} title={new Date(notice.createdAt).toLocaleString()} className="text-[10px] font-bold text-black/30">
                                {relativeTime(notice.createdAt, now)}
                              </time>
                            </div>
                            <h3 className={`text-[14px] leading-snug mb-1 ${isUnread ? 'font-bold text-black' : 'font-semibold text-black/70'}`}>{displayNotice.weather?.heading || displayNotice.title}</h3>
                            <p className="text-[13px] text-black/60 leading-snug mb-2.5">{displayNotice.weather?.summary || displayNotice.message}</p>
                            
                            <div className="mt-auto inline-flex items-center gap-1 text-[12px] font-bold text-black/70">
                              View details <ArrowUpRight size={12} />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            ))
          )}
        </section>
      </motion.div>
      <AnimatePresence>
        {selectedNotice && (
          <NotificationDetailCard
            notice={selectedNotice}
            destination={trip?.destination}
            dayTitle={trip?.days.find((day) => day.day === selectedNotice.day)?.title}
            activities={(trip?.days.find((day) => day.day === selectedNotice.day)?.items || []).map(({ time, activity }) => ({ time, activity }))}
            onClose={() => setSelectedNotice(null)}
          />
        )}
      </AnimatePresence>
    </TravelShell>
  );
}
