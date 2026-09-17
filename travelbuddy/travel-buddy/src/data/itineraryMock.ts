// Comprehensive itinerary data matching HotelAPI spec

export interface ItineraryActivity {
  time: string;
  activity: string;
  description: string;
  cost: number;
  type: 'travel' | 'activity' | 'food' | 'relax';
}

export interface MustDoActivity {
  time?: string;
  activity: string;
  description: string;
  cost: number;
  type: 'travel' | 'activity' | 'food' | 'relax';
  alignsWithPreferences: boolean;
  tags: string[];
}

export interface ItineraryDay {
  day: number;
  title: string;
  items: ItineraryActivity[];
  mustDo?: MustDoActivity;
}


export interface FlightInfo {
  type: 'departure' | 'return';
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  cost: number;
  stops?: number;
  baggage?: string;
  cabinBaggage?: string;
  isRefundable?: boolean;
}

export interface HotelInfo {
  name: string;
  rating: number;
  location: string;
  distanceToCenter: string;
  totalCost: number;
  image: string;
  nights: number;
}

export interface TransferInfo {
  from: string;
  to: string;
  type: string;
  cost: number;
}

export interface TripItinerary {
  destination: string;
  country: string;
  duration: string;
  image: string;
  matchScore: number;
  totalCost: number;
  budget?: number;
  breakdown: {
    flights: number;
    stay: number;
    activities: number;
    transfers: number;
  };
  flights: FlightInfo[];
  hotel: HotelInfo;
  transfers: TransferInfo[];
  days: ItineraryDay[];
}

export interface ShortlistDestination {
  id: string;
  name: string;
  country: string;
  image: string;
  score: number;
  tags: string[];
  minCost: number;
  description: string;
}

