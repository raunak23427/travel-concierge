"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { hotelApiPromiseMap } from "@/components/itinerary/ItinerariesPage";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, MapPin, Clock, Star, Plane, Hotel, Car, Camera,
  Utensils, Music, RefreshCw, ArrowRight, Zap, Leaf, TrendingUp,
  TrendingDown, AlertTriangle, ChevronDown, ChevronUp, X, Sparkles, Map, Check, ArrowDown, House,
  Waves, Umbrella, ShipWheel, Fish, Mountain, Droplets, Landmark, Footprints,
  ChefHat, Ship, Sailboat, Compass, Martini, Wine, Sun, ShoppingBag, Coffee, Bus, Bird, PawPrint
} from "lucide-react";
import { TripItinerary, ItineraryDay, MustDoActivity } from "@/data/itineraryMock";
import { SessionData } from "@/components/onboarding/SessionInit";
import CityMap from "@/components/itinerary/CityMap";
import GoaMap, { type MapStop } from "./GoaMap";
import TransportTab from "./TransportTab";
import {
  locate,
  route,
  formatMinutes,
  GOA_CENTRE,
  readTransportModes,
  TRANSPORT_META,
  type TransportMode,
} from "@/lib/goa-geo";
import HotelStreetViewModal from "@/components/itinerary/HotelStreetViewModal";
import LocationStreetViewModal, { LocationType } from "@/components/itinerary/LocationStreetViewModal";
import { getCityMapData } from "@/data/cityLandmarks";
import { deriveDurationLabel } from "@/lib/utils";
import { alternativesFor, type Alternative } from "@/data/goaAlternatives";
import { calculateItineraryCosts, withBudgetAlignedItineraryCosts, withCalculatedItineraryCosts } from "@/lib/itineraryCosts";


const TYPE_COLORS: Record<string, string> = {
  travel: '#5B8FB9', activity: '#FF6B1A', food: '#FF6B6B', relax: '#34C759',
};

type RouteStop = { activity: string; time?: string };

function timelineStops(day: ItineraryDay): RouteStop[] {
  const alignedMustDo = day.mustDo?.alignsWithPreferences ? [day.mustDo] : [];
  return [...day.items, ...alignedMustDo]
    .filter((item) => item.activity)
    .sort((a, b) => {
      const timeA = String(a.time || "").split(":").map(Number);
      const timeB = String(b.time || "").split(":").map(Number);
      return (timeA[0] * 60 + (timeA[1] || 0)) - (timeB[0] * 60 + (timeB[1] || 0));
    });
}

function routeKey(dayIndex: number, from: string, to: string): string {
  return `${dayIndex}|${from}|${to}`;
}

type TravelTime = {
  minutes: number;
  distanceKm: number | null;
  trafficDelayMinutes: number | null;
  estimated: boolean;
} | null;

function getActivityIconComponent(activityName: string, type: string) {
  const name = (activityName || '').toLowerCase();
  if (name.includes('scuba') || name.includes('water sport')) return Waves;
  if (name.includes('beach')) return Umbrella;
  if (name.includes('waterfall')) return Droplets;
  if (name.includes('cruise') || name.includes('boat') || name.includes('sail')) return Ship;
  if (name.includes('walk') || name.includes('hike') || name.includes('trek')) return Footprints;
  if (name.includes('heritage') || name.includes('church') || name.includes('temple') || name.includes('fort') || name.includes('basilica') || name.includes('cathedral')) return Landmark;
  if (name.includes('seafood') || name.includes('fish')) return Fish;
  if (name.includes('dinner') || name.includes('lunch') || name.includes('breakfast') || name.includes('food') || type === 'food') return Utensils;
  if (name.includes('party') || name.includes('club') || name.includes('nightlife') || name.includes('bar')) return Martini;
  if (name.includes('photo')) return Camera;
  if (name.includes('sunset')) return Sun;
  if (name.includes('shop') || name.includes('market')) return ShoppingBag;
  if (name.includes('cafe') || name.includes('coffee')) return Coffee;
  if (name.includes('spa') || name.includes('massage') || name.includes('relax') || type === 'relax') return Sparkles;
  if (name.includes('nature') || name.includes('garden') || name.includes('park') || name.includes('plantation')) return Leaf;
  if (name.includes('wildlife') || name.includes('animal') || name.includes('bird')) return Bird;
  if (name.includes('mountain') || name.includes('adventure')) return Mountain;
  if (name.includes('transport') || name.includes('airport') || name.includes('bus') || name.includes('car') || type === 'travel') return Car;
  return Compass;
}

