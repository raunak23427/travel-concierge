"use client";

import Link from "next/link";
import { useState } from "react";
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
} from "lucide-react";
import { dayDate, formatDate } from "@/lib/trip-updates";
import { useTravel } from "./TravelProvider";
import TravelShell from "./TravelShell";
import { ActivityEditor, TripEditor } from "./TripEditors";
import styles from "./travel.module.css";

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
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FFD233] border-t-transparent"></div>
            <p className="text-sm font-medium text-black/40 animate-pulse">Loading your journey...</p>
          </div>
        </div>
      ) : !trip ? (
        <motion.div 
          initial="hidden" animate="visible" variants={staggerContainer}
          className="flex flex-col h-full min-h-[70vh] pb-10"
        >
          <motion.div variants={fadeInUp} className="relative mx-5 mt-6 h-[420px] rounded-[32px] overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.12)]">
            <img
              className="absolute inset-0 w-full h-full object-cover"
              src="/goa/beaches-of-goa.jpg"
              alt="TravelBuddy Destination"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center text-center text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-lg border border-white/30">
                <Compass size={32} className="text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-3">Where are we off to?</h2>
              <p className="text-white/80 font-medium text-base mb-8 max-w-[260px] leading-relaxed">Let's craft an itinerary perfectly tuned to your vibe.</p>
              
              <Link href="/plan?new=1" className="group relative w-full flex items-center justify-center gap-2 bg-[#FFD233] text-black h-14 rounded-full font-bold text-[17px] shadow-[0_8px_24px_rgba(255,210,51,0.4)] hover:scale-[1.02] active:scale-95 transition-all">
                Start planning <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="px-5 pb-10">
          
          {/* Page Header */}
          <motion.div variants={fadeInUp} className="pt-2 pb-6 flex items-end justify-between">
            <div>
              <p className="text-[13px] font-bold text-black/40 uppercase tracking-widest mb-1.5">Your Next Journey</p>
              <h1 className="text-3xl font-bold tracking-tight text-black">Ready to go.</h1>
            </div>
            <Link href="/plan?new=1" className="w-[42px] h-[42px] rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black transition-colors active:scale-90" aria-label="Create new plan">
              <Plus size={20} />
            </Link>
          </motion.div>

          {/* Hero Trip Card */}
          <motion.section variants={fadeInUp} className="relative w-full aspect-[4/5] max-h-[460px] rounded-[32px] overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.12)] mb-8 group">
            {trip.image && failedImage !== trip.image ? (
              <img
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src={trip.image}
                alt={trip.name}
                onError={() => setFailedImage(trip.image)}
              />
            ) : (
              <div className="absolute inset-0 bg-[#1A1A1A] flex items-center justify-center">
                <MapPin className="text-white/20 w-16 h-16" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
            
            {/* Top Right Badges */}
            <div className="absolute top-5 right-5 flex flex-col gap-2 items-end">
              <div className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide shadow-lg">
                {trip.days.length} Days
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-medium shadow-lg">
                {trip.travelers} {trip.travelers === 1 ? "Traveler" : "Travelers"}
              </div>
            </div>

            {/* Bottom Content */}
            <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col">
              <div className="flex items-center gap-1.5 text-[#FFD233] font-bold text-sm tracking-wide uppercase mb-2 drop-shadow-sm">
                <MapPin size={15} strokeWidth={2.5} />
                {trip.destination} {trip.country && `• ${trip.country}`}
              </div>
              <h2 className="text-[34px] leading-[1.1] font-extrabold text-white mb-5 drop-shadow-md">
                {trip.name}
              </h2>
              
              {/* Refined Metadata */}
              <div className="flex items-center justify-between pt-5 border-t border-white/20">
                <div className="flex flex-col">
                  <span className="text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1">Dates</span>
                  <span className="text-white font-medium text-sm flex items-center gap-2">
                    <CalendarDays size={14} className="text-white/80" />
                    {formatDate(trip.startDate)} {trip.endDate && trip.endDate !== trip.startDate && `— ${formatDate(trip.endDate)}`}
                  </span>
                </div>
                
                <button 
                  onClick={() => setEditing(true)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </div>
          </motion.section>

          {/* Live Updates Notification */}
          {unread > 0 && (
            <motion.div variants={fadeInUp}>
              <Link href="/notifications" className="group flex items-center justify-between bg-white border border-[#E5E5EA] p-4 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.03)] mb-10 hover:border-black/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-[#FFFBEA]">
                    <Sparkles size={20} className="text-[#F5A623]" />
                    <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#FF3B30] border-2 border-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-black/40 uppercase tracking-widest mb-0.5">Live Updates</span>
                    <span className="text-[15px] font-bold text-black">
                      {unread} new {unread === 1 ? "update" : "updates"}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-black/40 group-hover:bg-black group-hover:text-white transition-colors">
                  <ChevronRight size={16} strokeWidth={2.5} />
                </div>
              </Link>
            </motion.div>
          )}

          {/* Itinerary Section */}
          <motion.section variants={fadeInUp}>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h3 className="text-[22px] font-bold text-black">Your Itinerary</h3>
                <p className="text-sm font-medium text-black/50">Day by day</p>
              </div>
            </div>

            {/* Premium Day Nav */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
              {trip.days.map((day) => (
                <a 
                  key={day.day} 
                  href={`#day-${day.day}`} 
                  onClick={() => setExpandedDays((current) => new Set(current).add(day.day))}
                  className="flex-shrink-0 px-5 py-2.5 rounded-full bg-white border border-[#E5E5EA] text-[13px] font-bold text-black/60 shadow-sm hover:border-black/20 hover:text-black transition-colors"
                >
                  Day {day.day}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-4 mt-2">
              {trip.days.map((day, dayIndex) => (
                <div key={day.day} id={`day-${day.day}`} className="bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-black/[0.03] overflow-hidden">
                  
                  {/* Day Header Toggle */}
                  <button
                    onClick={() => toggleDay(day.day)}
                    className="w-full flex items-center justify-between p-5 text-left active:bg-black/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] text-[#1A1A1A] flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">Day</span>
                        <span className="text-lg font-black leading-none">{String(day.day).padStart(2, "0")}</span>
                      </div>
                      <div className="flex flex-col pr-4">
                        <span className="text-[13px] font-bold text-black/40 uppercase tracking-wider mb-1">
                          {trip.startDate ? formatDate(dayDate(trip.startDate, day.day)) : `Day ${day.day}`}
                        </span>
                        <span className="text-base font-bold text-black leading-tight line-clamp-1">{day.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-black transition-transform duration-300" style={{ transform: expandedDays.has(day.day) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <ChevronDown size={16} strokeWidth={2.5} />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedDays.has(day.day) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-6 border-t border-black/[0.03] pt-5">
                          
                          {day.mustDo && (
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FFFBEA] border border-[#FFD233]/30 mb-6">
                              <Sparkles size={18} className="text-[#F5A623] mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-[#F5A623] uppercase tracking-widest mb-1">Must Do</span>
                                <strong className="text-sm font-bold text-black mb-1">{day.mustDo.activity}</strong>
                                <p className="text-[13px] text-black/70 leading-relaxed">{day.mustDo.description}</p>
                              </div>
                            </div>
                          )}

                          {!day.items.length ? (
                            <div className="text-center py-6 text-sm font-medium text-black/40">
                              A little room for adventure.
                            </div>
                          ) : (
                            <div className="relative border-l-2 border-black/[0.06] ml-6 pl-6 py-2 flex flex-col gap-8">
                              {day.items.map((item, index) => {
                                const Icon = activityIcons[item.type as keyof typeof activityIcons] || MapPin;
                                return (
                                  <div key={`${index}-${item.activity}`} className="relative group">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-white border-4 border-[#1A1A1A]" />
                                    
                                    <div className="flex justify-between items-start gap-4">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <time className="text-[13px] font-bold text-black/40">{item.time}</time>
                                          <div className="w-1 h-1 rounded-full bg-black/20" />
                                          <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-black/40">
                                            <Icon size={12} />
                                            {item.type}
                                          </div>
                                        </div>
                                        <h4 className="text-[15px] font-bold text-black mb-1.5 leading-tight">{item.activity}</h4>
                                        <p className="text-[13px] text-black/60 leading-relaxed mb-2">{item.description}</p>
                                        
                                        {item.cost > 0 && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#F2F2F7] text-[11px] font-bold text-black/60 w-fit">
                                            {money(item.cost)}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <button
                                        onClick={() => setActivityEdit({ day: day.day, index })}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-black/30 hover:bg-[#F2F2F7] hover:text-black transition-colors flex-shrink-0"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <button 
                            onClick={() => setActivityEdit({ day: day.day })}
                            className="w-full mt-6 py-3.5 rounded-xl border-2 border-dashed border-[#E5E5EA] text-[13px] font-bold text-black/40 flex items-center justify-center gap-2 hover:bg-[#F9F9FB] hover:border-black/20 hover:text-black transition-colors"
                          >
                            <Plus size={16} /> Add activity
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <Link href="/plan" className="group flex items-center justify-center gap-2 mt-6 py-4 rounded-[20px] bg-white border border-[#E5E5EA] text-sm font-bold text-black hover:border-black/20 shadow-sm transition-all active:scale-[0.98]">
              Booking & logistics <ArrowRight size={16} className="text-black/40 group-hover:text-black group-hover:translate-x-1 transition-all" />
            </Link>
          </motion.section>

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
function PremiumTripView() {
  const { trip, ready, unread } = useTravel();
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
            <Compass size={36} className="text-[#9882FF]" strokeWidth={1.5} />
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

      {editing && trip && <TripEditor trip={trip} onClose={() => setEditing(false)} />}
    </TravelShell>
  );
}

export default function HomeScreen({ view = "home" }: { view?: "home" | "trip" }) {
  if (view === "trip") return <PremiumTripView />;
  return <PremiumHomeView />;
}
