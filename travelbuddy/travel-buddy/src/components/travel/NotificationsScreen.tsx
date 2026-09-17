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
  Clock3,
  RefreshCw,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useTravel } from "./TravelProvider";
import TravelShell from "./TravelShell";
import styles from "./travel.module.css";

const labels = {
  reminder: "Reminder",
  change: "Schedule update",
  alert: "Travel alert",
};
const icons = { reminder: Clock3, change: RefreshCw, alert: TriangleAlert };

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
              <small className="text-[12px] text-black/50 font-medium">30 minutes before</small>
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
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FFD233] border-t-transparent mb-3"></div>
              <p className="text-[13px] font-bold text-black/40 uppercase tracking-widest">Loading</p>
            </div>
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
                      const Icon = icons[notice.kind as keyof typeof icons] || Bell;
                      const isUnread = !notice.read;
                      
                      let colorClass = "text-black bg-[#F2F2F7]";
                      if (notice.kind === 'alert') colorClass = "text-[#FF3B30] bg-[#FF3B30]/10";
                      if (notice.kind === 'reminder') colorClass = "text-[#5B8FB9] bg-[#5B8FB9]/10";
                      if (notice.kind === 'change') colorClass = "text-[#F5A623] bg-[#F5A623]/10";

                      return (
                        <motion.li
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          key={notice.id}
                          className={`relative flex gap-3.5 p-4 rounded-[20px] transition-all ${isUnread ? 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-transparent' : 'bg-white/60 shadow-sm border border-[#E5E5EA]'}`}
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
                              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">{labels[notice.kind as keyof typeof labels]}</span>
                              <time dateTime={notice.createdAt} title={new Date(notice.createdAt).toLocaleString()} className="text-[10px] font-bold text-black/30">
                                {relativeTime(notice.createdAt, now)}
                              </time>
                            </div>
                            <h3 className={`text-[14px] leading-snug mb-1 ${isUnread ? 'font-bold text-black' : 'font-semibold text-black/70'}`}>{notice.title}</h3>
                            <p className="text-[13px] text-black/60 leading-snug mb-2.5">{notice.message}</p>
                            
                            <div className="flex items-center justify-between mt-auto">
                              <Link
                                className="inline-flex items-center gap-1 text-[12px] font-bold text-black hover:text-[#F5A623] transition-colors"
                                href={notice.day ? `/home#day-${notice.day}` : "/my-trip"}
                                onClick={() => markRead(notice.id)}
                              >
                                View {notice.day ? `day ${notice.day}` : "trip"}
                                <ArrowUpRight size={12} />
                              </Link>
                              
                              <button
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isUnread ? 'bg-black/5 hover:bg-black/10 text-black/40' : 'text-[#34C759]'}`}
                                disabled={notice.read}
                                onClick={() => markRead(notice.id)}
                                title={notice.read ? "Read" : "Mark as read"}
                                aria-label={`Mark ${notice.title} as read`}
                              >
                                {notice.read ? <Check size={14} strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full bg-black/40" />}
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            ))
          )}
        </section>
      </motion.div>
    </TravelShell>
  );
}
