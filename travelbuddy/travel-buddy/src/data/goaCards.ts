import type { DiscoveryCard } from "./mockData";

/**
 * Goa discovery decks — seven broad options per phase.
 *
 * These are deliberately CATEGORIES, not individual venues or dishes: the
 * swipe pass is there to learn what kind of trip someone wants, and the
 * specific recommendations come later once we know.
 *
 * Every photograph is a real Wikimedia Commons image, downloaded into
 * /public/goa so the deck never depends on a third-party host staying up.
 * Attribution and licence per file live in /public/goa/credits.json.
 *
 * Tags come from the existing 97-tag embedding vocabulary in
 * tagEmbeddings.json so the preference vector keeps working unchanged.
 */

const img = (slug: string) => `/goa/${slug}.jpg`;

// ============================
// VIBES (7)
// ============================
export const GOA_VIBE_CARDS: DiscoveryCard[] = [
  {
    id: "goa-vibe-nightlife",
    type: "vibe",
    title: "Nightlife & Clubs",
    description: "Cliffside clubs, fire shows and sets that run until sunrise.",
    image: img("fire-dancing"),
    tags: ["Nightlife", "Party", "Music", "Night", "Social", "Fun"],
    extraImages: [
      img("trance-party"),
      img("arambol-night"),
      img("arambol-party"),
    ],
    longDescription:
      "Goa gave its name to a whole genre of electronic music, and Vagator, Anjuna and Morjim are still where it lives. A statewide rule silences outdoor music at 10pm, so the bigger nights move indoors or to licensed venues after that. Peak season is mid-December to early January.",
    highlights: [
      "Vagator & Anjuna",
      "Music curfew 10pm",
      "Peak Dec–Jan",
      "₹1000+",
    ],
  },
  {
    id: "goa-vibe-party",
    type: "vibe",
    title: "Party & Social",
    description:
      "Beach parties, drum circles and meeting people you didn't plan to.",
    image: img("arambol-party"),
    tags: ["Social", "Party", "Music", "Fun", "Festive", "Beach"],
    extraImages: [
      img("arambol-performer"),
      img("arambol-night"),
      img("flea-market-4"),
    ],
    longDescription:
      "The looser, daylight cousin of the club scene. Arambol's sunset drum circle, beach jams and hostel bars run on nobody's schedule and charge nothing to join. This is the part of Goa people come back for, and it happens outdoors.",
    highlights: [
      "Arambol & Anjuna",
      "Daily at sunset",
      "Nothing to book",
      "Mostly free",
    ],
  },
  {
    id: "goa-vibe-beach",
    type: "vibe",
    title: "Beach & Chill",
    description: "Plastic chairs, a cold drink, and the tide twenty feet away.",
    image: img("shack-curlies"),
    tags: ["Beach", "Chill", "Relax", "Sea", "Coastal", "Social"],
    extraImages: [
      img("shack-arambol"),
      img("beaches-of-goa"),
      img("anjuna-rocks"),
    ],
    longDescription:
      "The beach shack is Goa's defining institution — a bamboo-and-tarpaulin restaurant rebuilt every season after the monsoon. Sunbeds are usually free if you keep ordering, so a whole day costs about the price of two meals.",
    highlights: [
      "Rebuilt each Oct",
      "Free sunbeds",
      "All-day spot",
      "₹500–1200",
    ],
  },
  {
    id: "goa-vibe-peaceful",
    type: "vibe",
    title: "Peaceful & Relaxing",
    description: "A hammock, a book, and absolutely no itinerary at all.",
    image: img("sunset-purple"),
    tags: ["Peaceful", "Quiet", "Calm", "Relax", "Solitude", "Wellness"],
    extraImages: [
      img("palolem-south"),
      img("beach-trees"),
      img("palms-vagator"),
    ],
    longDescription:
      "South Goa runs at a completely different speed to the north. Palolem, Agonda and Patnem have the same sea and better sand with a fraction of the crowds and almost none of the nightlife. If the point is to do nothing, book south of the Zuari.",
    highlights: [
      "Palolem & Agonda",
      "Far fewer crowds",
      "Quiet by 10pm",
      "Great solo",
    ],
  },
  {
    id: "goa-vibe-nature",
    type: "vibe",
    title: "Nature & Adventure",
    description: "Waterfalls, spice country and the forest behind the beaches.",
    image: img("dudhsagar"),
    tags: ["Nature", "Adventure", "Outdoors", "Scenic", "Forest", "Hiking"],
    extraImages: [img("dudhsagar-2"), img("paddy-fields"), img("cashew-tree")],
    longDescription:
      "Most of Goa is not coastline. Inland you get the Western Ghats, Bhagwan Mahaveer sanctuary, spice plantations and Dudhsagar falls. Between June and September everything runs at full volume and the whole state turns fluorescent green.",
    highlights: [
      "Mollem & Ponda",
      "Best Jun–Sep",
      "Jeep & trek",
      "Full-day trips",
    ],
  },
  {
    id: "goa-vibe-family",
    type: "vibe",
    title: "Family Friendly",
    description: "Calm, shallow beaches and days that work with kids in tow.",
    image: img("palolem-south"),
    tags: ["Family", "Kids", "Safe", "Calm", "Beach", "Relax"],
    extraImages: [
      img("beaches-of-goa"),
      img("beach-trees"),
      img("mangeshi-temple"),
    ],
    longDescription:
      "Palolem, Colva and Candolim have the gentlest water and the shortest walks from parking to sand. Add the spice farms, the Old Goa churches and a river trip and you have a week that does not depend on anyone staying up late.",
    highlights: [
      "Palolem & Colva",
      "Shallow water",
      "Short transfers",
      "Low-key",
    ],
  },
  {
    id: "goa-vibe-romantic",
    type: "vibe",
    title: "Romantic & Couple",
    description: "West-facing coast, so every single evening ends in a sunset.",
    image: img("sunset-anjuna"),
    tags: ["Romance", "Scenic", "Calm", "Sun", "Coastal", "Peaceful"],
    extraImages: [
      img("sunset-purple"),
      img("palolem-south"),
      img("fontainhas-street"),
    ],
    longDescription:
      "Goa faces west, which means a sunset over the Arabian Sea every evening of your trip with no planning required. Quiet dinners work best in the south or in the Fontainhas lanes in Panjim; the north is louder but livelier.",
    highlights: [
      "Sunset ~6:30pm",
      "South for quiet",
      "Fontainhas dinners",
      "Free",
    ],
  },
];