function getSmartReasoning(item: any, sessionData: any, itinerary: any) {
  const name = (item.activity || item.name || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const type = item.type;
  const cost = item.cost || 0;
  
  const reasons = [];

  // Match style
  let styleTitle = "✨ MATCHES YOUR STYLE";
  let styleText = "Based on your overall travel profile, this experience aligns well with your preferences.";
  
  // Use explicit recommendation reason if this is the main destination activity
  if ((item.activity === itinerary?.destination || item.name === itinerary?.destination) && itinerary?.recommendationReason?.text) {
    styleText = itinerary.recommendationReason.text;
  } else if (name.includes('scuba') || name.includes('water') || name.includes('adventure')) {
    styleText = "You showed a strong preference for Adventure and Water Sports experiences during discovery.";
  } else if (name.includes('beach') || name.includes('sunset')) {
    styleText = "You repeatedly liked Beach, Sunset, and Relaxed experiences — all core characteristics of this stop.";
  } else if (name.includes('seafood') || name.includes('shack') || name.includes('fish')) {
    styleTitle = "🍤 MATCHES YOUR FOOD STYLE";
    styleText = "You showed a distinct preference for Seafood and Local Goan dining experiences.";
  } else if (name.includes('church') || name.includes('fort') || name.includes('basilica') || name.includes('heritage')) {
    styleTitle = "🏛️ MATCHES YOUR INTERESTS";
    styleText = "Your profile highlights a strong interest in Heritage, Culture, and History.";
  } else if (name.includes('walk') || name.includes('fontainhas')) {
    styleText = "You liked Walking tours, Culture, and Photography, making this historic area a perfect fit.";
  } else if (name.includes('cruise') || name.includes('boat') || name.includes('dinner')) {
    styleText = "You indicated an interest in Scenic evening experiences and waterfront dining.";
  } else if (name.includes('dudhsagar') || name.includes('waterfall') || name.includes('nature')) {
    styleText = "You selected Nature and Adventure as key parts of your ideal trip.";
  }
  reasons.push({ title: styleTitle, text: styleText });

  // Location / Route / Day
  let locTitle = "📍 FITS YOUR ROUTE";
  let locText = `This fits naturally into your ${itinerary?.destination || 'Goa'} itinerary.`;
  if (name.includes('baga') || name.includes('candolim') || name.includes('calangute')) {
    locText = "Located in North Goa, making it a natural fit with your current stay area without excessive travel.";
  } else if (name.includes('seafood') || name.includes('shack')) {
    locText = "This dining stop is near your existing beach activities, reducing unnecessary travel time.";
  } else if (name.includes('bom jesus') || name.includes('church')) {
    locTitle = "📍 FITS YOUR DAY";
    locText = "It clusters perfectly with the heritage-focused portion of your itinerary in Old Goa.";
  } else if (name.includes('dudhsagar') || name.includes('waterfall')) {
    locText = "While further inland, it is scheduled as a dedicated day trip so it won't conflict with your beach days.";
  }
  reasons.push({ title: locTitle, text: locText });

  // Budget
  if (cost > 0) {
    let budgetTitle = "💰 BUDGET FIT";
    let budgetText = `At approximately ₹${cost.toLocaleString()}, this fits within your allocated budget.`;
    if (cost < 1000) {
      budgetText = `With an estimated spend starting around ₹${cost.toLocaleString()}, it gives you a high-match experience without consuming a large portion of your activity budget.`;
    } else if (cost > 3000) {
      budgetTitle = "💰 BUDGET IMPACT";
      budgetText = `At approximately ₹${cost.toLocaleString()}, this is a higher-cost activity, so TravelBuddy balanced it against your overall budget.`;
    }
    reasons.push({ title: budgetTitle, text: budgetText });
  }

  // Timing / Extra
  if (name.includes('sunset') || item.time?.startsWith('17:') || item.time?.startsWith('18:')) {
    reasons.push({ title: "⏰ TIMING", text: "Sunset timing makes this a natural fit for the evening slot on your itinerary." });
  } else if (name.includes('scuba') || name.includes('waterfall')) {
    reasons.push({ title: "☀️ TIMING", text: "This experience is better suited to a daytime slot with suitable weather conditions." });
  } else if (name.includes('cruise') || name.includes('dinner')) {
    reasons.push({ title: "🌃 EVENING EXPERIENCE", text: "A scenic transition from your daytime activities into a relaxing evening." });
  } else if (name.includes('seafood') || name.includes('shack')) {
    reasons.push({ title: "🌴 LOCAL EXPERIENCE", text: "Instead of a generic restaurant, this gives you a more locally focused Goan dining experience." });
  } else if (name.includes('bom jesus') || name.includes('church')) {
    reasons.push({ title: "🌴 EXPERIENCE FACT", text: "It is a UNESCO World Heritage site within the Churches and Convents of Goa." });
  } else if (name.includes('fontainhas')) {
    reasons.push({ title: "🌴 EXPERIENCE FACT", text: "It is Asia's only Latin Quarter, known for its vibrant colonial architecture." });
  }

  // TravelBuddy Take
  let take = "This adds a great balance to your overall trip.";
  if (name.includes('baga') || name.includes('beach')) take = "A strong match for the relaxed, scenic side of your trip.";
  else if (name.includes('scuba') || name.includes('waterfall')) take = "This is your itinerary's high-energy highlight.";
  else if (name.includes('seafood')) take = "This adds a distinctly Goan food experience without taking you far from your planned route.";
  else if (name.includes('bom jesus') || name.includes('fontainhas')) take = "This adds cultural depth to an itinerary otherwise weighted toward beaches and outdoor activities.";
  else if (name.includes('cruise')) take = "A memorable way to wind down your day on the water.";

  return { reasons, take };
}

export default function ItineraryView({
  itinerary: initialItinerary,
  onReset,
  onBack,
  onBook,
  sessionData,
  travelCashBalance = 0,
  destinationId,
}: {
  itinerary: TripItinerary;
  onReset: () => void;
  onBack?: () => void;
  onBook?: (itinerary: TripItinerary) => void;
  sessionData?: SessionData | null;
  travelCashBalance?: number;
  destinationId?: string;
}) {
  // Progressive loading: start from AI data, upgrade with HotelAPI when it arrives
  const [itinerary, setItinerary] = useState<TripItinerary>(() =>
    withBudgetAlignedItineraryCosts(initialItinerary),
  );
  const [hotelApiLoading, setHotelApiLoading] = useState(false);
  const hotelApiSubscribed = useRef(false);

  useEffect(() => {
    if (hotelApiSubscribed.current) return;
    const key = destinationId || initialItinerary.destination?.toLowerCase().replace(/\s+/g, '');
    if (!key) return;
    const hotelApiPromise = hotelApiPromiseMap.get(key);
    if (!hotelApiPromise) return;
    hotelApiSubscribed.current = true;
    setHotelApiLoading(true);
    hotelApiPromise
      .then((hotelApiData) => {
        if (hotelApiData) {
          setItinerary((prev) =>
            withBudgetAlignedItineraryCosts({
              ...prev,
              hotel: hotelApiData.hotel ?? prev.hotel,
              flights: hotelApiData.flights ?? prev.flights,
              transfers: hotelApiData.transfers ?? prev.transfers,
              breakdown: hotelApiData.breakdown ?? prev.breakdown,
              totalCost: hotelApiData.totalCost ?? prev.totalCost,
              budget: hotelApiData.budget ?? prev.budget,
            }, prev.budget),
          );
        }
      })
      .catch(() => { /* keep seed data on HotelAPI failure */ })
      .finally(() => {
        setHotelApiLoading(false);
        hotelApiPromiseMap.delete(key);
      });
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeTab, setActiveTab] = useState<'days' | 'activities' | 'food' | 'transport' | 'map' | 'flights' | 'hotel' | 'budget'>('days');
  const [activeDay, setActiveDay] = useState(0);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [activeHotelIdx, setActiveHotelIdx] = useState(0);
  const [hotelDetailOpen, setHotelDetailOpen] = useState(false);
  const [streetViewHotel, setStreetViewHotel] = useState<{
    name: string;
    locationText: string;
  } | null>(null);
  const [streetViewLocation, setStreetViewLocation] = useState<{
    name: string;
    description: string;
    type: LocationType;
  } | null>(null);
  const [flightDetailIdx, setFlightDetailIdx] = useState<number | null>(null);
  const [wikiImage, setWikiImage] = useState<string | null>(null);
  // Track which cards are expanded to show full description
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [aiReasonOpen, setAiReasonOpen] = useState<any>(null);
  type ReplaceStatus = 'selecting' | 'success' | 'undone';
  const [replaceState, setReplaceState] = useState<{
    status: ReplaceStatus;
    dayIndex: number;
    itemIndex: number;
    originalItem: any;
    originalDestination?: string;
    originalMatchScore?: number;
  } | null>(null);
  const [selectedAlternative, setSelectedAlternative] = useState<Alternative | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>("Scooter");
  const [travelTimes, setTravelTimes] = useState<Record<string, TravelTime>>({});

  useEffect(() => {
    setTransportMode(readTransportModes()[0] || "Scooter");
  }, []);


  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  useEffect(() => {
    if (itinerary?.destination) {
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(itinerary.destination)}`)
        .then(res => res.json())
        .then(data => {
          if (data.thumbnail?.source) {
            setWikiImage(data.thumbnail.source);
          }
        })
        .catch(() => { });
    }
  }, [itinerary?.destination]);

  // Defensive null-safety for API-returned data that may have different shapes
  const days = itinerary?.days ?? [];

  const applyReplacement = (dayIndex: number, itemIndex: number, alt: Alternative, originalItem: any, newScore?: number) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      const nextDays = [...(prev.days || [])];
      if (!nextDays[dayIndex]) return prev;

      const items = [...(nextDays[dayIndex].items || [])];
      
      items[itemIndex] = {
        ...items[itemIndex],
        activity: alt.activity,
        description: alt.description,
        cost: alt.cost,
        time: alt.duration || items[itemIndex].time,
      };

      nextDays[dayIndex] = { ...nextDays[dayIndex], items };

      let newDestination = prev.destination;
      let newMatchScore = prev.matchScore;
      if (newScore !== undefined && originalItem.activity === prev.destination) {
        newDestination = alt.activity;
        newMatchScore = newScore;
      }
        
      return withCalculatedItineraryCosts({
        ...prev,
        destination: newDestination,
        matchScore: newMatchScore,
        days: nextDays,
      });
    });
    
    setReplaceState(prev => prev ? { ...prev, status: 'success' } : null);
  };

  const performUndo = () => {
    if (!replaceState) return;
    setItinerary(prev => {
      if (!prev) return prev;
      const nextDays = [...prev.days];
      if (!nextDays[replaceState.dayIndex]) return prev;
      const day = {...nextDays[replaceState.dayIndex]};
      const items = [...(day.items || [])];
      
      items[replaceState.itemIndex] = replaceState.originalItem;
      
      day.items = items;
      nextDays[replaceState.dayIndex] = day;
      
      let restoredDestination = prev.destination;
      let restoredMatchScore = prev.matchScore;
      if (replaceState.originalDestination && replaceState.originalMatchScore !== undefined) {
         restoredDestination = replaceState.originalDestination;
         restoredMatchScore = replaceState.originalMatchScore;
      }

      return withCalculatedItineraryCosts({
        ...prev,
        destination: restoredDestination,
        matchScore: restoredMatchScore,
        days: nextDays,
      });
    });
    setReplaceState(prev => prev ? { ...prev, status: 'undone' } : null);
  };

  // Geocode every stop once so the map can pin the real places.
  const [mapStops, setMapStops] = useState<MapStop[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMapLoading(true);
      const found: MapStop[] = [];
      for (const d of days) {
        for (const it of d.items || []) {
          if (!it.activity) continue;
          const at = await locate(it.activity);
          if (at) found.push({ label: it.activity, day: d.day, at });
        }
      }
      if (!cancelled) {
        setMapStops(found);
        setMapLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary?.destination, days.length]);

  // Get each between-activity duration from TomTom Routing API using the selected
  // transport mode. Failed requests stay visibly unavailable rather than
  // showing a made-up duration.
  useEffect(() => {
    const pairs = days.flatMap((day, dayIndex) => {
      const stops = timelineStops(day);
      return stops.slice(0, -1).map((from, index) => ({
        key: routeKey(dayIndex, from.activity, stops[index + 1].activity),
        from: from.activity,
        to: stops[index + 1].activity,
      }));
    });

    if (pairs.length === 0) {
      setTravelTimes({});
      return;
    }

    let cancelled = false;
    setTravelTimes({});

    (async () => {
      try {
        const results = await Promise.all(
          pairs.map(async (pair) => {
            try {
              const [originAt, destinationAt] = await Promise.all([
                locate(pair.from),
                locate(pair.to),
              ]);
              // Nominatim/gazetteer results are preferred. If either place is
              // unavailable, use the nearest practical fallback reference for
              // Goa so the UI can still show an honest estimate.
              const origin = originAt || GOA_CENTRE;
              const destination = destinationAt || GOA_CENTRE;
              const leg = await route(origin, destination, "driving", transportMode);
              return [
                pair.key,
                {
                  minutes: leg.minutes,
                  distanceKm: leg.km,
                  trafficDelayMinutes: leg.trafficDelayMinutes,
                  estimated: !leg.routed || !originAt || !destinationAt,
                },
              ] as const;
            } catch {
              const leg = await route(GOA_CENTRE, GOA_CENTRE, "driving", transportMode);
              return [
                pair.key,
                {
                  minutes: leg.minutes,
                  distanceKm: leg.km,
                  trafficDelayMinutes: null,
                  estimated: true,
                },
              ] as const;
            }
          }),
        );

        if (!cancelled) {
          setTravelTimes(Object.fromEntries(results));
        }
      } catch {
        if (!cancelled) {
          const fallbackLeg = await route(GOA_CENTRE, GOA_CENTRE, "driving", transportMode);
          setTravelTimes(
            Object.fromEntries(
              pairs.map((pair) => [
                pair.key,
                {
                  minutes: fallbackLeg.minutes,
                  distanceKm: fallbackLeg.km,
                  trafficDelayMinutes: null,
                  estimated: true,
                },
              ]),
            ),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days, itinerary?.country, itinerary?.destination, transportMode]);

  const durationLabel = deriveDurationLabel(days, itinerary?.duration ?? "");
  const flights = itinerary?.flights ?? [];
  const transfers = itinerary?.transfers ?? [];
  const { breakdown, totalCost: displayedTotalCost } = calculateItineraryCosts(itinerary);
  const mustDoAddOnCost = days.reduce((sum, day) => {
    const mustDo = day.mustDo;
    return !mustDo?.alignsWithPreferences && mustDo?.includedInTripCost
      ? sum + (mustDo.cost || 0)
      : sum;
  }, 0);

  const setOptionalMustDoIncluded = (dayIndex: number, included: boolean) => {
    setItinerary((previous) => {
      const nextDays = (previous.days ?? []).map((day, index) =>
        index === dayIndex && day.mustDo
          ? {
              ...day,
              mustDo: { ...day.mustDo, includedInTripCost: included },
            }
          : day,
      );
      return withCalculatedItineraryCosts({ ...previous, days: nextDays });
    });
  };

  // Budget alignment
  const selectedBudget = Number(sessionData?.budget);
  const itineraryBudget = Number(itinerary?.budget);
  const userBudget = selectedBudget > 0
    ? selectedBudget
    : itineraryBudget > 0
      ? itineraryBudget
      : 150000;
  const budgetDiff = userBudget - displayedTotalCost;
  const budgetStatus = budgetDiff >= 0
    ? { label: 'Within Budget', color: '#34C759', icon: TrendingDown }
    : { label: 'Slightly Above', color: '#FF9500', icon: TrendingUp };

  const TABS = [
    { key: 'days' as const, label: 'Days' },
    { key: 'activities' as const, label: 'Activities' },
    { key: 'food' as const, label: 'Food' },
    { key: 'transport' as const, label: 'Transport' },
    { key: 'map' as const, label: 'Map' },
  ];

  // Always have a valid back handler.
  // We no longer delay this or manipulate internal UI state, as that caused a
  // 'double-exit' condition that worsened Framer Motion's unmount freeze.
  const handleBack = onBack ?? onReset;

  // Build human-readable traveler label e.g. "2 Adults, 1 Child"
  const travelerLabel = (() => {
    const adults = sessionData?.adults ?? sessionData?.travelers ?? 2;
    const children = sessionData?.children ?? 0;
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`);
    if (children > 0) parts.push(`${children} ${children === 1 ? 'Child' : 'Children'}`);
    return parts.length > 0 ? parts.join(', ') : null;
  })();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F7F5FF]">
      {/* ═══ HERO ═══ */}
      <div className="relative h-[320px] flex-shrink-0">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
          <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full text-[12px] font-bold text-white shadow-sm hover:bg-black/30 transition">
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} /> Back to Suggestions
          </motion.button>
          <Link href="/home"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-[12px] font-bold text-[#1A1A1A] shadow-sm hover:bg-gray-50 transition active:scale-95">
            <House className="w-3.5 h-3.5" /> Home
          </Link>
        </div>
        <img
          src={itinerary.image || wikiImage || 'https://images.unsplash.com/photo-1499856374114-f0e1a1b0e4b8?w=800&q=80'}
          alt={itinerary.destination}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 z-10 flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3 text-white/80" />
              <p className="text-white/90 text-[12px] font-medium">{itinerary.country || 'India'}</p>
            </div>
            <h1 className="text-[28px] font-bold text-white drop-shadow-sm leading-tight mb-1">{itinerary.destination}</h1>
            <p className="text-white/80 text-[13px] font-medium line-clamp-2">{itinerary.shortDescription || 'Experience the best of this beautiful destination.'}</p>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            {[
              { icon: Clock, label: durationLabel, color: '#FFFFFF' },
              { icon: Star, label: `${itinerary?.matchScore ?? 0}% match`, color: '#FF6B1A', fill: true },
              { icon: budgetStatus.icon, label: budgetStatus.label, color: budgetStatus.color },
              ...(mustDoAddOnCost > 0 ? [{ icon: Sparkles, label: `+₹${mustDoAddOnCost.toLocaleString()}`, color: '#A855F7' }] : []),
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }}
                  {...(s.fill ? { fill: s.color } : {})} />
                <p className="text-[12px] font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ WHY RECOMMENDED ═══ */}


      {/* ═══ TABS ═══ */}
      <div className="bg-white flex border-b border-[#F2F2F7]">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative flex-1 py-3 text-[13px] font-semibold capitalize transition-colors ${activeTab === tab.key ? 'text-[#1A1A1A]' : 'text-[#8E8E93]'
              }`}>
            {tab.label}
            {activeTab === tab.key && (
              <motion.div layoutId="tab-line"
                className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#FF6B1A] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-24">
          {/* ─── DAYS TAB ─── */}
          {activeTab === 'days' && (
            <motion.div key="days" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
              {days.map((day, dayIdx) => (
                <motion.div key={day.day}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIdx * 0.05 }}
                  className="flex flex-col"
                >
                  {/* Day header - collapsible */}
                  <button
                    onClick={() => setExpandedDay(expandedDay === dayIdx ? null : dayIdx)}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="w-[46px] h-[46px] rounded-full bg-[#FF6B1A] flex items-center justify-center flex-shrink-0">
                      <span className="text-[16px] font-bold text-[#1A1A1A]">D{day.day}</span>
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-[16px] leading-tight text-[#1A1A1A] truncate">{day.title}</p>
                      <p className="text-[13px] font-medium text-[#8E8E93] mt-1">{day.items.length} activities</p>
                    </div>
                    {expandedDay === dayIdx ? (
                      <ChevronUp className="w-5 h-5 text-[#8E8E93] flex-shrink-0" strokeWidth={2.5} />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#8E8E93] flex-shrink-0" strokeWidth={2.5} />
                    )}
                  </button>

                  {/* Expanded activities */}
                  <AnimatePresence>
                    <div key="dummy" style={{ display: 'none' }} />
                    {expandedDay === dayIdx && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="overflow-hidden"
      >
                          {/* ─── TIMELINE (non-aligned pinned card + sorted items) ─── */}
                          <div style={{ paddingTop: '8px', paddingLeft: '24px', borderLeft: '2px solid rgba(255,107,26, 0.3)', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                          {/* NON-ALIGNED: pinned at top */}
                          {day.mustDo && !day.mustDo.alignsWithPreferences && (() => {
                            const md = day.mustDo as MustDoActivity;
                            const isManuallyAdded = md.includedInTripCost === true;
                            const IconComp = getActivityIconComponent(md.activity || (md as any).name, md.type);
                            const color = TYPE_COLORS[md.type] || '#8E8E93';
                            return (
                              <div key="mustdo-pinned" className="relative">
                                {/* Gold dot on timeline */}
                                <div className="absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white bg-[#FF6B1A]" />
                                <div
                                  onClick={() => toggleCardExpansion(`pinned-mustdo-${dayIdx}`)}
                                  className="bg-[#FFF1E8] rounded-xl p-3 flex items-start gap-3 cursor-pointer"
                                  style={{ border: '1px solid #FF6B1A', boxShadow: '0 0 0 2px rgba(255,107,26,0.15)' }}
                                >
                                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: color + '15' }}>
                                    <IconComp className="w-4 h-4" style={{ color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {/* Time + badges */}
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[10px] font-medium text-[#8E8E93]">{md.type === 'activity' ? '—' : '—'}</span>
                                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#92400E] bg-[#FF6B1A]/30 px-1.5 py-0.5 rounded-full">Must Do</span>
                                    </div>
                                    <p className="font-semibold text-[13px] text-[#1A1A1A] truncate">{md.activity}</p>
                                    <p className={`text-[11px] text-[#8E8E93] transition-all duration-200 ease-in-out ${expandedCards.has(`pinned-mustdo-${dayIdx}`) ? 'break-words' : 'truncate'}`}>
                                      {md.description}
                                    </p>
                                    {/* Add / Remove */}
                                    <div className="mt-1.5">
                                      {!isManuallyAdded ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOptionalMustDoIncluded(dayIdx, true);
                                          }}
                                          className="flex items-center gap-1 text-[10px] font-bold text-[#92400E] bg-[#FF6B1A]/30 px-2 py-0.5 rounded-full active:opacity-70 transition-opacity"
                                        >
                                          + Add — {md.cost === 0 ? 'not covered' : `₹${md.cost.toLocaleString()}`}
                                        </button>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-semibold">✓ Added</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                            setOptionalMustDoIncluded(dayIdx, false);
                                            }}
                                            className="text-[9px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-0.5 rounded-full active:opacity-70"
                                          >
                                            − Remove
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {md.cost !== undefined && (
                                    <span className="text-[11px] font-bold text-[#6B6B6B] flex-shrink-0 whitespace-nowrap mt-0.5">
                                      {md.cost === 0 ? 'not covered' : `₹${md.cost.toLocaleString()}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* TIMELINE ITEMS + aligned mustDo injected in sort order */}
                          {(() => {
                            const md = day.mustDo as MustDoActivity | undefined;
                            const isAligned = md?.alignsWithPreferences === true;

                            // Build a merged list: regular items + mustDo (if aligned)
                            type TimelineEntry = { isMustDo: true; data: MustDoActivity } | { isMustDo: false; data: typeof day.items[number] };
                            const entries: TimelineEntry[] = [
                              ...day.items.map(it => ({ isMustDo: false as const, data: it })),
                              ...(isAligned && md ? [{ isMustDo: true as const, data: md }] : []),
                            ].sort((a, b) => {
                              const tA = (a.data as any).time ? String((a.data as any).time).split(':').map(Number) : [0, 0];
                              const tB = (b.data as any).time ? String((b.data as any).time).split(':').map(Number) : [0, 0];
                              return (tA[0] * 60 + (tA[1] || 0)) - (tB[0] * 60 + (tB[1] || 0));
                            });

                            return entries.map((entry, idx) => {
                              const nextEntry = entries[idx + 1];
                              const travelKey = nextEntry
                                ? routeKey(dayIdx, String((entry.data as any).activity || ""), String((nextEntry.data as any).activity || ""))
                                : "";
                              const travelTime = travelKey ? travelTimes[travelKey] : undefined;
                              const travelTimeLabel = travelTime === undefined
                                ? "ROUTING…"
                                : travelTime === null
                                  ? "TIME UNAVAILABLE"
                                  : `${travelTime.estimated ? "~" : ""}${formatMinutes(travelTime.minutes)}${travelTime.distanceKm === null ? "" : ` · ${travelTime.distanceKm} KM`}${travelTime.estimated ? " · ESTIMATED" : travelTime.trafficDelayMinutes === null ? " · ROAD ROUTE" : travelTime.trafficDelayMinutes > 0 ? ` · TRAFFIC +${travelTime.trafficDelayMinutes} MIN` : " · TRAFFIC CLEAR"}`.toUpperCase();

                              if (entry.isMustDo) {
                                // ── Aligned Must Do: highlighted inline card ──
                                const m = entry.data;
                                const IconComp = getActivityIconComponent(m.activity || (m as any).name, m.type);
                                const color = TYPE_COLORS[m.type] || '#8E8E93';
                                return (
                                  <div key="mustdo-inline" className="relative">
                                    {/* Gold dot */}
                                    <div className="absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white bg-[#FF6B1A]" />
                                    <div
                                      onClick={() => toggleCardExpansion(`inline-mustdo-${dayIdx}`)}
                                      className="bg-[#FFF1E8] rounded-xl p-3 mb-2 flex items-start gap-3 cursor-pointer"
                                      style={{ border: '1px solid #FF6B1A', boxShadow: '0 0 0 2px rgba(255,107,26,0.15)' }}
                                    >
                                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: color + '15' }}>
                                        <IconComp className="w-4 h-4" style={{ color }} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        {/* Time row */}
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <p className="text-[10px] font-medium text-[#8E8E93]">{m.time || ''}</p>
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#92400E] bg-[#FF6B1A]/30 px-1.5 py-0.5 rounded-full">Must Do</span>
                                          <span className="text-[9px] font-bold text-white bg-[#34C759] px-1.5 py-0.5 rounded-full">✓ Matches You</span>
                                        </div>
                                        <p className="font-semibold text-[13px] text-[#1A1A1A] truncate">{m.activity}</p>
                                        <p className={`text-[11px] text-[#8E8E93] transition-all duration-200 ease-in-out ${expandedCards.has(`inline-mustdo-${dayIdx}`) ? 'break-words' : 'truncate'}`}>
                                          {m.description}
                                        </p>
                                        {/* Street view for the must-do location */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setStreetViewLocation({
                                              name: m.activity,
                                              description: m.description || itinerary.destination,
                                              type: 'sightseeing',
                                            });
                                          }}
                                          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#C2410C] bg-[#FF6B1A]/15 px-2 py-1 rounded-full active:opacity-70 hover:bg-[#FF6B1A]/25 transition-colors"
                                        >
                                          <MapPin className="w-2.5 h-2.5" />
                                          View Street View
                                        </button>
                                      </div>
                                      {m.cost !== undefined && (
                                        <span className="text-[11px] font-bold text-[#6B6B6B] flex-shrink-0 whitespace-nowrap mt-0.5">
                                          {m.cost === 0 ? 'not covered' : `₹${m.cost.toLocaleString()}`}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              // ── Regular activity card ──
                              const item = entry.data;
                              const IconComp = getActivityIconComponent(item.activity || (item as any).name, item.type);
                              const color = TYPE_COLORS[item.type] || '#8E8E93';
                              const isHotelActivity = item.type === 'travel' && (
                                /hotel|check.?in|check.?out|settle|arrive/i.test(item.activity + ' ' + item.description)
                              ) && itinerary.hotel;
                              return (
                                <div key={idx} className="relative">
                                  {/* Dot on timeline */}
                                  <div className="absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white"
                                    style={{ backgroundColor: color }} />
                                  <div 
      onClick={() => toggleCardExpansion(`item-${dayIdx}-${idx}`)}
      className="bg-[#F9F9FB] rounded-xl p-3 mb-2 flex flex-col gap-3 cursor-pointer"
    >
      <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                      style={{ backgroundColor: color + '15' }}>
                                      <IconComp className="w-4 h-4" style={{ color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-medium text-[#8E8E93]">{item.time}</p>
                                      <p className="font-semibold text-[13px] text-[#1A1A1A] truncate">{item.activity}</p>
                                      <p className={`text-[11px] text-[#8E8E93] transition-all duration-200 ease-in-out ${expandedCards.has(`item-${dayIdx}-${idx}`) ? 'break-words' : 'truncate'}`}>
                                        {item.description}
                                      </p>
                                      {isHotelActivity && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setStreetViewHotel({
                                              name: (itinerary.hotel as any).name,
                                              locationText: (itinerary.hotel as any).address || (itinerary.hotel as any).location || itinerary.destination,
                                            });
                                          }}
                                          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#5B8FB9] bg-[#5B8FB9]/10 px-2 py-1 rounded-full active:opacity-70"
                                        >
                                          <Map className="w-2.5 h-2.5" />
                                          View Hotel Street View
                                        </button>
                                      )}
                                      {!isHotelActivity && (item.type === 'activity' || item.type === 'food' || item.type === 'relax') && (
                                        <button
                                          onClick={() => setStreetViewLocation({
                                            name: item.activity,
                                            description: item.description || itinerary.destination,
                                            type: item.type === 'food' ? 'restaurant' : item.type === 'relax' ? 'relax' : 'sightseeing',
                                          })}
                                          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#C2410C] bg-[#FF6B1A]/15 px-2 py-1 rounded-full active:opacity-70 hover:bg-[#FF6B1A]/25 transition-colors"
                                        >
                                          <MapPin className="w-2.5 h-2.5" />
                                          View Street View
                                        </button>
                                      )}
                                    </div>
                                    {item.cost !== undefined && (
                                      <span className="text-[11px] font-bold text-[#6B6B6B] flex-shrink-0 whitespace-nowrap mt-0.5">
                                        {item.cost === 0 ? 'not covered' : `₹${item.cost.toLocaleString()}`}
                                      </span>
                                    )}
      </div>
      <div className="flex gap-2 pt-2 border-t border-[#E5E5EA]/60 w-full" onClick={e => e.stopPropagation()}>
        <button onClick={() => setAiReasonOpen(item)} className="flex-1 py-1.5 bg-[#FFF3EC] rounded-md text-[11px] font-bold text-[#C2410C] flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" /> Why this?
        </button>
        <button onClick={() => { setReplaceState({ status: 'selecting', dayIndex: dayIdx, itemIndex: idx, originalItem: item, originalDestination: itinerary?.destination, originalMatchScore: itinerary?.matchScore }); setSelectedAlternative(null); }} className="flex-1 py-1.5 bg-[#F2F2F7] rounded-md text-[11px] font-bold text-[#1A1A1A] flex items-center justify-center gap-1">
          <RefreshCw className="w-3 h-3" /> Replace
        </button>
      </div>
    </div>
    {idx < entries.length - 1 && (
      <div className="flex items-center gap-2 mb-3 -mt-1 ml-6 relative z-10">
        <div className="w-5 h-5 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center">
          <Car className="w-3 h-3 text-[#8E8E93]" />
        </div>
        <span className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">
          {TRANSPORT_META[transportMode].icon} {travelTimeLabel} · {transportMode.toUpperCase()}
        </span>
      </div>
    )}
  </div>
                              );
                            });
                          })()}

                          </div>{/* end timeline wrapper */}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ─── FLIGHTS TAB ─── */}
          {activeTab === 'flights' && (
            <motion.div key="flights" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col" style={{ gap: '16px' }}>
              {/* HotelAPI loading skeleton */}
              {hotelApiLoading && (
                <div className="flex flex-col gap-4">
                  <div className="bg-white/70 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
                    <div className="h-6 w-32 bg-[#E5E5EA] rounded-lg" />
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-20 bg-[#E5E5EA] rounded-lg" />
                      <div className="h-4 w-24 bg-[#E5E5EA] rounded-full" />
                      <div className="h-8 w-20 bg-[#E5E5EA] rounded-lg" />
                    </div>
                    <div className="h-4 w-40 bg-[#E5E5EA] rounded-lg self-center" />
                  </div>
                  <div className="bg-white/70 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
                    <div className="h-6 w-32 bg-[#E5E5EA] rounded-lg" />
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-20 bg-[#E5E5EA] rounded-lg" />
                      <div className="h-4 w-24 bg-[#E5E5EA] rounded-full" />
                      <div className="h-8 w-20 bg-[#E5E5EA] rounded-lg" />
                    </div>
                    <div className="h-4 w-40 bg-[#E5E5EA] rounded-lg self-center" />
                  </div>
                  <p className="text-center text-[12px] text-[#8E8E93] animate-pulse">Fetching live flights…</p>
                </div>
              )}
              {!hotelApiLoading && flights.map((flight: any, i: number) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => setFlightDetailIdx(i)}
                >
                  {/* Header */}
                  <div className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider ${flight.type === 'departure' ? 'bg-[#5B8FB9]/10 text-[#5B8FB9]' : 'bg-[#FF6B1A]/10 text-[#E25A0F]'
                    }`}>
                    {flight.type === 'departure' ? '✈️ Outbound Flight' : '✈️ Return Flight'}
                  </div>

                  <div className="p-4">
                    {/* Overall Route Summary */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-semibold text-[#1A1A1A]">{flight.airline}</p>
                      <span className="text-[11px] text-[#8E8E93] font-medium">{flight.flightNo}</span>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-[18px] font-bold text-[#1A1A1A]">{flight.from}</p>
                        <p className="text-[11px] text-[#8E8E93]">{flight.departure}</p>
                      </div>
                      <div className="flex-1 flex items-center gap-1.5">
                        <div className="h-[1px] flex-1 bg-[#E5E5EA]" />
                        <Plane className="w-4 h-4 text-[#8E8E93] rotate-90" />
                        <div className="h-[1px] flex-1 bg-[#E5E5EA]" />
                      </div>
                      <div className="text-center">
                        <p className="text-[18px] font-bold text-[#1A1A1A]">{flight.to}</p>
                        <p className="text-[11px] text-[#8E8E93]">{flight.arrival}</p>
                      </div>
                    </div>

                    {/* ── Segment-by-Segment Breakdown (for multi-stop flights) ── */}
                    {flight.segments && flight.segments.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-[#F2F2F7]">
                        <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Route Details</p>
                        <div className="flex flex-col gap-0">
                          {flight.segments.map((seg: any, si: number) => (
                            <div key={si}>
                              {/* Each Leg */}
                              <div className="flex items-center gap-2 py-1.5">
                                <div className="w-5 h-5 rounded-full bg-[#5B8FB9]/10 flex items-center justify-center flex-shrink-0">
                                  <Plane className="w-3 h-3 text-[#5B8FB9] rotate-90" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-[#1A1A1A]">
                                    {seg.from} → {seg.to}
                                    <span className="text-[#8E8E93] font-normal ml-1">({seg.flightNo})</span>
                                  </p>
                                  <p className="text-[10px] text-[#8E8E93]">
                                    {seg.airline} · {seg.departure} – {seg.arrival} · {seg.duration}
                                  </p>
                                </div>
                              </div>
                              {/* Layover indicator between segments */}
                              {seg.layover && (
                                <div className="flex items-center gap-2 py-1 ml-2.5 border-l-2 border-dashed border-[#FF6B1A]/60 pl-3">
                                  <span className="text-[10px] text-[#E25A0F] font-medium">
                                    ⏱ {seg.layover} layover in {flight.segments[si + 1]?.fromCity || flight.segments[si + 1]?.from}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {flight.baggage && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F2F2F7] text-[10px] text-[#8E8E93]">
                        <span className="flex items-center gap-1">🧳 Check-in: <span className="text-[#1A1A1A] font-medium">{flight.baggage}</span></span>
                        <span className="flex items-center gap-1">🎒 Cabin: <span className="text-[#1A1A1A] font-medium">{flight.cabinBaggage}</span></span>
                      </div>
                    )}
                    <div className={flight.baggage ? "flex items-center justify-between mt-2 pt-2" : "flex items-center justify-between mt-3 pt-3 border-t border-[#F2F2F7]"}>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-[#8E8E93] font-medium">
                          {flight.stops === undefined ? '' : (flight.stops === 0 ? 'Non-stop • ' : `${flight.stops} Stop(s) • `)}{flight.duration}
                        </span>
                        {flight.isRefundable !== undefined && (
                          <span className={`text-[10px] ${flight.isRefundable ? "text-[#34C759]" : "text-[#FF3B30]"} font-medium`}>
                            {flight.isRefundable ? "Refundable" : "Non-refundable"}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-[#8E8E93]">Not included in estimate</span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Flights are recommendations only and are excluded from the trip estimate. */}
              <div className="bg-[#F2F2F7] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#8E8E93]">Flights</span>
                <span className="text-[12px] font-semibold text-[#8E8E93]">Not included in estimate</span>
              </div>

              <p className="text-[10px] text-[#8E8E93]/50 text-center">Live prices from HotelAPI Flights API</p>

              {/* ── Flight Detail Bottom Sheet ── */}
              <AnimatePresence>
                <div key="dummy" style={{ display: 'none' }} />
                {flightDetailIdx !== null && flights[flightDetailIdx] && (() => {
                  const fl: any = flights[flightDetailIdx];
                  return (
                    <motion.div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-50 flex flex-col justify-end"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="absolute inset-0 bg-black/50" onClick={() => setFlightDetailIdx(null)} />
                      <motion.div className="relative bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto"
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}>

                        {/* Handle + Header */}
                        <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b border-[#F2F2F7]">
                          <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mb-3" />
                          <div className="flex items-center gap-3">
                            <button onClick={() => setFlightDetailIdx(null)}
                              className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1A1A1A] text-lg font-bold flex-shrink-0">×</button>
                            <h2 className="text-[16px] font-bold text-[#1A1A1A] truncate">
                              {fl.type === 'departure' ? '✈️ Outbound' : '✈️ Return'} · {fl.from} → {fl.to}
                            </h2>
                          </div>
                        </div>

                        <div className="px-5 py-4 flex flex-col gap-4">

                          {/* ── Overview Row ── */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[#F9F9FB] rounded-xl p-3 text-center">
                              <p className="text-[10px] text-[#8E8E93] font-medium">Duration</p>
                              <p className="text-[14px] font-bold text-[#1A1A1A]">{fl.duration}</p>
                            </div>
                            <div className="bg-[#F9F9FB] rounded-xl p-3 text-center">
                              <p className="text-[10px] text-[#8E8E93] font-medium">Stops</p>
                              <p className="text-[14px] font-bold text-[#1A1A1A]">{fl.stops === 0 ? 'Non-stop' : `${fl.stops} Stop(s)`}</p>
                            </div>
                            <div className="bg-[#F9F9FB] rounded-xl p-3 text-center">
                              <p className="text-[10px] text-[#8E8E93] font-medium">Class</p>
                              <p className="text-[14px] font-bold text-[#1A1A1A]">{fl.cabinClass || 'Economy'}</p>
                            </div>
                          </div>

                          {/* ── Segment Timeline ── */}
                          <div>
                            <h3 className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Flight Route</h3>
                            <div className="flex flex-col">
                              {(fl.segments || []).map((seg: any, si: number) => (
                                <div key={si}>
                                  <div className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className="w-3 h-3 rounded-full bg-[#5B8FB9] border-2 border-white shadow-sm" />
                                      <div className="w-0.5 flex-1 bg-[#E5E5EA]" />
                                      <div className="w-3 h-3 rounded-full bg-[#5B8FB9] border-2 border-white shadow-sm" />
                                    </div>
                                    <div className="flex-1 pb-2">
                                      <div className="bg-[#F9F9FB] rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <p className="text-[12px] font-bold text-[#1A1A1A]">{seg.flightNo}</p>
                                          <span className="text-[10px] text-[#8E8E93]">{seg.aircraft !== 'N/A' ? `✈ ${seg.aircraft}` : ''}</span>
                                        </div>
                                        <p className="text-[11px] text-[#8E8E93] mb-2">{seg.airline}</p>

                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="text-[13px] font-bold text-[#1A1A1A]">{seg.departure}</p>
                                            <p className="text-[10px] text-[#8E8E93]">{seg.fromAirport || seg.from}</p>
                                            <p className="text-[10px] font-medium text-[#1A1A1A]">{seg.fromCity} ({seg.fromAirportCode || seg.from})</p>
                                            {seg.depDate && <p className="text-[9px] text-[#8E8E93]">{seg.depDate}</p>}
                                          </div>
                                          <div className="flex flex-col items-center px-2">
                                            <p className="text-[10px] text-[#8E8E93]">{seg.duration}</p>
                                            <div className="w-12 h-[1px] bg-[#E5E5EA] my-1" />
                                            <Plane className="w-3 h-3 text-[#5B8FB9] rotate-90" />
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[13px] font-bold text-[#1A1A1A]">{seg.arrival}</p>
                                            <p className="text-[10px] text-[#8E8E93]">{seg.toAirport || seg.to}</p>
                                            <p className="text-[10px] font-medium text-[#1A1A1A]">{seg.toCity} ({seg.toAirportCode || seg.to})</p>
                                            {seg.arrDate && <p className="text-[9px] text-[#8E8E93]">{seg.arrDate}</p>}
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-[#F2F2F7]">
                                          <span className="text-[9px] bg-[#5B8FB9]/10 text-[#5B8FB9] px-2 py-0.5 rounded-full font-medium">{seg.cabinClass || 'Economy'}</span>
                                          {seg.seatsAvailable > 0 && <span className="text-[9px] bg-[#34C759]/10 text-[#34C759] px-2 py-0.5 rounded-full font-medium">{seg.seatsAvailable} seats left</span>}
                                          {seg.baggage && <span className="text-[9px] bg-[#8E8E93]/10 text-[#8E8E93] px-2 py-0.5 rounded-full">🧳 {seg.baggage}</span>}
                                          {seg.cabinBaggage && <span className="text-[9px] bg-[#8E8E93]/10 text-[#8E8E93] px-2 py-0.5 rounded-full">🎒 {seg.cabinBaggage}</span>}
                                          {seg.isETicket && <span className="text-[9px] bg-[#FF6B1A]/10 text-[#E25A0F] px-2 py-0.5 rounded-full">🎫 E-Ticket</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Layover */}
                                  {seg.layover && (
                                    <div className="flex gap-3 -mt-1 mb-1">
                                      <div className="flex flex-col items-center">
                                        <div className="w-0.5 h-full bg-[#FF6B1A]/50" />
                                      </div>
                                      <div className="bg-[#FFF3EC] rounded-lg p-2 flex-1">
                                        <p className="text-[10px] text-[#E25A0F] font-semibold">⏱ {seg.layover} layover in {fl.segments[si + 1]?.fromCity || fl.segments[si + 1]?.from}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ── Fare Breakdown ── */}
                          <div>
                            <h3 className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Fare Breakdown</h3>
                            <div className="bg-[#F9F9FB] rounded-xl p-3 flex flex-col gap-1.5">
                              <div className="flex justify-between">
                                <span className="text-[11px] text-[#8E8E93]">Base Fare</span>
                                <span className="text-[11px] font-medium text-[#1A1A1A]">₹{(fl.baseFare || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[11px] text-[#8E8E93]">Taxes & Fees</span>
                                <span className="text-[11px] font-medium text-[#1A1A1A]">₹{(fl.tax || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between pt-1.5 border-t border-[#E5E5EA]">
                                <span className="text-[12px] font-bold text-[#1A1A1A]">Total</span>
                                <span className="text-[12px] font-semibold text-[#8E8E93]">Not included in estimate</span>
                              </div>
                            </div>
                          </div>

                          {/* ── Additional Info ── */}
                          <div>
                            <h3 className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Additional Information</h3>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-[#F9F9FB] rounded-xl p-3">
                                <p className="text-[10px] text-[#8E8E93]">Aircraft</p>
                                <p className="text-[12px] font-semibold text-[#1A1A1A]">{fl.aircraft || 'N/A'}</p>
                              </div>
                              <div className="bg-[#F9F9FB] rounded-xl p-3">
                                <p className="text-[10px] text-[#8E8E93]">Refundable</p>
                                <p className={`text-[12px] font-semibold ${fl.isRefundable ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                                  {fl.isRefundable ? 'Yes ✓' : 'No ✕'}
                                </p>
                              </div>
                              <div className="bg-[#F9F9FB] rounded-xl p-3">
                                <p className="text-[10px] text-[#8E8E93]">E-Ticket</p>
                                <p className="text-[12px] font-semibold text-[#1A1A1A]">{fl.isETicket ? 'Available ✓' : 'N/A'}</p>
                              </div>
                              <div className="bg-[#F9F9FB] rounded-xl p-3">
                                <p className="text-[10px] text-[#8E8E93]">Departure</p>
                                <p className="text-[12px] font-semibold text-[#1A1A1A]">{fl.depDate || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Baggage Summary */}
                          <div className="bg-[#F9F9FB] rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-bold text-[#1A1A1A]">Baggage</span>
                            </div>
                            <div className="flex gap-4 text-[11px] text-[#8E8E93]">
                              <span>🧳 Check-in: <span className="text-[#1A1A1A] font-medium">{fl.baggage || 'N/A'}</span></span>
                              <span>🎒 Cabin: <span className="text-[#1A1A1A] font-medium">{fl.cabinBaggage || 'N/A'}</span></span>
                            </div>
                          </div>

                          <p className="text-[9px] text-[#8E8E93]/50 text-center pb-4">All data sourced from HotelAPI Air API · Live pricing</p>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── HOTEL TAB ─── */}
          {activeTab === 'hotel' && (() => {
            // Show skeleton while HotelAPI is still fetching
            if (hotelApiLoading) {
              return (
                <motion.div key="hotel-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col gap-4">
                  <div className="bg-white/70 rounded-2xl overflow-hidden animate-pulse">
                    <div className="h-[190px] bg-[#E5E5EA]" />
                    <div className="p-4 flex flex-col gap-3">
                      <div className="h-5 w-48 bg-[#E5E5EA] rounded-lg" />
                      <div className="h-4 w-32 bg-[#E5E5EA] rounded-lg" />
                      <div className="flex gap-2">
                        <div className="h-6 w-16 bg-[#E5E5EA] rounded-full" />
                        <div className="h-6 w-16 bg-[#E5E5EA] rounded-full" />
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-[12px] text-[#8E8E93] animate-pulse">Booking the best hotel for you…</p>
                </motion.div>
              );
            }
            // Guard: hotel may be null if backend couldn't find one
            if (!itinerary.hotel) {
              return (
                <motion.div key="hotel-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#F5F3FF] flex items-center justify-center">
                    <Hotel className="w-7 h-7 text-[#8E8E93]" />
                  </div>
                  <h3 className="font-bold text-[16px] text-[#1A1A1A]">No Hotel Selected</h3>
                  <p className="text-[13px] text-[#8E8E93] text-center px-4 leading-relaxed">
                    We couldn't find a suitable hotel within your budget. Don't worry, you can always book one later.
                  </p>
                </motion.div>
              );
            }

            const hotelList: any[] = (itinerary.hotel as any).hotels?.length
              ? (itinerary.hotel as any).hotels
              : [itinerary.hotel];
            const hotel = hotelList[Math.min(activeHotelIdx, hotelList.length - 1)];

            const KEY_FACILITIES = ['wifi', 'WiFi', 'Parking', 'Restaurant', 'Bar',
              'Air conditioning', 'Room service', 'Swimming pool', 'Gym', 'Spa',
              'Sauna', 'Lift', 'Heating', 'Concierge'];
            const topFacilities: string[] = (hotel.facilities || [])
              .filter((f: string) => KEY_FACILITIES.some(k => f.toLowerCase().includes(k.toLowerCase())))
              .slice(0, 6);

            return (
              <motion.div key="hotel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col" style={{ gap: '16px' }}>

                {/* ── Main hotel card (tap for details) ── */}
                <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] overflow-hidden cursor-pointer active:opacity-90"
                  onClick={() => setHotelDetailOpen(true)}>
                  <div className="relative h-[190px]">
                    <img src={hotel.image} alt={hotel.name}
                      className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    {/* Rank badge top-left */}
                    {hotel.rankBadge && (
                      <div className="absolute top-3 left-3 bg-[#FF6B1A] rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
                        <span className="text-[10px] font-bold text-[#1A1A1A]">{hotel.rankBadge === 'Best Match' ? '🎯' : hotel.rankBadge === 'Best Value' ? '💰' : '⭐'} {hotel.rankBadge}</span>
                      </div>
                    )}
                    {/* Live + rating */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      {hotel.isHotelAPILive && (
                        <div className="bg-[#34C759]/90 backdrop-blur-sm rounded-full px-2.5 py-1">
                          <span className="text-[10px] font-bold text-white">● LIVE</span>
                        </div>
                      )}
                      <div className="bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#FF6B1A]" fill="#FF6B1A" />
                        <span className="text-[12px] font-bold text-[#1A1A1A]">{hotel.rating}/5</span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <span className="text-[10px] text-white font-medium">Tap for details →</span>
                    </div>
                    {/* Rank score pill bottom-left */}
                    {hotel.rankScore && (
                      <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                        <span className="text-[11px] font-bold text-white">{hotel.rankScore}/100 Match</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-[16px] font-bold text-[#1A1A1A]">{hotel.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#8E8E93]" />
                      <p className="text-[12px] text-[#8E8E93]">{hotel.address || hotel.location}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStreetViewHotel({
                          name: hotel.name,
                          locationText: hotel.address || hotel.location || itinerary.destination,
                        });
                      }}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#5B8FB9] px-3 py-1.5 rounded-full active:opacity-80 shadow-sm"
                    >
                      <Map className="w-3 h-3" />
                      View Street View
                    </button>
                    {/* Why this hotel - AI explanation tags */}
                    {hotel.rankExplanation?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {hotel.rankExplanation.map((reason: string, i: number) => (
                          <span key={i} className="text-[10px] bg-[#FF6B1A]/15 text-[#C2410C] px-2 py-0.5 rounded-full font-medium">✓ {reason}</span>
                        ))}
                      </div>
                    )}
                    {topFacilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {topFacilities.slice(0, 4).map((f: string) => (
                          <span key={f} className="text-[10px] bg-[#F2F2F7] text-[#6B6B6B] px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                        {topFacilities.length > 4 && (
                          <span className="text-[10px] bg-[#F2F2F7] text-[#6B6B6B] px-2 py-0.5 rounded-full">+{(hotel.facilities?.length || 0) - 4} more</span>
                        )}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-[#F2F2F7] flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-[#8E8E93]">{hotel.nights} nights · {hotel.mealType || 'Room Only'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-[#8E8E93]">Not included in estimate</p>
                        {hotel.isRefundable && <p className="text-[10px] text-[#34C759]">Free cancellation</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Other option pills ── */}
                {hotelList.length > 1 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Top Ranked Options</p>
                    {hotelList.map((h: any, i: number) => (
                      <div key={i} onClick={() => setActiveHotelIdx(i)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${i === activeHotelIdx ? 'border-[#FF6B1A] bg-[#FFF3EC]' : 'border-[#F2F2F7] bg-white'}`}>
                        <div className="relative flex-shrink-0">
                          <img src={h.image} alt={h.name} className="w-12 h-12 rounded-lg object-cover" />
                          {h.rankScore && (
                            <div className="absolute -top-1.5 -right-1.5 bg-[#FF6B1A] rounded-full w-5 h-5 flex items-center justify-center">
                              <span className="text-[7px] font-bold text-[#1A1A1A]">{h.rankScore}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{h.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-[#FF6B1A]" fill="#FF6B1A" />
                              <span className="text-[11px] text-[#8E8E93]">{h.rating}/5</span>
                            </div>
                            {h.rankBadge && (
                              <span className="text-[9px] font-bold text-[#C2410C] bg-[#FF6B1A]/20 px-1.5 py-0.5 rounded-full">{h.rankBadge}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] font-semibold text-[#8E8E93] flex-shrink-0">Not included</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStreetViewHotel({
                              name: h.name,
                              locationText: h.address || h.location || itinerary.destination,
                            });
                          }}
                          className="ml-2 text-[10px] font-bold text-[#5B8FB9] bg-[#5B8FB9]/10 px-2 py-1 rounded-full flex-shrink-0"
                        >
                          Street View
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transfers */}
                <h3 className="font-bold text-[14px] text-[#1A1A1A] pt-1">Transfers</h3>
                {transfers.map((t, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#8E8E93]/10 flex items-center justify-center">
                      <Car className="w-4 h-4 text-[#8E8E93]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1A1A1A] truncate">{t.from} → {t.to}</p>
                      <p className="text-[10px] text-[#8E8E93]">{t.type}</p>
                    </div>
                    <span className="text-[12px] font-bold text-[#6B6B6B]">₹{t.cost.toLocaleString()}</span>
                  </div>
                ))}
                <p className="text-[10px] text-[#8E8E93]/50 text-center">Powered by HotelAPI Hotels API · Live pricing</p>

                {/* ── Full Detail Bottom Sheet ── */}
                <AnimatePresence>
                  <div key="dummy" style={{ display: 'none' }} />
                  {hotelDetailOpen && (
                    <motion.div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-50 flex flex-col justify-end"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="absolute inset-0 bg-black/50" onClick={() => setHotelDetailOpen(false)} />
                      <motion.div className="relative bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto"
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}>

                        {/* Handle + header */}
                        <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b border-[#F2F2F7]">
                          <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mb-3" />
                          <div className="flex items-center gap-3">
                            <button onClick={() => setHotelDetailOpen(false)}
                              className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center flex-shrink-0 text-[#1A1A1A] text-lg font-bold">×</button>
                            <h2 className="text-[16px] font-bold text-[#1A1A1A] truncate pr-8">{hotel.name}</h2>
                          </div>
                        </div>

                        {/* Image gallery */}
                        {(hotel.images || []).length > 0 && (
                          <div className="flex gap-2 px-5 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                            {(hotel.images as string[]).map((img: string, i: number) => (
                              <img key={i} src={img} alt={`${hotel.name} ${i + 1}`}
                                className={`flex-shrink-0 rounded-xl object-cover ${i === 0 ? 'w-56 h-40' : 'w-32 h-40'}`} />
                            ))}
                          </div>
                        )}

                        <div className="px-5 pb-10 flex flex-col gap-5">
                          {/* Rating + price + address */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                {[...Array(Math.floor(hotel.rating))].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 text-[#FF6B1A]" fill="#FF6B1A" />
                                ))}
                                <span className="text-[12px] text-[#8E8E93] ml-1">{hotel.rating} stars</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <MapPin className="w-3 h-3 text-[#8E8E93] mt-0.5 flex-shrink-0" />
                                <p className="text-[12px] text-[#8E8E93]">{hotel.address}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[11px] font-semibold text-[#8E8E93]">Not included in estimate</p>
                              <p className="text-[11px] text-[#8E8E93]">{hotel.nights} nights total</p>
                            </div>
                          </div>

                          {/* Check-in / Check-out / Policy */}
                          <div className="flex gap-2">
                            <div className="flex-1 bg-[#F2F2F7] rounded-xl p-3 text-center">
                              <p className="text-[10px] text-[#8E8E93] font-medium mb-1">Check-in</p>
                              <p className="text-[15px] font-bold text-[#1A1A1A]">{hotel.checkInTime || '15:00'}</p>
                            </div>
                            <div className="flex-1 bg-[#F2F2F7] rounded-xl p-3 text-center">
                              <p className="text-[10px] text-[#8E8E93] font-medium mb-1">Check-out</p>
                              <p className="text-[15px] font-bold text-[#1A1A1A]">{hotel.checkOutTime || '11:00'}</p>
                            </div>
                            <div className="flex-1 rounded-xl p-3 text-center"
                              style={{ backgroundColor: hotel.isRefundable ? '#EDFBF1' : '#FFF3E0' }}>
                              <p className="text-[10px] text-[#8E8E93] font-medium mb-1">Policy</p>
                              <p className="text-[11px] font-bold"
                                style={{ color: hotel.isRefundable ? '#34C759' : '#FF9500' }}>
                                {hotel.isRefundable ? '✓ Refundable' : 'Non-refund'}
                              </p>
                            </div>
                          </div>

                          {/* Description */}
                          {hotel.description && (
                            <div>
                              <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-2">About</h3>
                              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                                {hotel.description.replace(/<[^>]*>/g, '').substring(0, 400)}
                                {hotel.description.length > 400 ? '...' : ''}
                              </p>
                            </div>
                          )}

                          {/* Facilities */}
                          {(hotel.facilities || []).length > 0 && (
                            <div>
                              <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-2">Facilities</h3>
                              <div className="flex flex-wrap gap-1.5">
                                {(hotel.facilities as string[]).slice(0, 24).map((f: string) => (
                                  <span key={f} className="text-[11px] bg-[#F2F2F7] text-[#5B5B5B] px-2.5 py-1 rounded-full">{f}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Room options */}
                          {(hotel.rooms || []).length > 0 && (
                            <div>
                              <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-2">Available Rooms</h3>
                              <div className="flex flex-col gap-2">
                                {(hotel.rooms as any[]).map((r: any, i: number) => (
                                  <div key={i} className="border border-[#F2F2F7] rounded-xl p-3 flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="text-[12px] font-semibold text-[#1A1A1A]">{r.name}</p>
                                      <p className="text-[10px] text-[#8E8E93] mt-0.5">{r.mealType}{r.inclusion ? ` · ${r.inclusion}` : ''}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-[14px] font-bold text-[#1A1A1A]">₹{r.totalFareINR?.toLocaleString()}</p>
                                      <p className={`text-[10px] ${r.isRefundable ? 'text-[#34C759]' : 'text-[#FF9500]'}`}>
                                        {r.isRefundable ? 'Free cancel' : 'Non-refund'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Attractions */}
                          {(hotel.attractions || []).length > 0 && (
                            <div>
                              <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-2">Nearby Attractions</h3>
                              <div className="flex flex-col gap-2">
                                {(hotel.attractions as string[]).slice(0, 5).map((a: string, i: number) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A] flex-shrink-0" />
                                    <p className="text-[13px] text-[#6B6B6B]">{a}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Contact */}
                          {(hotel.phone || hotel.email || hotel.website) && (
                            <div>
                              <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-2">Contact</h3>
                              {hotel.phone && <p className="text-[13px] text-[#5B8FB9]">📞 {hotel.phone}</p>}
                              {hotel.email && <p className="text-[13px] text-[#5B8FB9] mt-1">✉️ {hotel.email}</p>}
                              {hotel.website && <p className="text-[13px] text-[#5B8FB9] mt-1 truncate">🌐 {hotel.website}</p>}
                            </div>
                          )}
                        </div>


                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })()}


          
          {/* ─── NEW TABS ─── */}
          {activeTab === 'transport' && <TransportTab days={days} />}

          {(activeTab === 'activities' || activeTab === 'food') && (() => {
            const allItems = days.flatMap(d => d.items || []);
            let filtered: any[] = [];
            let title = "";
            if (activeTab === 'activities') {
              filtered = allItems.filter(i => i.type === 'activity' || i.type === 'relax');
              title = "Your Curated Activities";
            }
            if (activeTab === 'food') {
              filtered = allItems.filter(i => i.type === 'food');
              title = "Your Dining Experiences";
            }

            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                <h2 className="font-display text-[21px] font-semibold text-[#1A1A1A] mb-2">{title}</h2>
                {filtered.map((item, i) => {
                  const IconComp = getActivityIconComponent(item.activity || (item as any).name || '', item.type);
                  return (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#F0F4F8] flex items-center justify-center shrink-0">
                      <IconComp className="w-5 h-5 text-[#8E8E93]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[14px] font-bold text-[#1A1A1A]">{item.activity || (item as any).name}</h4>
                      <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">{item.description}</p>
                    </div>
                    {(item as any).cost !== undefined && <span className="text-[12px] font-bold text-[#1A1A1A]">₹{(item as any).cost}</span>}
                  </div>
                )})}
                {filtered.length === 0 && <p className="text-center text-[#8E8E93] py-8">Nothing scheduled here.</p>}
              </motion.div>
            );
          })()}

          {/* ─── MAP TAB ─── */}
          {activeTab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="font-display text-[21px] font-semibold text-[#1A1A1A] mb-3">Your Goa Map</h2>
              <GoaMap stops={mapStops} loading={mapLoading} height={360} />
            </motion.div>
          )}

          {/* placeholder – modal moved to root */}


          {/* ─── BUDGET TAB ─── */}
          {activeTab === 'budget' && (
            <motion.div key="budget" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col" style={{ gap: '16px' }}>
              {hotelApiLoading && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#E5E5EA] rounded-2xl h-24 animate-pulse" />
                  <div className="flex flex-col gap-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="bg-white/70 rounded-xl h-12 animate-pulse" />
                    ))}
                  </div>
                  <p className="text-center text-[12px] text-[#8E8E93] animate-pulse">Calculating your live budget…</p>
                </div>
              )}
              {!hotelApiLoading && <>
              {/* Total card */}
              <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white">
                <p className="text-[12px] text-white/50 font-medium mb-1">Total Trip Cost</p>
                <p className="text-3xl font-bold">₹{displayedTotalCost.toLocaleString()}</p>
                {travelerLabel && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FF6B1A]/15 text-[#FF6B1A]">
                      Cost for {travelerLabel}
                    </span>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                  <budgetStatus.icon className="w-4 h-4" style={{ color: budgetStatus.color }} />
                  <p className="text-[12px] font-medium" style={{ color: budgetStatus.color }}>{budgetStatus.label}</p>
                  {budgetDiff >= 0 && (
                    <span className="ml-auto text-[12px] text-white/40">Save ₹{budgetDiff.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Budget bar */}
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="flex justify-between text-[11px] text-[#8E8E93] mb-2">
                  <span>₹0</span><span>Budget: ₹{userBudget.toLocaleString()}</span>
                </div>
                <div className="h-3 bg-[#F2F2F7] rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (displayedTotalCost / userBudget) * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: budgetDiff >= 0 ? '#34C759' : '#FF9500' }}
                  />
                </div>
              </div>

              {/* Breakdown items */}
              <h3 className="font-bold text-[14px] text-[#1A1A1A] pt-1">Breakdown</h3>
              {[
                { label: 'Activities', val: breakdown.activities, icon: Camera, color: '#34C759' },
                { label: 'Transfers', val: breakdown.transfers, icon: Car, color: '#8E8E93' },
              ].map(item => {
                const pct = displayedTotalCost > 0 ? Math.round((item.val / displayedTotalCost) * 100) : 0;
                return (
                  <div key={item.label} className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.color + '15' }}>
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="text-[12px] font-semibold text-[#1A1A1A]">{item.label}</p>
                        <p className="text-[13px] font-bold text-[#1A1A1A]">₹{(item.val || 0).toLocaleString()}</p>
                      </div>
                      <div className="h-[3px] bg-[#F2F2F7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                      <p className="text-[10px] text-[#8E8E93] mt-0.5">{pct}% of total</p>
                    </div>
                  </div>
                );
              })}

              <p className="text-[10px] text-[#8E8E93]/50 text-center pt-1">Real-time pricing · Live availability</p>

              {/* Travel Cash Discount */}
              {travelCashBalance > 0 && (
                <div className="bg-gradient-to-r from-[#FF6B1A]/20 to-[#E25A0F]/10 rounded-2xl p-4 border border-[#FF6B1A]/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B1A]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🎁</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-bold text-[#1A1A1A]">Travel Cash Applied</p>
                      <p className="text-[11px] text-[#8E8E93]">From your previous booking rewards</p>
                    </div>
                    <p className="text-[16px] font-bold text-[#34C759]">-₹{Math.min(travelCashBalance, displayedTotalCost).toLocaleString()}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#FF6B1A]/20 flex justify-between items-center">
                    <p className="text-[12px] font-semibold text-[#1A1A1A]">Effective Cost</p>
                    <p className="text-[18px] font-bold text-[#1A1A1A]">₹{Math.max(0, displayedTotalCost - travelCashBalance).toLocaleString()}</p>
                  </div>
                </div>
              )}
              </>}
            </motion.div>
          )}
          {/* ═══ BOTTOM CTA ═══ */}
          <div className="mt-8 mb-6 bg-[#FFF3EC] rounded-[24px] p-6 flex flex-col items-center border border-[#FF6B1A]/20">
            <div className="w-10 h-10 mb-2.5 rounded-full bg-[#FF6B1A]/30 flex items-center justify-center">
              <Sun className="w-5 h-5 text-[#E25A0F]" strokeWidth={2.5} />
            </div>
            <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-1">Ready to go?</h3>
            <p className="text-[13px] text-[#8E8E93] text-center mb-6">Your personalized plan is ready.</p>
            
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => onBook?.(withCalculatedItineraryCosts(itinerary))}
              className="w-full py-4 bg-[#FF6B1A] text-[#1A1A1A] rounded-full text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,107,26,0.3)]">
              <Check className="w-5 h-5" strokeWidth={3} />
              Accept &amp; Confirm Plan
            </motion.button>

            {travelerLabel && (
              <p className="text-center text-[12px] font-medium text-[#8E8E93] mt-4">
                for {travelerLabel}
              </p>
            )}
            <button onClick={onReset}
              className="w-full mt-3 py-2 text-[13px] font-semibold text-[#8E8E93] flex items-center justify-center gap-1.5 active:opacity-60 transition-opacity">
              <RefreshCw className="w-3.5 h-3.5" /> Start Over
            </button>
          </div>
      </div>

      {/* ═══ HOTEL STREET VIEW MODAL (root level – never clipped by overflow) ═══ */}
      <HotelStreetViewModal
        isOpen={!!streetViewHotel}
        onClose={() => setStreetViewHotel(null)}
        hotelName={streetViewHotel?.name || ""}
        locationText={streetViewHotel?.locationText || itinerary.destination}
        cityName={itinerary.destination}
      />

      {/* ═══ SIGHTSEEING / ACTIVITY STREET VIEW MODAL ═══ */}
      <LocationStreetViewModal
        isOpen={!!streetViewLocation}
        onClose={() => setStreetViewLocation(null)}
        locationName={streetViewLocation?.name || ""}
        locationDescription={streetViewLocation?.description}
        cityName={itinerary.destination}
        type={streetViewLocation?.type ?? 'sightseeing'}
      />

      {/* ═══ NEW INTERACTIVE MODALS ═══ */}
      <AnimatePresence>
        {aiReasonOpen && (() => {
          const smartReasoning = getSmartReasoning(aiReasonOpen, sessionData, itinerary);
          return (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-50 bg-black/40 flex items-center justify-center p-5">
            <motion.div initial={{y:20, scale:0.95}} animate={{y:0, scale:1}} className="bg-white w-full rounded-3xl p-6 relative max-h-[85vh] flex flex-col">
              <button onClick={() => setAiReasonOpen(null)} className="absolute top-4 right-4 w-8 h-8 bg-[#F8F8F8] rounded-full flex items-center justify-center shrink-0 z-10"><X className="w-4 h-4" /></button>
              
              <div className="shrink-0">
                <Sparkles className="w-8 h-8 text-[#E25A0F] mb-4" />
                <h3 className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2">✨ Why TravelBuddy Picked This</h3>
                <h2 className="text-[20px] font-bold text-[#1A1A1A] leading-tight mb-5">{aiReasonOpen.activity || aiReasonOpen.name}</h2>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar pb-2">
                {smartReasoning.reasons.map((r: any, i: number) => (
                  <div key={i} className="bg-[#FFF3EC] p-4 rounded-xl border border-[#FFC49B]/40 shrink-0">
                    <p className="text-[11px] font-bold text-[#C2410C] uppercase tracking-wider mb-1.5">{r.title}</p>
                    <p className="text-[13px] font-medium text-[#1A1A1A] leading-relaxed">{r.text}</p>
                  </div>
                ))}
                
                <div className="bg-[#F5F3FF] p-4 rounded-xl border border-[#D0C3F1]/40 mt-1 shrink-0">
                  <p className="text-[11px] font-bold text-[#9013FE] uppercase tracking-wider mb-1.5">🤖 TRAVELBUDDY'S TAKE</p>
                  <p className="text-[13px] font-medium text-[#1A1A1A] italic leading-relaxed">"{smartReasoning.take}"</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        );})()}

        {replaceState && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-50 bg-black/40 flex items-end">
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type: "spring", stiffness: 300, damping: 30}} className="bg-white w-full rounded-t-3xl p-6 pb-12 flex flex-col">
              
              {replaceState.status === 'selecting' && (
                <>
                  <div className="flex justify-between items-start mb-6 shrink-0">
                    <div>
                      <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1">Replace Activity</p>
                      <h2 className="font-display text-[21px] font-semibold text-[#1A1A1A] leading-tight pr-2">
                        You're replacing:
                        <br />
                        <span className="text-[#9013FE]">{replaceState.originalItem.activity || replaceState.originalItem.name}</span>
                      </h2>
                      <p className="text-[13px] text-[#8E8E93] mt-2">
                        Here are alternatives that fit your trip:
                      </p>
                    </div>
                    <button onClick={() => setReplaceState(null)} className="w-8 h-8 bg-[#F2F2F7] rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 max-h-[52vh] overflow-y-auto no-scrollbar pb-4">
                    {(() => {
                      const planned = days
                        .flatMap((d) => d.items || [])
                        .map((i) => i.activity)
                        .filter(Boolean) as string[];
                      const options = alternativesFor(replaceState.originalItem, planned);
                      if (options.length === 0)
                        return (
                          <p className="text-[13px] text-[#8E8E93] py-6 text-center">
                            Nothing else to suggest for this one yet.
                          </p>
                        );
                      return options.map((alt) => {
                        const delta = (alt.cost || 0) - (replaceState.originalItem.cost || 0);
                        const isSelected = selectedAlternative?.activity === alt.activity;
                        // Mock some intelligent text for the demo based on the tags
                        const reasonMap: Record<string, string> = {
                          "Beach": "Fits your preference for relaxed beach days.",
                          "Heritage": "Matches your interest in culture and history.",
                          "Water": "Adds a bit of adventure to your itinerary.",
                          "Sunset": "Perfect timing for golden hour views.",
                          "Scooter": "Fits your scooter preference and keeps stops flexible.",
                          "Food": "A great local culinary experience.",
                          "Upscale": "A nice premium upgrade for this slot."
                        };
                        const tag = alt.tags?.[0] || "Local";
                        const fitText = reasonMap[tag] || `Great alternative for ${tag.toLowerCase()} experiences.`;
                        const mockScore = 75 + ((alt.activity.length * 7) % 20); // Random deterministic score 75-95%
                        
                        return (
                          <button
                            key={alt.activity}
                            onClick={() => setSelectedAlternative(alt)}
                            className={`text-left border p-4 rounded-2xl flex flex-col gap-2 transition-all ${isSelected ? 'bg-[#F5F3FF] border-[#9013FE]' : 'bg-white border-[#E5E5EA] active:scale-[0.98]'}`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#9013FE] bg-[#9013FE]' : 'border-[#C7C7CC]'}`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                                <h4 className={`font-bold text-[15px] ${isSelected ? 'text-[#9013FE]' : 'text-[#1A1A1A]'}`}>{alt.activity}</h4>
                              </div>
                              <div className="text-right flex-none">
                                <span className="tnum text-[13px] font-bold text-[#1A1A1A] block">
                                  {alt.cost > 0 ? `₹${alt.cost.toLocaleString("en-IN")}` : "Free"}
                                </span>
                              </div>
                            </div>
                            
                            <div className="pl-7 pr-2">
                              <p className="text-[12px] text-[#8E8E93] leading-snug">{alt.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-bold text-[#8E8E93] bg-[#F2F2F7] px-1.5 py-0.5 rounded">~{alt.duration}</span>
                                <span className="text-[10px] font-bold text-[#9013FE] bg-[#F5F3FF] px-1.5 py-0.5 rounded">{mockScore}% match</span>
                              </div>
                              <p className="text-[11px] font-medium text-[#1A1A1A] mt-2 italic flex items-start gap-1">
                                <Sparkles className="w-3 h-3 text-[#C2410C] mt-0.5 shrink-0" />
                                {fitText}
                              </p>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {selectedAlternative && (
                    <div className="pt-4 mt-2 border-t border-[#F2F2F7] flex gap-3 shrink-0">
                      <button onClick={() => setSelectedAlternative(null)} className="flex-1 py-3.5 bg-[#F2F2F7] text-[#1A1A1A] rounded-xl text-[14px] font-bold">
                        Cancel
                      </button>
                      <button onClick={() => {
                        const newScore = 75 + ((selectedAlternative.activity.length * 7) % 20);
                        applyReplacement(replaceState.dayIndex, replaceState.itemIndex, selectedAlternative, replaceState.originalItem, newScore);
                      }} className="flex-[2] py-3.5 bg-[#FF6B1A] text-[#1A1A1A] rounded-xl text-[14px] font-bold shadow-[0_4px_14px_rgba(255,107,26,0.4)]">
                        Replace with {selectedAlternative.activity.substring(0, 15)}{selectedAlternative.activity.length > 15 ? '...' : ''}
                      </button>
                    </div>
                  )}
                </>
              )}

              {replaceState.status === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 relative">
                  <button onClick={() => setReplaceState(null)} className="absolute top-0 right-0 w-8 h-8 bg-[#F2F2F7] rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
                  <div className="w-12 h-12 bg-[#2DA87F]/10 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-6 h-6 text-[#2DA87F]" strokeWidth={3} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-1">Activity replaced</h3>
                  
                  <div className="flex flex-col items-center my-6 gap-2 bg-[#F9F9FB] w-full p-4 rounded-xl border border-[#F2F2F7]">
                    <span className="text-[14px] font-semibold text-[#8E8E93] line-through">{replaceState.originalItem.activity || replaceState.originalItem.name}</span>
                    <ArrowDown className="w-4 h-4 text-[#8E8E93]" />
                    <span className="text-[15px] font-bold text-[#9013FE]">{selectedAlternative?.activity}</span>
                  </div>
                  
                  <p className="text-[13px] text-[#8E8E93] mb-6">The itinerary has been updated.</p>
                  
                  <div className="flex flex-col gap-3 w-full">
                    <button onClick={performUndo} className="w-full py-3.5 bg-[#F2F2F7] text-[#1A1A1A] rounded-xl text-[14px] font-bold flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Undo replacement
                    </button>
                    <button onClick={() => setReplaceState(null)} className="w-full py-3.5 bg-[#FF6B1A] text-[#1A1A1A] rounded-xl text-[14px] font-bold">
                      Done
                    </button>
                  </div>
                </div>
              )}

              {replaceState.status === 'undone' && (
                <div className="flex flex-col items-center justify-center py-6 relative">
                  <button onClick={() => setReplaceState(null)} className="absolute top-0 right-0 w-8 h-8 bg-[#F2F2F7] rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
                  <div className="w-12 h-12 bg-[#F2F2F7] rounded-full flex items-center justify-center mb-4">
                    <RefreshCw className="w-6 h-6 text-[#8E8E93]" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-6">Replacement undone</h3>
                  
                  <button onClick={() => setReplaceState(null)} className="w-full py-3.5 bg-[#FF6B1A] text-[#1A1A1A] rounded-xl text-[14px] font-bold">
                    Done
                  </button>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
