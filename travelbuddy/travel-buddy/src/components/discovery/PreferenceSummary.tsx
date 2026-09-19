"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Edit3, Sparkles, Coffee, Hotel, Mountain, X, Utensils, Car } from "lucide-react";
import { getTopTags, syncProfileTags } from "@/lib/api";

export type EditCategory = 'vibes' | 'activities' | 'stays';

/** Goa-relevant ways of getting about. Multiple selections are expected. */
const TRANSPORT_MODES = [
  { key: 'Scooter', label: 'Scooter', hint: 'Cheapest, most freedom', icon: '\u{1F6F5}' },
  { key: 'Rental Car', label: 'Rental car', hint: 'Good with luggage', icon: '\u{1F697}' },
  { key: 'Taxi', label: 'Taxi / cab', hint: 'App cabs & pre-paid', icon: '\u{1F695}' },
  { key: 'Walking', label: 'Walking', hint: 'Short hops, markets', icon: '\u{1F6B6}' },
  { key: 'Public Transport', label: 'Local bus', hint: 'Slow but very cheap', icon: '\u{1F68C}' },
  { key: 'Ferry', label: 'Ferry', hint: 'River crossings, free', icon: '\u{26F4}' },
];

export default function PreferenceSummary({
  preferences,
  budget,
  onContinue,
  onEdit,
  sessionId,
}: {
  preferences: any;
  budget: number;
  onContinue: () => void;
  onEdit: (category: EditCategory) => void;
  sessionId?: string | null;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [topVibes, setTopVibes] = useState<string[]>([]);
  const [topActs, setTopActs] = useState<string[]>([]);
  const [topStays, setTopStays] = useState<string[]>([]);
  const [topFood, setTopFood] = useState<string[]>([]);
  // Multi-select: people mix modes in Goa — scooter by day, taxi at night.
  // Persisted as a comma-joined string so the existing API contract is unchanged.
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const commitModes = (next: string[]) => {
    setTransportModes(next);
    // The itinerary reads this directly, so it works with or without a backend.
    try {
      localStorage.setItem("travelbuddy:transport-modes", JSON.stringify(next));
    } catch {
      /* private mode */
    }
    if (sessionId) {
      syncProfileTags(
        sessionId,
        preferences.profileTags,
        next.length ? next.join(', ') : 'Flexible',
      );
    }
  };
  const toggleMode = (key: string) =>
    commitModes(
      transportModes.includes(key)
        ? transportModes.filter((m) => m !== key)
        : [...transportModes, key],
    );

  // Fetch dot-product-ranked tags from backend
  useEffect(() => {
    if (!sessionId) {
      // Fallback to profile tags if no session
      setTopVibes((preferences.profileTags?.vibes || []).slice(0, 5));
      setTopActs((preferences.profileTags?.activities || []).slice(0, 5));
      setTopStays((preferences.profileTags?.stays || []).slice(0, 5));
      setTopFood((preferences.profileTags?.food || []).slice(0, 5));
      setLoading(false);
      return;
    }

    getTopTags(sessionId).then((result: any) => {
      if (result) {
        setTopVibes(result.vibes?.length > 0 ? result.vibes : (preferences.profileTags?.vibes || []).slice(0, 5));
        setTopActs(result.activities?.length > 0 ? result.activities : (preferences.profileTags?.activities || []).slice(0, 5));
        setTopStays(result.stays?.length > 0 ? result.stays : (preferences.profileTags?.stays || []).slice(0, 5));
        setTopFood(result.food?.length > 0 ? result.food : (preferences.profileTags?.food || []).slice(0, 5));
        if (result.transport) {
          setTransportModes(
            String(result.transport)
              .split(',')
              .map((t: string) => t.trim())
              .filter((t: string) => t && t !== 'Flexible'),
          );
        }
      } else {
        // Fallback to profile tags
        setTopVibes((preferences.profileTags?.vibes || []).slice(0, 5));
        setTopActs((preferences.profileTags?.activities || []).slice(0, 5));
        setTopStays((preferences.profileTags?.stays || []).slice(0, 5));
        setTopFood((preferences.profileTags?.food || []).slice(0, 5));
      }
      setLoading(false);
    });
  }, [sessionId, preferences]);

  const budgetLabel = budget >= 400000 ? 'Premium' : budget >= 150000 ? 'Comfortable' : 'Budget-Friendly';

  const sections = [
    {
      icon: <Sparkles className="w-5 h-5 text-[#FF6B1A]" />,
      label: 'Travel Style',
      values: topVibes.length > 0 ? topVibes : ['Flexible'],
    },
    {
      icon: <Coffee className="w-5 h-5 text-[#FF6B6B]" />,
      label: 'Top Activities',
      values: topActs.length > 0 ? topActs : ['Open to anything'],
    },
    {
      icon: <Hotel className="w-5 h-5 text-[#5B8FB9]" />,
      label: 'Stay Preference',
      values: topStays.length > 0 ? topStays : ['Flexible'],
    },
    {
      icon: <Utensils className="w-5 h-5 text-[#FF9500]" />,
      label: 'Food & Dining',
      values: topFood.length > 0 ? topFood : ['Flexible'],
    },
    {
      icon: <Mountain className="w-5 h-5 text-[#34C759]" />,
      label: 'Budget Bracket',
      values: [`₹${budget.toLocaleString()} - ${budgetLabel}`],
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 pt-8 pb-32">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wayzyy-logo.svg"
          alt=""
          width={48}
          height={48}
          className="w-12 h-12 rounded-2xl mb-5 shadow-[0_4px_14px_rgba(255,107,26,0.35)]"
        />
        <h1 className="text-[26px] font-bold text-[#1A1A1A] leading-snug tracking-tight">Your Travel Profile</h1>
        <p className="text-[#8E8E93] text-[14px] mt-2 leading-relaxed">Here&apos;s what we learned about your travel style</p>
      </motion.div>

      {/* Profile cards */}
      <div className="flex-1 mt-7 flex flex-col" style={{ gap: '13px' }}>
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="w-8 h-8 rounded-full border-[3px] border-[#E5E5EA] border-t-[#FF6B1A] animate-spin" />
          </motion.div>
        ) : (
          sections.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F2F2F7] flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">{s.label}</p>
                <div className="flex flex-wrap gap-2">
                  {s.values.map((v: string) => (
                    <span key={v} className="px-3 py-1.5 bg-[#F2F2F7] rounded-full text-[13px] font-medium text-[#1A1A1A]">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))
        )}

        {/* Edit Preferences Button */}
        <button onClick={() => setShowPicker(true)}
          className="w-full py-3 mt-4 text-[13px] font-medium text-[#8E8E93] flex items-center justify-center gap-1.5 active:opacity-60">
          <Edit3 className="w-3.5 h-3.5" /> Edit Preferences
        </button>

        {/* Transport Preference */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 mt-2"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#F2F2F7] flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-[#8E8E93]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1">Transport Preference</p>
              <p className="text-[12px] text-[#8E8E93]">
                Pick as many as you like — we'll mix them across the trip.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {TRANSPORT_MODES.map((m) => {
              const on = transportModes.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleMode(m.key)}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 border-2 ${
                    on
                      ? 'bg-[#FFE6D5] border-[#FF6B1A]'
                      : 'bg-[#F7F7FA] border-transparent'
                  }`}
                >
                  <span className="text-[16px] leading-none">{m.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-[#1A1A1A] truncate">
                      {m.label}
                    </span>
                    <span className="block text-[10.5px] text-[#8E8E93] truncate">
                      {m.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => commitModes([])}
            className={`w-full mt-2 rounded-2xl py-2.5 text-[12.5px] font-semibold transition-colors ${
              transportModes.length === 0
                ? 'bg-[#FFE6D5] text-[#1A1A1A]'
                : 'bg-[#F7F7FA] text-[#8E8E93]'
            }`}
          >
            Flexible — no preference
          </button>
        </motion.div>
      </div>

      {/* CTA. The floating Discover / Itineraries pill is fixed above the
          bottom edge, so this needs to clear it rather than sit under it. */}
      <div className="mt-6 space-y-3 pb-28">
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          className="w-full py-4 bg-[#FF6B1A] text-[#1A1A1A] rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,107,26,0.3)]"
        >
          Find My Destinations
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Category Picker Bottom Sheet */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowPicker(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-6 pt-5 pb-8 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
            >
              <div className="w-10 h-1 rounded-full bg-[#E5E5EA] mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[17px] font-bold text-[#1A1A1A]">What would you like to change?</h3>
                <button onClick={() => setShowPicker(false)} className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center">
                  <X className="w-4 h-4 text-[#8E8E93]" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { key: 'vibes' as EditCategory, icon: <Sparkles className="w-5 h-5 text-[#FF6B1A]" />, label: 'Vibes', desc: 'Change your travel style & mood' },
                  { key: 'activities' as EditCategory, icon: <Coffee className="w-5 h-5 text-[#FF6B6B]" />, label: 'Activities', desc: 'Update things you love to do' },
                  { key: 'stays' as EditCategory, icon: <Hotel className="w-5 h-5 text-[#5B8FB9]" />, label: 'Stay', desc: 'Pick a different stay style' },
                ].map((opt) => (
                  <motion.button
                    key={opt.key}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setShowPicker(false);
                      onEdit(opt.key);
                    }}
                    className="flex items-center gap-4 p-4 bg-[#F9F9FB] rounded-2xl active:bg-[#F2F2F7] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[#1A1A1A]">{opt.label}</p>
                      <p className="text-[12px] text-[#8E8E93] mt-0.5">{opt.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#C7C7CC] flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