// ============================
// ACTIVITIES (7)
// ============================
export const GOA_ACTIVITY_CARDS: DiscoveryCard[] = [
  {
    id: "goa-act-watersports",
    type: "activity",
    title: "Water Sports",
    description:
      "Jet skis, parasailing and banana boats off the north beaches.",
    image: img("jetski-beach"),
    tags: ["Water", "Adrenaline", "Sport", "Thrill", "Beach", "Active"],
    extraImages: [
      img("beaches-of-goa"),
      img("anjuna-rocks"),
      img("shack-arambol"),
    ],
    longDescription:
      "Calangute, Baga and Candolim are the water-sports strip: jet ski, parasail, banana boat and bumper rides, usually sold as a combo ticket on the sand. Everything shuts during the monsoon when swimming is prohibited, so this is an October-to-May activity.",
    highlights: [
      "Baga & Calangute",
      "Oct–May only",
      "Combo tickets",
      "₹500–2500",
    ],
  },
  {
    id: "goa-act-boating",
    type: "activity",
    title: "Boating & Kayaking",
    description:
      "Mangrove backwaters, dolphin trips and quiet paddling at dawn.",
    image: img("mandovi-canoe"),
    tags: ["Water", "Nature", "Calm", "Scenic", "Wildlife", "Outdoors"],
    extraImages: [
      img("morjim-boats"),
      img("beaches-of-goa"),
      img("palolem-south"),
    ],
    longDescription:
      "Behind the beaches Goa is a river state. Early boats out of Coco Beach head for the Mandovi mouth to look for humpback dolphins; slower kayak trips go through the Chorão and Divar mangroves instead. Mornings mean calmer water and much better wildlife.",
    highlights: ["Go early AM", "Chorão mangroves", "Dolphins", "₹400–900"],
  },
  {
    id: "goa-act-yachts",
    type: "activity",
    title: "Yachts & Sailing",
    description: "Sunset cruises and private charters out of the Mandovi.",
    image: img("beaches-of-goa"),
    tags: ["Sailing", "Luxury", "Sea", "Scenic", "Premium", "Romance"],
    extraImages: [
      img("deltin-casino"),
      img("morjim-boats"),
      img("sunset-purple"),
    ],
    longDescription:
      "Sunset cruises leave from Panjim jetty on the Mandovi most evenings in season and are cheap and cheerful. Private yacht and catamaran charters run from Britona and Marina Verem, are booked by the hour, and are the single most expensive thing on this list.",
    highlights: [
      "Panjim jetty",
      "Sunset sailings",
      "Charters by hour",
      "₹400–₹25k",
    ],
  },
  {
    id: "goa-act-casino",
    type: "activity",
    title: "Casino & Entertainment",
    description: "Goa's offshore casinos, moored in the middle of the river.",
    image: img("deltin-casino"),
    tags: ["Nightlife", "Luxury", "Fun", "Social", "Night", "Premium"],
    extraImages: [
      img("fontainhas-street"),
      img("trance-party"),
      img("panjim-inn"),
    ],
    longDescription:
      "Goa is one of the only states in India where casino gambling is legal, and the big ones are floating vessels moored in the Mandovi — you take a tender boat out to them. Entry packages usually bundle a chip stack, a buffet and unlimited drinks. Over-21s only, and bring photo ID.",
    highlights: [
      "On the Mandovi",
      "21+ with ID",
      "Package entry",
      "₹2000–4000",
    ],
  },
  {
    id: "goa-act-nature",
    type: "activity",
    title: "Nature & Adventure",
    description: "Dudhsagar falls, spice farms and the Mollem forest.",
    image: img("dudhsagar-2"),
    tags: ["Nature", "Adventure", "Outdoors", "Hiking", "Wildlife", "Scenic"],
    extraImages: [img("dudhsagar"), img("cashew-apple"), img("paddy-fields")],
    longDescription:
      "Dudhsagar is a four-tier, 310-metre waterfall on the Karnataka border. Private vehicles cannot reach the base, so you book a shared forest-department jeep from Kulem — a rough and genuinely fun forty minutes. Pair it with a Ponda spice plantation and a banana-leaf lunch.",
    highlights: ["Jeep from Kulem", "Full day", "Peak flow Jul–Sep", "~₹3000"],
  },
  {
    id: "goa-act-exploring",
    type: "activity",
    title: "Cycling & Exploring",
    description: "Scooter down a back lane and see where the afternoon goes.",
    image: img("fontainhas-street"),
    tags: ["Active", "Culture", "Heritage", "Local", "Photography", "Freedom"],
    extraImages: [img("fontainhas-blue"), img("panjim-inn"), img("bom-jesus")],
    longDescription:
      "A scooter is how Goa actually moves, and it turns the gaps between plans into the good part. Fontainhas in Panjim is the best-preserved Latin Quarter in Asia and is walkable in two hours. Carry your licence: police checks on the Calangute road are routine.",
    highlights: [
      "Fontainhas & Divar",
      "Scooter ~₹400/day",
      "Carry licence",
      "Helmets on",
    ],
  },
  {
    id: "goa-act-experiences",
    type: "activity",
    title: "Nightlife & Experiences",
    description: "Night markets, live music and the Saturday bazaar at Arpora.",
    image: img("arambol-night"),
    tags: ["Night", "Markets", "Music", "Social", "Shopping", "Festive"],
    extraImages: [
      img("flea-market-4"),
      img("spices-market"),
      img("arambol-performer"),
    ],
    longDescription:
      "Anjuna's Wednesday flea market is the original; the Saturday night market at Arpora is the polished evening version with food stalls and live bands. Both are best in the last two hours before closing, when sellers would rather discount than pack up.",
    highlights: ["Wed Anjuna", "Sat Arpora", "Live music", "Cash only"],
  },
];