// ─── Destination Database ────────────────────────
const DESTINATIONS: Record<string, Omit<TripItinerary, 'matchScore'>> = {
  goa: {
    destination: 'Goa',
    country: 'India',
    duration: '5 Days, 4 Nights',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
    totalCost: 45000,
    breakdown: { flights: 12000, stay: 18000, activities: 10000, transfers: 5000 },
    flights: [
      { type: 'departure', airline: 'IndiGo', flightNo: '6E 123', from: 'DEL', to: 'GOI', departure: '08:30', arrival: '11:15', duration: '2h 45m', cost: 6000 },
      { type: 'return', airline: 'IndiGo', flightNo: '6E 124', from: 'GOI', to: 'DEL', departure: '12:30', arrival: '15:15', duration: '2h 45m', cost: 6000 },
    ],
    hotel: { name: 'Taj Holiday Village Resort', rating: 5, location: 'Candolim, North Goa', distanceToCenter: '0.5 km', totalCost: 18000, image: 'https://images.unsplash.com/photo-1582610116397-edb318620f90?w=400&q=80', nights: 4 },
    transfers: [
      { from: 'Goa Airport', to: 'Hotel', type: 'Private Cab', cost: 1500 },
      { from: 'Hotel', to: 'Goa Airport', type: 'Private Cab', cost: 1500 },
    ],
    days: [
      {
        day: 1, title: 'Arrival & Beach Relaxation',
        items: [
          { time: '11:15', activity: 'Arrive at Goa Airport', description: 'Transfer to hotel', cost: 0, type: 'travel' },
          { time: '13:00', activity: 'Lunch at Calamari', description: 'Beachfront seafood lunch', cost: 1200, type: 'food' },
          { time: '15:00', activity: 'Candolim Beach', description: 'Relax by the sea', cost: 0, type: 'relax' },
          { time: '19:00', activity: 'Dinner at Fisherman\'s Wharf', description: 'Authentic Goan cuisine', cost: 1500, type: 'food' },
        ]
      },
      {
        day: 2, title: 'Heritage & Culture',
        items: [
          { time: '09:00', activity: 'Basilica of Bom Jesus', description: 'UNESCO World Heritage site', cost: 200, type: 'activity' },
          { time: '12:30', activity: 'Lunch at Venite', description: 'Classic Goan lunch in Panjim', cost: 1000, type: 'food' },
          { time: '14:30', activity: 'Fontainhas Walk', description: 'Explore the Latin Quarter', cost: 0, type: 'activity' },
          { time: '19:00', activity: 'Dinner Cruise on Mandovi', description: 'Scenic river cruise', cost: 2500, type: 'activity' },
        ]
      },
      {
        day: 3, title: 'Adventure & Spice',
        items: [
          { time: '09:00', activity: 'Dudhsagar Waterfalls', description: 'Jeep safari to the falls', cost: 3000, type: 'activity' },
          { time: '14:00', activity: 'Spice Plantation Tour', description: 'Traditional Goan lunch included', cost: 1500, type: 'activity' },
          { time: '19:00', activity: 'Relax at Hotel', description: 'Poolside evening', cost: 0, type: 'relax' },
        ]
      },
      {
        day: 4, title: 'South Goa Serenity',
        items: [
          { time: '10:00', activity: 'Palolem Beach', description: 'Visit the scenic crescent beach', cost: 500, type: 'relax' },
          { time: '13:00', activity: 'Lunch at Dropadi', description: 'Seafood by the beach', cost: 1200, type: 'food' },
          { time: '16:00', activity: 'Cabo de Rama Fort', description: 'Historic cliffside fort', cost: 100, type: 'activity' },
          { time: '20:00', activity: 'Farewell Dinner', description: 'Fine dining in South Goa', cost: 2000, type: 'food' },
        ]
      },
      {
        day: 5, title: 'Departure',
        items: [
          { time: '09:00', activity: 'Breakfast at hotel', description: 'Final Goan breakfast', cost: 0, type: 'food' },
          { time: '10:00', activity: 'Souvenir Shopping', description: 'Buy local cashews and spices', cost: 1000, type: 'activity' },
          { time: '12:30', activity: 'Depart for Airport', description: 'Flight back home', cost: 0, type: 'travel' },
        ]
      }
    ]
  },
  tromsø: {
    destination: 'Tromsø',
    country: 'Norway',
    duration: '5 Days, 4 Nights',
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
    totalCost: 125000,
    breakdown: { flights: 52000, stay: 36000, activities: 28000, transfers: 9000 },
    flights: [
      { type: 'departure', airline: 'Norwegian Air', flightNo: 'DY1502', from: 'DEL', to: 'TOS', departure: '23:30', arrival: '08:45 +1', duration: '12h 15m', cost: 26000 },
      { type: 'return', airline: 'Norwegian Air', flightNo: 'DY1503', from: 'TOS', to: 'DEL', departure: '10:00', arrival: '00:30 +1', duration: '11h 30m', cost: 26000 },
    ],
    hotel: { name: 'Clarion Hotel The Edge', rating: 4, location: 'City Centre, Tromsø', distanceToCenter: '0.3 km', totalCost: 36000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', nights: 4 },
    transfers: [
      { from: 'Tromsø Airport', to: 'Hotel', type: 'Airport Shuttle', cost: 2500 },
      { from: 'Hotel', to: 'Northern Lights Camp', type: 'Tour Bus', cost: 3500 },
      { from: 'Hotel', to: 'Airport', type: 'Airport Shuttle', cost: 3000 },
    ],
    days: [
      {
        day: 1, title: 'Arrival & Arctic Welcome',
        items: [
          { time: '09:00', activity: 'Arrive at Tromsø Airport', description: 'Transfer to hotel', cost: 0, type: 'travel' },
          { time: '12:00', activity: 'Arctic Cathedral Visit', description: 'Iconic triangular church', cost: 800, type: 'activity' },
          { time: '14:00', activity: 'Lunch at Fiskekompaniet', description: 'Fresh Arctic seafood', cost: 3500, type: 'food' },
          { time: '19:00', activity: 'Northern Lights Chase', description: 'Guided minibus tour', cost: 8000, type: 'activity' },
        ]
      },
      {
        day: 2, title: 'Fjord Expedition',
        items: [
          { time: '08:30', activity: 'Breakfast at hotel', description: 'Continental breakfast', cost: 0, type: 'food' },
          { time: '10:00', activity: 'Fjord Cruise', description: '4-hour scenic cruise', cost: 6000, type: 'activity' },
          { time: '15:00', activity: 'Polaria Aquarium', description: 'Arctic wildlife exhibit', cost: 1200, type: 'activity' },
          { time: '20:00', activity: 'Dinner at Hildr', description: 'Nordic gastronomy', cost: 4000, type: 'food' },
        ]
      },
      {
        day: 3, title: 'Husky & Wilderness Day',
        items: [
          { time: '09:00', activity: 'Husky Sledding', description: '3-hour husky adventure', cost: 9000, type: 'activity' },
          { time: '13:00', activity: 'Sami Culture Experience', description: 'Reindeer herding & lunch', cost: 5000, type: 'activity' },
          { time: '18:00', activity: 'Free evening in city', description: 'Explore local bars', cost: 2000, type: 'relax' },
        ]
      },
      {
        day: 4, title: 'Arctic Exploration',
        items: [
          { time: '09:00', activity: 'Tromsø Cable Car', description: 'Panoramic views from Storsteinen', cost: 1500, type: 'activity' },
          { time: '12:00', activity: 'Lunch at Risø', description: 'Local café fare', cost: 2000, type: 'food' },
          { time: '15:00', activity: 'Arctic-Alpine Botanic Garden', description: 'World\'s northernmost botanical garden', cost: 0, type: 'activity' },
          { time: '20:00', activity: 'Farewell Dinner', description: 'Fine dining with city views', cost: 5000, type: 'food' },
        ]
      },
      {
        day: 5, title: 'Departure',
        items: [
          { time: '07:00', activity: 'Breakfast & Checkout', description: 'Pack & checkout', cost: 0, type: 'travel' },
          { time: '09:00', activity: 'Transfer to Airport', description: 'Shuttle to TOS', cost: 0, type: 'travel' },
          { time: '10:00', activity: 'Departure Flight', description: 'TOS → DEL', cost: 0, type: 'travel' },
        ]
      },
    ],
  },

  reykjavik: {
    destination: 'Reykjavik',
    country: 'Iceland',
    duration: '6 Days, 5 Nights',
    image: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80',
    totalCost: 145000,
    breakdown: { flights: 58000, stay: 42000, activities: 35000, transfers: 10000 },
    flights: [
      { type: 'departure', airline: 'Icelandair', flightNo: 'FI455', from: 'DEL', to: 'KEF', departure: '22:00', arrival: '06:30 +1', duration: '13h 30m', cost: 29000 },
      { type: 'return', airline: 'Icelandair', flightNo: 'FI456', from: 'KEF', to: 'DEL', departure: '11:00', arrival: '02:00 +1', duration: '12h', cost: 29000 },
    ],
    hotel: { name: 'Fosshotel Reykjavik', rating: 4, location: 'Downtown Reykjavik', distanceToCenter: '0.5 km', totalCost: 42000, image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80', nights: 5 },
    transfers: [
      { from: 'Keflavik Airport', to: 'Hotel', type: 'Flybus', cost: 3000 },
      { from: 'Hotel', to: 'Golden Circle', type: 'Tour Bus', cost: 4000 },
      { from: 'Hotel', to: 'Airport', type: 'Flybus', cost: 3000 },
    ],
    days: [
      {
        day: 1, title: 'Arrival & City Walk', items: [
          { time: '07:00', activity: 'Land at Keflavik', description: 'Flybus to city', cost: 0, type: 'travel' },
          { time: '11:00', activity: 'Hallgrímskirkja Church', description: 'Iconic landmark', cost: 500, type: 'activity' },
          { time: '14:00', activity: 'Lunch at Grillið', description: 'Icelandic cuisine', cost: 4000, type: 'food' },
          { time: '18:00', activity: 'Harpa Concert Hall', description: 'Glass architecture walk', cost: 0, type: 'activity' },
        ]
      },
      {
        day: 2, title: 'Golden Circle', items: [
          { time: '08:00', activity: 'Þingvellir National Park', description: 'Tectonic plate rift', cost: 0, type: 'activity' },
          { time: '11:00', activity: 'Geysir Geothermal Area', description: 'Strokkur eruption', cost: 0, type: 'activity' },
          { time: '14:00', activity: 'Gullfoss Waterfall', description: 'Golden waterfall', cost: 0, type: 'activity' },
          { time: '18:00', activity: 'Secret Lagoon', description: 'Natural hot spring', cost: 3500, type: 'relax' },
        ]
      },
      {
        day: 3, title: 'South Coast Adventure', items: [
          { time: '08:00', activity: 'Seljalandsfoss Waterfall', description: 'Walk behind the waterfall', cost: 0, type: 'activity' },
          { time: '11:00', activity: 'Skógafoss Waterfall', description: '60m cascade', cost: 0, type: 'activity' },
          { time: '14:00', activity: 'Black Sand Beach', description: 'Reynisfjara beach', cost: 0, type: 'activity' },
          { time: '18:00', activity: 'Dinner in Vík', description: 'Cozy village restaurant', cost: 3500, type: 'food' },
        ]
      },
      {
        day: 4, title: 'Glacier & Ice Cave', items: [
          { time: '08:00', activity: 'Glacier Walk', description: 'Sólheimajökull glacier hike', cost: 8000, type: 'activity' },
          { time: '13:00', activity: 'Jökulsárlón Glacier Lagoon', description: 'Icebergs floating to sea', cost: 0, type: 'activity' },
          { time: '16:00', activity: 'Diamond Beach', description: 'Ice on black sand', cost: 0, type: 'activity' },
        ]
      },
      {
        day: 5, title: 'Blue Lagoon & Relax', items: [
          { time: '10:00', activity: 'Blue Lagoon', description: 'Geothermal spa experience', cost: 8000, type: 'relax' },
          { time: '15:00', activity: 'Reykjavik Shopping', description: 'Laugavegur street', cost: 3000, type: 'activity' },
          { time: '20:00', activity: 'Farewell Dinner', description: 'Fine dining downtown', cost: 5000, type: 'food' },
        ]
      },
      {
        day: 6, title: 'Departure', items: [
          { time: '08:00', activity: 'Checkout & Transfer', description: 'Flybus to airport', cost: 0, type: 'travel' },
          { time: '11:00', activity: 'Departure Flight', description: 'KEF → DEL', cost: 0, type: 'travel' },
        ]
      },
    ],
  },

  tallinn: {
    destination: 'Tallinn',
    country: 'Estonia',
    duration: '4 Days, 3 Nights',
    image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80',
    totalCost: 72000,
    breakdown: { flights: 32000, stay: 18000, activities: 15000, transfers: 7000 },
    flights: [
      { type: 'departure', airline: 'Turkish Airlines', flightNo: 'TK718', from: 'DEL', to: 'TLL', departure: '03:00', arrival: '12:45', duration: '12h 45m', cost: 16000 },
      { type: 'return', airline: 'Turkish Airlines', flightNo: 'TK719', from: 'TLL', to: 'DEL', departure: '13:30', arrival: '01:15 +1', duration: '11h 45m', cost: 16000 },
    ],
    hotel: { name: 'Hotel Telegraaf', rating: 5, location: 'Old Town, Tallinn', distanceToCenter: '0.1 km', totalCost: 18000, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80', nights: 3 },
    transfers: [
      { from: 'Tallinn Airport', to: 'Hotel', type: 'Taxi', cost: 2500 },
      { from: 'Hotel', to: 'Airport', type: 'Taxi', cost: 2500 },
      { from: 'Hotel', to: 'Pirita Beach', type: 'Bus', cost: 2000 },
    ],
    days: [
      {
        day: 1, title: 'Old Town Discovery', items: [
          { time: '13:00', activity: 'Arrive & Check In', description: 'Settle in at Hotel Telegraaf', cost: 0, type: 'travel' },
          { time: '15:00', activity: 'Toompea Castle', description: 'Medieval fortress & parliament', cost: 500, type: 'activity' },
          { time: '18:00', activity: 'Town Hall Square', description: 'Gothic town hall & cafés', cost: 2000, type: 'food' },
          { time: '20:00', activity: 'Old Town bars', description: 'Medieval-themed pubs', cost: 2500, type: 'relax' },
        ]
      },
      {
        day: 2, title: 'Culture & Coast', items: [
          { time: '09:00', activity: 'Kadriorg Palace', description: 'Baroque palace & art museum', cost: 800, type: 'activity' },
          { time: '12:00', activity: 'Lunch at Rataskaevu 16', description: 'Estonian cuisine', cost: 2000, type: 'food' },
          { time: '15:00', activity: 'Pirita Beach', description: 'Sandy beach & monastery ruins', cost: 0, type: 'relax' },
          { time: '19:00', activity: 'Telliskivi Creative City', description: 'Street food & art', cost: 2500, type: 'food' },
        ]
      },
      {
        day: 3, title: 'Markets & Medieval', items: [
          { time: '09:00', activity: 'Balti Jaam Market', description: 'Local food market', cost: 1500, type: 'food' },
          { time: '12:00', activity: 'Estonian Open Air Museum', description: 'Traditional Estonian village', cost: 1000, type: 'activity' },
          { time: '16:00', activity: 'Souvenir Shopping', description: 'Handmade Estonian crafts', cost: 2000, type: 'activity' },
          { time: '20:00', activity: 'Farewell Dinner', description: 'Rooftop dining', cost: 3500, type: 'food' },
        ]
      },
      {
        day: 4, title: 'Departure', items: [
          { time: '09:00', activity: 'Checkout & Transfer', description: 'Taxi to airport', cost: 0, type: 'travel' },
          { time: '13:30', activity: 'Departure Flight', description: 'TLL → DEL', cost: 0, type: 'travel' },
        ]
      },
    ],
  },
};

// ─── Shortlist items ─────────────────────────────
const SHORTLIST_DB: ShortlistDestination[] = [
  {
    id: 'exp-baga-sunset', name: 'Baga Beach Sunset', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&q=80',
    score: 98, tags: ['Beach', 'Sunset', 'Scenic', 'Relaxed', 'Photography'],
    minCost: 500, description: 'Relax by the sea with stunning sunset views.'
  },
  {
    id: 'exp-goan-seafood', name: 'Goan Seafood Shack', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1544025162-8111149c402f?w=400&q=80',
    score: 95, tags: ['Seafood', 'Local Goan', 'Beachside Shacks', 'Casual'],
    minCost: 1500, description: 'Authentic Goan seafood by the waves.'
  },
  {
    id: 'exp-scuba', name: 'Scuba / Water Adventure', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
    score: 91, tags: ['Adventure', 'Water Sports', 'Active', 'Ocean'],
    minCost: 4000, description: 'Dive into the Arabian Sea for an underwater thrill.'
  },
  {
    id: 'exp-aguada', name: 'Fort Aguada Photography', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&q=80',
    score: 89, tags: ['Heritage', 'Photography', 'Scenic', 'Culture', 'History'],
    minCost: 200, description: 'Capture sweeping views from this historic 17th-century fort.'
  },
  {
    id: 'exp-anjuna-market', name: 'Anjuna Local Market', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1621640786029-220e9ff8dd09?w=400&q=80',
    score: 87, tags: ['Local', 'Culture', 'Shopping', 'Street Food'],
    minCost: 1000, description: 'Bustling flea market full of crafts and local vibes.'
  },
  {
    id: 'exp-fine-dining', name: 'Fine Dining in Panjim', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
    score: 85, tags: ['Fine Dining', 'City', 'Food', 'Culture', 'Luxury'],
    minCost: 3500, description: 'Upscale Goan-Portuguese fusion dinner.'
  },
  {
    id: 'exp-nightclub', name: 'Vagator Nightclub', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80',
    score: 82, tags: ['Nightlife', 'Party', 'Music', 'Social'],
    minCost: 3000, description: 'Dance until dawn at a premier cliffside club.'
  },
  {
    id: 'exp-scooter-route', name: 'North Goa Scooter Route', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&q=80',
    score: 88, tags: ['Scooter', 'Scenic', 'Local', 'Adventure'],
    minCost: 800, description: 'Cruise along the coastal roads from Baga to Chapora.'
  },
  {
    id: 'exp-spice', name: 'Spice Plantation Tour', country: 'Goa',
    image: 'https://images.unsplash.com/photo-1596711586556-976d0ffbe970?w=400&q=80',
    score: 80, tags: ['Nature', 'Culture', 'Local', 'Family'],
    minCost: 1200, description: 'Walk through lush farms and taste traditional spices.'
  }
];

// ─── Public API ──────────────────────────────────
export function getShortlist(prefs: any, budget: number): ShortlistDestination[] {
  if (!prefs) return SHORTLIST_DB.slice(0, 5);
  
  const tags = prefs.profileTags || prefs;
  const userTags = [...(tags.vibes || []), ...(tags.activities || []), ...(tags.food || []), (tags.transport || '')]
      .filter(Boolean)
      .map((t: string) => t.toLowerCase());
  const uniqueUserTags = [...new Set(userTags)];
  
  const ranked = SHORTLIST_DB.map(exp => {
      let matchCount = 0;
      const matchedTags: string[] = [];
      const expTags = exp.tags.map(t => t.toLowerCase());
      
      uniqueUserTags.forEach(ut => {
          if (expTags.some(et => et.includes(ut) || ut.includes(et))) {
              matchCount++;
              matchedTags.push(ut);
          }
      });
      
      // Calculate realistic percentage score. 
      // If user swipes right on everything, we don't want everything to be 99%.
      // Use a base of 60, scale up to 30 based on match %, and add deterministic variance based on ID length.
      let matchPercentage = expTags.length ? (matchCount / expTags.length) : 0;
      let variance = (exp.id.length * 7) % 8; // Random-looking deterministic 0-7
      let score = 60 + Math.round(matchPercentage * 30) + variance; 
      
      if (budget && exp.minCost > (budget / 5)) score -= 10;
      
      const displayMatchedTags = matchedTags.map(t => t.charAt(0).toUpperCase() + t.slice(1));
      
      return { ...exp, score: Math.min(99, Math.max(10, score)), matchedTags: displayMatchedTags };
  });
  
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, 5);
}

export function generateItinerary(destinationId: string, _budget: number): TripItinerary {
  const baseDest = DESTINATIONS[destinationId] || DESTINATIONS['goa'];
  const shortlistMatch = SHORTLIST_DB.find(d => d.id === destinationId);
  
  const customizedDest = JSON.parse(JSON.stringify(baseDest)) as TripItinerary;

  if (shortlistMatch) {
    customizedDest.destination = shortlistMatch.name;
    customizedDest.image = shortlistMatch.image;
    customizedDest.matchScore = shortlistMatch.score;
    let reasonText = "Matched because it fits your travel style.";
    if ((shortlistMatch as any).matchedTags && (shortlistMatch as any).matchedTags.length > 0) {
       reasonText = `Matched because you liked: ${(shortlistMatch as any).matchedTags.join(', ')}.`;
    }
    (customizedDest as any).recommendationReason = { text: reasonText };
    
    // Inject this specific experience into the itinerary so the user actually sees it!
    // We'll also remove generic beach relaxation to make it feel more custom
    if (customizedDest.days && customizedDest.days.length > 0) {
      customizedDest.days[0].title = `Arrival & ${shortlistMatch.name}`;
      
      // Filter out generic relaxation to make room for the specific experience
      customizedDest.days[0].items = customizedDest.days[0].items.filter(item => !item.activity.includes('Relax by'));
      
      customizedDest.days[0].items.splice(2, 0, {
        time: '16:00',
        activity: shortlistMatch.name,
        description: shortlistMatch.description,
        cost: shortlistMatch.minCost,
        type: 'activity'
      });
      
      // Also modify day 2 to make it feel personalized to the category
      if (customizedDest.days.length > 1) {
          const isFood = shortlistMatch.tags.includes('Food') || shortlistMatch.tags.includes('Seafood');
          const isNightlife = shortlistMatch.tags.includes('Nightlife');
          if (isFood) {
              customizedDest.days[1].title = "Culinary Discovery";
              customizedDest.days[1].items[2].activity = "Local Spice Market Walk";
              customizedDest.days[1].items[2].description = "Explore fresh ingredients";
          } else if (isNightlife) {
              customizedDest.days[1].title = "Recovery & Sunset Parties";
              customizedDest.days[1].items[0].time = "11:00"; // Late start
              customizedDest.days[1].items[0].activity = "Late Brunch";
          }
      }
    }
  } else {
    customizedDest.matchScore = 90;
  }
  
  return customizedDest;
}
