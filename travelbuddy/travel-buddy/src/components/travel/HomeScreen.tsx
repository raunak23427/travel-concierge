"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Compass,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Sparkles,
  Users,
  Utensils,
  Coffee,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { dayDate, formatDate } from "@/lib/trip-updates";
import { useTravel } from "./TravelProvider";
import {
  archivePlan,
  readPlanHistory,
  removeArchivedPlan,
  formatArchivedDate,
  type ArchivedPlan,
} from "@/lib/plan-history";
import TravelShell from "./TravelShell";
import { ActivityEditor, TripEditor } from "./TripEditors";
import styles from "./travel.module.css";
import BrandLoader from "@/components/ui/BrandLoader";

const activityIcons = {
  travel: Plane,
  food: Utensils,
  relax: Coffee,
  activity: MapPin,
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

function PremiumHomeView() {
  const { trip, ready, unread } = useTravel();
  const [editing, setEditing] = useState(false);
  const [activityEdit, setActivityEdit] = useState<{ day: number; index?: number } | null>(null);
  const [failedImage, setFailedImage] = useState("");
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  
  const toggleDay = (day: number) => {
    setExpandedDays((current) => {
      const next = new Set(current);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  return (
    <TravelShell>
      {!ready ? (
        <BrandLoader message="Loading your journey" />
      ) : (
        /* Home is the overview and never renders the plan — that lives on
           the Plan tab, and only once the trip is actually booked. */
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="px-5 pb-32"
        >
          {/* Greeting */}
          <motion.div variants={fadeInUp} className="pt-2 pb-5">
            <p className="text-[10.5px] font-bold text-black/35 uppercase tracking-[0.11em] mb-2">
              Goa, whenever you are
            </p>
            <h1 className="font-display text-[32px] leading-[1.08] font-semibold tracking-[-0.02em] text-black">
              Let&apos;s build your trip.
            </h1>
          </motion.div>

          {/* Hero */}
          <motion.div
            variants={fadeInUp}
            className="relative h-[300px] rounded-[32px] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.14)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="absolute inset-0 w-full h-full object-cover"
              src="/goa/sunset-anjuna.jpg"
              alt="Sunset at Anjuna beach, Goa"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h2 className="font-display text-white text-[27px] font-semibold tracking-[-0.015em] leading-tight">
                Where are we off to?
              </h2>
              <p className="text-white/75 text-[14px] leading-relaxed mt-1.5 max-w-[280px]">
                Answer four quick questions, swipe through Goa, and we&apos;ll
                write the itinerary.
              </p>
              <Link
                href="/plan?new=1"
                className="mt-5 w-full flex items-center justify-center gap-2 bg-[#FFD233] text-black h-[52px] rounded-full font-bold text-[16px] shadow-[0_8px_24px_rgba(255,210,51,0.35)] active:scale-[0.98] transition-transform"
              >
                Start planning <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>

          {/* How it works */}
          <motion.div variants={fadeInUp} className="mt-7">
            <h3 className="text-[15px] font-bold text-black mb-3">
              How it works
            </h3>
            <div className="flex flex-col gap-2.5">
              {[
                {
                  n: "1",
                  icon: <MapPin size={16} className="text-[#E9633B]" />,
                  bg: "#FDEAE3",
                  t: "Set your base",
                  d: "Pin your hotel, pick dates, split the budget.",
                },
                {
                  n: "2",
                  icon: <Sparkles size={16} className="text-[#B45FC4]" />,
                  bg: "#F5E8F8",
                  t: "Swipe your taste",
                  d: "Vibes, activities and food — 21 cards, about a minute.",
                },
                {
                  n: "3",
                  icon: <CalendarDays size={16} className="text-[#2DA87F]" />,
                  bg: "#E1F3EC",
                  t: "Get the plan",
                  d: "Day-by-day, routed on real Goa distances.",
                },
              ].map((s2) => (
                <div
                  key={s2.n}
                  className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] px-4 py-3.5 flex items-center gap-3"
                >
                  <span
                    className="w-9 h-9 rounded-xl grid place-items-center flex-none"
                    style={{ background: s2.bg }}
                  >
                    {s2.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold text-black">
                      {s2.t}
                    </span>
                    <span className="block text-[11.5px] text-black/45 mt-0.5">
                      {s2.d}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* A taste of Goa */}
          <motion.div variants={fadeInUp} className="mt-7">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-[15px] font-bold text-black">A taste of Goa</h3>
              <Link
                href="/plan?new=1"
                className="text-[12.5px] font-semibold text-black/40"
              >
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
              {[
                { src: "/goa/fontainhas-street.jpg", t: "Fontainhas", s: "Heritage" },
                { src: "/goa/dudhsagar.jpg", t: "Dudhsagar", s: "Nature" },
                { src: "/goa/fire-dancing.jpg", t: "Vagator", s: "Nightlife" },
                { src: "/goa/fish-thali.jpg", t: "Fish thali", s: "Food" },
                { src: "/goa/palolem-south.jpg", t: "Palolem", s: "Quiet" },
              ].map((c) => (
                <div
                  key={c.src}
                  className="relative w-[132px] h-[172px] rounded-3xl overflow-hidden flex-none shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.src}
                    alt={c.t}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-white text-[13.5px] font-bold leading-tight">
                      {c.t}
                    </p>
                    <p className="text-white/65 text-[10.5px] font-semibold uppercase tracking-wide">
                      {c.s}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-black/30 mt-2">
              Photography © OpenStreetMap contributors &amp; Wikimedia Commons
            </p>
          </motion.div>
        </motion.div>
      )}

      {editing && trip && <TripEditor trip={trip} onClose={() => setEditing(false)} />}
      {activityEdit && trip && (
        <ActivityEditor trip={trip} {...activityEdit} onClose={() => setActivityEdit(null)} />
      )}
    </TravelShell>
  );
}

// Just the PremiumTripView function logic to be replaced in HomeScreen.tsx
function PremiumTripView({ showHistory = false }: { showHistory?: boolean }) {
  const { trip, ready, unread } = useTravel();
  const [history, setHistory] = useState<ArchivedPlan[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (showHistory) setHistory(readPlanHistory());
  }, [showHistory, trip?.id]);

  /** Archive the current plan, then clear it and start fresh. */
  const deleteCurrentPlan = () => {
    archivePlan(trip);
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("tb:travel:v1:") || k.startsWith("tb:planner:"))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {
      /* private mode */
    }
    window.location.href = "/itinerary";
  };
  const [editing, setEditing] = useState(false);
  const [failedImage, setFailedImage] = useState("");
  
  return (
    <TravelShell>
      {!ready ? (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FFD233] border-t-transparent"></div>
            <p className="text-sm font-medium text-black/40 animate-pulse">Loading your trip...</p>
          </div>
        </div>
      ) : !trip ? (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center justify-center text-center h-[70vh] px-5">
          <motion.div variants={fadeInUp} className="w-20 h-20 rounded-full bg-[#F5F3FF] flex items-center justify-center mb-6 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wayzyy-logo.svg" alt="" width={40} height={40} className="w-10 h-10 rounded-xl" />
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-2xl font-bold text-black mb-3">Where are we off to?</motion.h2>
          <motion.p variants={fadeInUp} className="text-[15px] font-medium text-black/50 mb-8 max-w-[240px]">No trip planned yet. Let's create something amazing.</motion.p>
          <motion.div variants={fadeInUp}>
            <Link href="/plan?new=1" className="inline-flex items-center gap-2 bg-[#FFD233] text-black px-6 py-3.5 rounded-full font-bold text-[15px] shadow-[0_8px_24px_rgba(255,210,51,0.4)] hover:scale-[1.02] active:scale-95 transition-all">
              Start planning <ArrowRight size={18} />
            </Link>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="px-5 pb-10 bg-[#F9F9FB] min-h-[100dvh]">
          
          {/* Header */}
          <motion.div variants={fadeInUp} className="pt-6 pb-6 flex items-end justify-between">
            <div>
              <p className="text-[12px] font-bold text-black/40 uppercase tracking-widest mb-1.5">A little planning. A lot to look forward to.</p>
              <h1 className="text-[32px] font-extrabold tracking-tight text-black">My trip</h1>
            </div>
            <button
              className="w-10 h-10 rounded-full bg-white border border-[#E5E5EA] shadow-sm flex items-center justify-center text-black hover:border-black/20 hover:bg-black/5 transition-all active:scale-95"
              onClick={() => setEditing(true)}
              aria-label="Edit trip details"
              title="Edit trip details"
            >
              <Pencil size={18} />
            </button>
          </motion.div>

          {/* Hero Image */}
          <motion.section variants={fadeInUp} className="relative w-full aspect-[16/11] rounded-[32px] overflow-hidden shadow-[0_16px_32px_rgba(0,0,0,0.08)] mb-8">
            {trip.image && failedImage !== trip.image ? (
              <img
                className="absolute inset-0 w-full h-full object-cover"
                src={trip.image}
                alt={`${trip.destination}, ${trip.country}`}
                onError={() => setFailedImage(trip.image)}
              />
            ) : (
              <div className="absolute inset-0 bg-[#1A1A1A] flex items-center justify-center">
                <MapPin className="text-white/20 w-16 h-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-1.5 text-white/90 font-bold text-[13px] tracking-widest uppercase mb-1 drop-shadow-md">
                <MapPin size={14} />
                {trip.destination}{trip.country && `, ${trip.country}`}
              </div>
              <h2 className="text-[28px] leading-tight font-extrabold text-white drop-shadow-lg">{trip.name}</h2>
            </div>
          </motion.section>

          {/* Trip Summary Panel */}
          <motion.div variants={fadeInUp} className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-black/[0.03] mb-6 flex items-center justify-between">
            <div className="flex flex-col items-center flex-1 border-r border-black/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1.5">Dates</span>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-black">
                <CalendarDays size={14} className="text-[#FFD233]" />
                {formatDate(trip.startDate)}
              </div>
            </div>
            <div className="flex flex-col items-center flex-1 border-r border-black/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1.5">Travelers</span>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-black">
                <Users size={14} className="text-[#9882FF]" />
                {trip.travelers}
              </div>
            </div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1.5">Activities</span>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-black">
                <Compass size={14} className="text-[#34C759]" />
                {trip.days.reduce((sum, day) => sum + day.items.length, 0)}
              </div>
            </div>
          </motion.div>

          {/* Updates Banner */}
          {unread > 0 && (
            <motion.div variants={fadeInUp} className="mb-8">
              <Link href="/notifications" className="group flex items-center justify-between bg-white border border-[#E5E5EA] p-4 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-[#FFD233]/50 transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFFBEA] flex items-center justify-center">
                    <Sparkles size={18} className="text-[#F5A623]" />
                  </div>
                  <span className="text-[14px] font-bold text-black">
                    {unread} new {unread === 1 ? "update" : "updates"}
                  </span>
                </div>
                <ArrowRight size={18} className="text-black/30 group-hover:text-black transition-colors group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}

          {/* Logistics Section */}
          <motion.div variants={fadeInUp} className="mb-10">
            <h2 className="text-[20px] font-bold text-black mb-5">The essentials</h2>
            
            <div className="flex flex-col gap-4">
              {/* Flights */}
              {trip.flights.length > 0 && (
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-black/[0.03]">
                  <h3 className="flex items-center gap-2 text-[14px] font-bold text-black mb-4 uppercase tracking-wider border-b border-black/5 pb-3">
                    <Plane size={16} className="text-black/40" /> Flights
                  </h3>
                  <div className="flex flex-col gap-5">
                    {trip.flights.map((flight, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex flex-col">
                          <strong className="flex items-center gap-2 text-[15px] font-bold text-black mb-1">
                            {flight.from} <ArrowRight size={14} className="text-black/30" /> {flight.to}
                          </strong>
                          <p className="text-[13px] text-black/60 font-medium">{flight.airline} {flight.flightNo}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex px-2.5 py-1 rounded-lg bg-[#F2F2F7] text-[12px] font-bold text-black/60">
                            {flight.departure} — {flight.arrival}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stay */}
              {trip.hotel && (
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-black/[0.03]">
                  <h3 className="flex items-center gap-2 text-[14px] font-bold text-black mb-4 uppercase tracking-wider border-b border-black/5 pb-3">
                    <BedDouble size={16} className="text-black/40" /> Your stay
                  </h3>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <strong className="text-[15px] font-bold text-black mb-1">{trip.hotel.name}</strong>
                      <p className="text-[13px] text-black/60 font-medium">{trip.hotel.location}</p>
                    </div>
                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-[#F2F2F7] text-[12px] font-bold text-black/60">
                      {trip.hotel.nights} nights
                    </span>
                  </div>
                </div>
              )}

              {/* Transfers */}
              {trip.transfers.length > 0 && (
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-black/[0.03]">
                  <h3 className="flex items-center gap-2 text-[14px] font-bold text-black mb-4 uppercase tracking-wider border-b border-black/5 pb-3">
                    <MapPin size={16} className="text-black/40" /> Transfers
                  </h3>
                  <div className="flex flex-col gap-5">
                    {trip.transfers.map((transfer, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <strong className="flex items-center gap-2 text-[15px] font-bold text-black mb-1">
                            {transfer.from} <ArrowRight size={12} className="text-black/30" /> {transfer.to}
                          </strong>
                          <p className="text-[13px] text-black/60 font-medium">{transfer.type}</p>
                        </div>
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-[#F2F2F7] text-[12px] font-bold text-black/60">
                          {money(transfer.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Trip Details Grid */}
          <motion.div variants={fadeInUp}>
            <div className="bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-black/[0.03] overflow-hidden">
              <div className="p-5 border-b border-black/5">
                <h3 className="flex items-center gap-2 text-[14px] font-bold text-black uppercase tracking-wider">
                  <CalendarDays size={16} className="text-black/40" /> Trip details
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-px bg-black/5">
                <div className="bg-white p-4">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Destination</dt>
                  <dd className="text-[14px] font-bold text-black">{trip.destination}</dd>
                </div>
                <div className="bg-white p-4">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Travelers</dt>
                  <dd className="text-[14px] font-bold text-black">{trip.travelers}</dd>
                </div>
                <div className="bg-white p-4">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Start</dt>
                  <dd className="text-[14px] font-bold text-black">{formatDate(trip.startDate)}</dd>
                </div>
                <div className="bg-white p-4">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">End</dt>
                  <dd className="text-[14px] font-bold text-black">{formatDate(trip.endDate)}</dd>
                </div>
                
                {trip.planning && (
                  <>
                    <div className="bg-white p-4">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Stay area</dt>
                      <dd className="text-[14px] font-bold text-black">{trip.planning.stayArea || "Any"}</dd>
                    </div>
                    <div className="bg-white p-4">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Property</dt>
                      <dd className="text-[14px] font-bold text-black line-clamp-1">{trip.planning.stayProperty || "Any"}</dd>
                    </div>
                    <div className="bg-white p-4">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Arrival</dt>
                      <dd className="text-[14px] font-bold text-black">{formatDate(trip.planning.arriveGoa)}</dd>
                    </div>
                    <div className="bg-white p-4">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Departure</dt>
                      <dd className="text-[14px] font-bold text-black">{formatDate(trip.planning.departGoa)}</dd>
                    </div>
                    <div className="bg-white p-4">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Adults / Kids</dt>
                      <dd className="text-[14px] font-bold text-black">{trip.planning.adults} / {trip.planning.children}</dd>
                    </div>
                    <div className="bg-white p-4">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-1">Budget</dt>
                      <dd className="text-[14px] font-bold text-[#34C759]">{money(trip.planning.budget)}</dd>
                    </div>
                  </>
                )}
              </div>
              
              <div className="p-4 bg-white border-t border-black/5">
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F2F2F7] text-[13px] font-bold text-black hover:bg-black/10 transition-colors"
                  onClick={() => setEditing(true)}
                >
                  Edit details <Pencil size={14} />
                </button>
              </div>
            </div>
          </motion.div>

        </motion.div>
      )}

      {showHistory && ready && (
        <div className="px-5 pb-32">
          {trip && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[13.5px] font-bold text-[#E9633B] shadow-[0_1px_8px_rgba(0,0,0,0.05)] active:scale-[0.99] transition-transform"
            >
              <Trash2 size={15} /> Delete this plan
            </button>
          )}

          {history.length > 0 && (
            <div className="mt-8">
              <h3 className="text-[15px] font-bold text-black">Previous plans</h3>
              <p className="mt-1 text-[11.5px] text-black/40">
                {history.length} archived {history.length === 1 ? "plan" : "plans"}
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {history.map((p) => (
                  <div
                    key={p.id + p.archivedAt}
                    className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image || "/goa/beaches-of-goa.jpg"}
                      alt=""
                      className="h-14 w-14 flex-none rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-black">{p.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-black/45">
                        {p.dayCount} days · ~₹{p.estimatedCost.toLocaleString("en-IN")}
                        {p.bookedAt ? " · confirmed" : ""}
                      </p>
                      <p className="text-[10.5px] text-black/30">
                        Archived {formatArchivedDate(p.archivedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { removeArchivedPlan(p.id); setHistory(readPlanHistory()); }}
                      aria-label={`Delete ${p.name}`}
                      className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#F7F7FA] text-black/35 active:scale-95 transition-transform"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {confirmDelete && trip && (
        <div className="fixed inset-y-0 left-1/2 z-50 flex w-full max-w-[448px] -translate-x-1/2 items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-6 pb-10">
            <h2 className="text-[19px] font-bold text-black">Delete this plan?</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-black/50">
              It moves to your previous plans, so you can still look at it later.
            </p>
            <button
              type="button"
              onClick={deleteCurrentPlan}
              className="mt-5 w-full rounded-full bg-[#E9633B] py-4 text-[15px] font-bold text-white active:scale-[0.98] transition-transform"
            >
              Delete plan
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="mt-2 w-full py-3.5 text-[14px] font-semibold text-[#8E8E93]"
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      {editing && trip && <TripEditor trip={trip} onClose={() => setEditing(false)} />}
    </TravelShell>
  );
}

export default function HomeScreen({ view = "home" }: { view?: "home" | "trip" | "plan" }) {
  if (view === "plan") return <PremiumTripView showHistory />;
  if (view === "trip") return <PremiumTripView />;
  return <PremiumHomeView />;
}