// ============================
// FOOD (7) — cuisine categories, not dishes
// ============================
export const GOA_FOOD_CARDS: DiscoveryCard[] = [
  {
    id: "goa-food-nonveg",
    type: "food",
    title: "Non-Vegetarian",
    description:
      "Chicken, pork and the vinegar-and-chilli end of Goan cooking.",
    image: img("prawn-curry"),
    diet: "nonveg",
    tags: ["Food", "Local", "Gastronomy", "Culture", "Warm", "Value"],
    extraImages: [
      img("mackerel-plate"),
      img("fish-thali"),
      img("butter-chicken"),
    ],
    longDescription:
      "Goan meat cooking is where the Portuguese influence is most obvious — vindaloo from carne de vinha d'alhos, sorpotel, chouriço sausage and xacuti. It is heavier on vinegar and chilli than the rest of India and almost always served with rice or pão.",
    highlights: [
      "Vindaloo & xacuti",
      "Pork specialities",
      "Vinegar-forward",
      "₹250–600",
    ],
  },
  {
    id: "goa-food-veg",
    type: "food",
    title: "Pure Vegetarian",
    description: "Saraswat cooking, unlimited thalis and no meat on the table.",
    image: img("goan-thali"),
    diet: "veg",
    tags: ["Food", "Local", "Value", "Budget", "Culture", "Gastronomy"],
    extraImages: [
      img("paneer-masala"),
      img("fish-curry-rice"),
      img("juice-siolim"),
    ],
    longDescription:
      "Goa is not only a seafood state — Saraswat vegetarian cooking is just as old. A veg thali on a banana leaf gets you several curries, a dry vegetable, dal, rice, papad and pickle, refilled until you fold the leaf towards you. Ponda and Panjim do the best ones.",
    highlights: [
      "Unlimited refills",
      "Ponda & Panjim",
      "Pure-veg kitchens",
      "₹120–250",
    ],
  },
  {
    id: "goa-food-seafood",
    type: "food",
    title: "Seafood",
    description: "Whatever came off the boat this morning, priced by weight.",
    image: img("fish-thali"),
    diet: "nonveg",
    tags: ["Food", "Sea", "Gastronomy", "Local", "Value", "Beach"],
    extraImages: [img("mackerel-plate"), img("prawn-curry"), img("shack-menu")],
    longDescription:
      "Most shacks bring the day's catch out on ice and let you choose. Whole fish is priced by weight, so confirm the rate per kilo and roughly what your fish weighs before agreeing — this is completely normal and nobody will be offended. Mackerel and kingfish are the everyday fish.",
    highlights: [
      "Priced by weight",
      "Confirm rate first",
      "Kingfish & mackerel",
      "₹600–1200",
    ],
  },
  {
    id: "goa-food-northindian",
    type: "food",
    title: "North Indian",
    description: "Tandoor, butter gravies and naan — the reliable option.",
    image: img("butter-chicken"),
    diet: "any",
    tags: ["Food", "Gastronomy", "Warm", "Value", "Culture", "Local"],
    extraImages: [img("paneer-masala"), img("prawn-curry"), img("goan-thali")],
    longDescription:
      "Every beach town has North Indian kitchens serving tandoori, butter chicken, paneer and dal makhani. It is not what Goa is famous for, but it is what most places cook well and consistently, and every menu has a full vegetarian half.",
    highlights: [
      "Everywhere",
      "Veg & non-veg",
      "Tandoor & curries",
      "₹200–500",
    ],
  },
  {
    id: "goa-food-goan",
    type: "food",
    title: "Authentic Goan",
    description:
      "Fish curry rice, kokum and coconut — what Goa eats for lunch.",
    image: img("mackerel-plate"),
    diet: "any",
    tags: ["Food", "Local", "Heritage", "Gastronomy", "Culture", "Unique"],
    extraImages: [img("fish-thali"), img("fish-curry-rice"), img("goan-thali")],
    longDescription:
      "Xitt kodi — coconut, red chilli and kokum with whatever came off the boat. The sourness comes from kokum rather than tamarind, which is what makes a Goan curry taste different from a Keralan one. There are full vegetarian versions of almost all of it.",
    highlights: ["Kokum-soured", "Lunch 12–3pm", "Go inland", "₹150–350"],
  },
  {
    id: "goa-food-cafe",
    type: "food",
    title: "International & Café Food",
    description: "Sourdough, single-origin coffee and long Assagao breakfasts.",
    image: img("juice-siolim"),
    diet: "any",
    tags: ["Café", "Coffee", "Food", "Trendy", "Chill", "Design"],
    extraImages: [
      img("fontainhas-outpost"),
      img("bebinca"),
      img("paneer-masala"),
    ],
    longDescription:
      "Two different things share this slot. Old-school juice centres do chikoo and custard-apple shakes for under ₹100. The newer Assagao and Siolim café scene does sourdough, bowls and single-origin coffee for rather more, with the best wi-fi in the state.",
    highlights: [
      "Assagao & Siolim",
      "Good wi-fi",
      "Long breakfasts",
      "₹80–600",
    ],
  },
  {
    id: "goa-food-desserts",
    type: "food",
    title: "Desserts & Bakeries",
    description: "Bebinca, dodol and the poder's morning bread round.",
    image: img("bebinca"),
    diet: "veg",
    tags: ["Food", "Gastronomy", "Heritage", "Unique", "Local", "Culture"],
    extraImages: [
      img("goan-thali"),
      img("juice-siolim"),
      img("fontainhas-outpost"),
    ],
    longDescription:
      "Bebinca is the Christmas pudding of Goa and got a GI tag in 2023 — each of its sixteen layers is grilled separately, which is why a proper one takes hours. Dodol and bolinhas are the other two. The poder still cycles round most villages with fresh pão twice a day.",
    highlights: [
      "GI-tagged 2023",
      "16 layers",
      "Poder bread rounds",
      "₹80–150",
    ],
  },
];

export const GOA_CARDS_BY_PHASE = {
  vibes: GOA_VIBE_CARDS,
  activities: GOA_ACTIVITY_CARDS,
  food: GOA_FOOD_CARDS,
};

export const ALL_GOA_CARDS: DiscoveryCard[] = [
  ...GOA_VIBE_CARDS,
  ...GOA_ACTIVITY_CARDS,
  ...GOA_FOOD_CARDS,
];

/** Card ids used by the dietary rule in the food phase. */
export const FOOD_IDS = {
  vegetarian: "goa-food-veg",
  nonVegetarian: "goa-food-nonveg",
  seafood: "goa-food-seafood",
} as const;
