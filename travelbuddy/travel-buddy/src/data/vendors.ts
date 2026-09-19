/**
 * Bookable Goa supply, and the commission on each booking.
 *
 * This is the business model, not a feature: the app plans the trip, then
 * takes a cut of the food, activities and transport it sends people to. The
 * itinerary is the funnel; this is what it funnels into.
 *
 * Everything here is HARDCODED sample supply for the prototype. Prices are
 * realistic Goa rates and the venues are real places, but the phone numbers
 * are placeholders and no one has signed a partner agreement. Nothing here
 * should be presented as a live booking network.
 */

export type VendorKind = "food" | "activity" | "transport";

export type Vendor = {
  id: string;
  kind: VendorKind;
  name: string;
  /** What they do, in one line a guest can scan. */
  blurb: string;
  area: string;
  /** Display price — per head, per day, or per trip, as `unit` says. */
  price: number;
  unit: string;
  phone: string;
  /** Our cut, as a fraction. Different supply carries different margin. */
  commission: number;
  rating: number;
  /** Matches an itinerary item, so a stop can offer its own vendor. */
  tags: string[];
  partner?: boolean;
};

export const VENDORS: Vendor[] = [
  // ── Food ────────────────────────────────────────────────────────────
  {
    id: "f-calamari",
    kind: "food",
    name: "Calamari Beach Shack",
    blurb: "Fresh catch, feet in the sand, Candolim end of the beach",
    area: "Candolim",
    price: 1200,
    unit: "for two",
    phone: "+91 98221 40012",
    commission: 0.12,
    rating: 4.4,
    tags: ["seafood", "beach", "lunch"],
    partner: true,
  },
  {
    id: "f-fishermans",
    kind: "food",
    name: "Fisherman's Wharf",
    blurb: "Riverside Goan classics — xacuti, cafreal, sol kadhi",
    area: "Cavelossim",
    price: 1500,
    unit: "for two",
    phone: "+91 98221 40078",
    commission: 0.12,
    rating: 4.5,
    tags: ["goan", "dinner", "riverside"],
    partner: true,
  },
  {
    id: "f-venite",
    kind: "food",
    name: "Venite",
    blurb: "Balcony tables above a Panjim lane, unchanged for decades",
    area: "Panjim",
    price: 1000,
    unit: "for two",
    phone: "+91 98221 40145",
    commission: 0.1,
    rating: 4.3,
    tags: ["goan", "heritage", "lunch"],
    partner: true,
  },
  {
    id: "f-vinayak",
    kind: "food",
    name: "Vinayak Family Restaurant",
    blurb: "Thali done properly — the one locals send you to",
    area: "Assagao",
    price: 600,
    unit: "for two",
    phone: "+91 98221 40233",
    commission: 0.1,
    rating: 4.6,
    tags: ["thali", "vegetarian", "local"],
    partner: true,
  },
  {
    id: "f-gunpowder",
    kind: "food",
    name: "Gunpowder",
    blurb: "South Indian in a garden, worth the drive to Assagao",
    area: "Assagao",
    price: 1400,
    unit: "for two",
    phone: "+91 98221 40311",
    commission: 0.12,
    rating: 4.5,
    tags: ["south-indian", "garden", "dinner"],
    partner: true,
  },
  {
    id: "f-bhattiwilla",
    kind: "food",
    name: "Bhatti Village",
    blurb: "No menu, no sign, no English — just ask what's cooking",
    area: "Nerul",
    price: 800,
    unit: "for two",
    phone: "+91 98221 40420",
    commission: 0.08,
    rating: 4.7,
    tags: ["goan", "hidden", "dinner"],
  },

  // ── Activities ──────────────────────────────────────────────────────
  {
    id: "a-scuba",
    kind: "activity",
    name: "Grande Island Scuba",
    blurb: "Discover dive for first-timers, boat from Sinquerim jetty",
    area: "Sinquerim",
    price: 2800,
    unit: "per person",
    phone: "+91 98221 41005",
    commission: 0.18,
    rating: 4.6,
    tags: ["water-sports", "diving", "boat"],
    partner: true,
  },
  {
    id: "a-dudhsagar",
    kind: "activity",
    name: "Dudhsagar Jeep Safari",
    blurb: "Shared jeep from Mollem, 4hr round trip, permits included",
    area: "Mollem",
    price: 3000,
    unit: "per person",
    phone: "+91 98221 41077",
    commission: 0.15,
    rating: 4.4,
    tags: ["nature", "waterfall", "trek"],
    partner: true,
  },
  {
    id: "a-cruise",
    kind: "activity",
    name: "Mandovi Sunset Cruise",
    blurb: "90 minutes on the river with live music, boards at 5:30pm",
    area: "Panjim",
    price: 900,
    unit: "per person",
    phone: "+91 98221 41132",
    commission: 0.2,
    rating: 4.1,
    tags: ["cruise", "sunset", "music"],
    partner: true,
  },
  {
    id: "a-parasail",
    kind: "activity",
    name: "Calangute Watersports",
    blurb: "Parasailing, jet ski and banana boat, sold as a combo",
    area: "Calangute",
    price: 1800,
    unit: "per person",
    phone: "+91 98221 41208",
    commission: 0.22,
    rating: 4.0,
    tags: ["water-sports", "adventure", "beach"],
    partner: true,
  },
  {
    id: "a-spice",
    kind: "activity",
    name: "Sahakari Spice Plantation",
    blurb: "Guided walk plus traditional lunch, half day",
    area: "Ponda",
    price: 800,
    unit: "per person",
    phone: "+91 98221 41290",
    commission: 0.15,
    rating: 4.2,
    tags: ["nature", "culture", "lunch"],
    partner: true,
  },
  {
    id: "a-heritage",
    kind: "activity",
    name: "Fontainhas Heritage Walk",
    blurb: "Two hours through the Latin Quarter with a local historian",
    area: "Panjim",
    price: 600,
    unit: "per person",
    phone: "+91 98221 41355",
    commission: 0.25,
    rating: 4.8,
    tags: ["heritage", "walk", "culture"],
    partner: true,
  },

  // ── Transport ───────────────────────────────────────────────────────
  {
    id: "t-scooter",
    kind: "transport",
    name: "Candolim Scooter Rentals",
    blurb: "Activa and Jupiter, helmet included, delivered to your stay",
    area: "Candolim",
    price: 400,
    unit: "per day",
    phone: "+91 98221 42010",
    commission: 0.15,
    rating: 4.3,
    tags: ["scooter", "rental", "self-drive"],
    partner: true,
  },
  {
    id: "t-bike",
    kind: "transport",
    name: "Anjuna Bike Hire",
    blurb: "Himalayan and Classic 350 for the long rides south",
    area: "Anjuna",
    price: 1200,
    unit: "per day",
    phone: "+91 98221 42088",
    commission: 0.15,
    rating: 4.4,
    tags: ["motorbike", "rental", "self-drive"],
    partner: true,
  },
  {
    id: "t-car",
    kind: "transport",
    name: "Goa Self Drive Cars",
    blurb: "Swift, Baleno and Thar, unlimited kilometres within Goa",
    area: "Porvorim",
    price: 1800,
    unit: "per day",
    phone: "+91 98221 42140",
    commission: 0.12,
    rating: 4.2,
    tags: ["car", "rental", "self-drive"],
    partner: true,
  },
  {
    id: "t-airport",
    kind: "transport",
    name: "Mopa Airport Transfers",
    blurb: "Fixed-fare sedan, meets you at arrivals with a name board",
    area: "Airport",
    price: 1600,
    unit: "per trip",
    phone: "+91 98221 42233",
    commission: 0.18,
    rating: 4.6,
    tags: ["taxi", "airport", "transfer"],
    partner: true,
  },
  {
    id: "t-driver",
    kind: "transport",
    name: "Sandeep — Day Driver",
    blurb: "Car and driver for the day, speaks English and Konkani",
    area: "North Goa",
    price: 2500,
    unit: "per day",
    phone: "+91 98221 42310",
    commission: 0.2,
    rating: 4.9,
    tags: ["taxi", "driver", "day-hire"],
    partner: true,
  },
  {
    id: "t-ferry",
    kind: "transport",
    name: "Divar Ferry Crossing",
    blurb: "Free river crossing, runs every 15 minutes until 10pm",
    area: "Old Goa",
    price: 0,
    unit: "free",
    phone: "—",
    commission: 0,
    rating: 4.5,
    tags: ["ferry", "crossing"],
  },
];

export const byKind = (kind: VendorKind) =>
  VENDORS.filter((v) => v.kind === kind);

/** What we earn on a booking, which is the whole point of the listing. */
export const commissionOn = (v: Vendor) => Math.round(v.price * v.commission);

export const rupees = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Digits only, so tel: and wa.me links both work from one field. */
export const dialable = (phone: string) => phone.replace(/[^0-9+]/g, "");
