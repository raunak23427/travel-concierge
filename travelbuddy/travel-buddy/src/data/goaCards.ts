import type { DiscoveryCard } from "./mockData";

/**
 * Goa-specific discovery decks.
 *
 * Every photograph is a real Wikimedia Commons image of Goa, downloaded into
 * /public/goa so the deck never depends on a third-party host staying up.
 * Attribution and licence for each file live in /public/goa/credits.json.
 *
 * Tags are drawn from the existing 97-tag embedding vocabulary in
 * tagEmbeddings.json so the preference vector keeps working unchanged.
 */

const img = (slug: string) => `/goa/${slug}.jpg`;

// ============================
// VIBES (8)
// ============================
export const GOA_VIBE_CARDS: DiscoveryCard[] = [
  {
    id: "goa-vibe-sunset",
    type: "vibe",
    title: "Sunset Beach Evenings",
    description:
      "Long golden hours on the sand, feet in the water, nothing on the schedule.",
    image: img("sunset-anjuna"),
    tags: ["Beach", "Sun", "Coastal", "Chill", "Scenic", "Relax"],
    extraImages: [
      img("sunset-purple"),
      img("beaches-of-goa"),
      img("palolem-south"),
    ],
    longDescription:
      "Goa's west-facing coast means every single evening ends with a sunset over the Arabian Sea. North Goa beaches like Anjuna, Vagator and Ashwem fill up around 5:30pm; the far south at Palolem and Agonda stays quieter. Most people pick a spot an hour before sundown, order something cold, and simply stop planning for the day.",
    highlights: [
      "Sunset ~6:30pm",
      "Anjuna & Ashwem",
      "No booking needed",
      "Free",
    ],
  },
  {
    id: "goa-vibe-shack",
    type: "vibe",
    title: "Beach Shack Living",
    description:
      "Plastic chairs, a cold drink, fresh fish, and the tide twenty feet away.",
    image: img("shack-curlies"),
    tags: ["Beach", "Local", "Food", "Social", "Value", "Sea"],
    extraImages: [img("shack-arambol"), img("shack-menu"), img("anjuna-rocks")],
    longDescription:
      "The beach shack is Goa's defining institution — a temporary bamboo-and-tarpaulin restaurant rebuilt every season after the monsoon. You can spend an entire day at one for the price of a couple of meals: sunbeds are usually free if you keep ordering. Curlies, Thalassa and Sunset Point are the famous ones, but the unnamed shack next door is normally cheaper and just as good.",
    highlights: [
      "Rebuilt each Oct",
      "Free sunbeds",
      "Fresh catch daily",
      "₹500–1200",
    ],
  },
  {
    id: "goa-vibe-heritage",
    type: "vibe",
    title: "Portuguese Heritage",
    description:
      "Ochre and indigo façades, azulejo tiles, and 450 years of Latin Goa.",
    image: img("fontainhas-street"),
    tags: ["Heritage", "Historic", "Culture", "Photography", "Art", "Scenic"],
    extraImages: [
      img("fontainhas-blue"),
      img("panjim-inn"),
      img("latin-quarter"),
    ],
    longDescription:
      "Portugal ruled Goa from 1510 until 1961 — far longer than the British ruled India — and the architecture never left. Fontainhas in Panjim is the best-preserved Latin Quarter in Asia, with narrow lanes of colour-washed houses that residents are legally required to repaint every year after the rains.",
    highlights: [
      "Fontainhas, Panjim",
      "Repainted yearly",
      "Walkable in 2hrs",
      "Free",
    ],
  },
  {
    id: "goa-vibe-nightlife",
    type: "vibe",
    title: "Late Nights Out",
    description:
      "Fire dancers, trance on the cliffs, and sets that run until sunrise.",
    image: img("fire-dancing"),
    tags: ["Nightlife", "Party", "Music", "Night", "Social", "Fun"],
    extraImages: [
      img("trance-party"),
      img("arambol-night"),
      img("arambol-party"),
    ],
    longDescription:
      "Goa gave its name to an entire genre of electronic music, and Vagator, Anjuna and Morjim are still where it lives. Note the practicalities: a statewide noise rule technically silences outdoor music at 10pm, so the bigger parties move indoors or to licensed venues after that. Peak season is mid-December to early January.",
    highlights: [
      "Vagator & Anjuna",
      "Music curfew 10pm",
      "Peak Dec–Jan",
      "₹1000+",
    ],
  },
  {
    id: "goa-vibe-slow",
    type: "vibe",
    title: "Slow & Peaceful",
    description: "A hammock, a book, and absolutely no itinerary at all.",
    image: img("sunset-purple"),
    tags: ["Peaceful", "Quiet", "Calm", "Relax", "Solitude", "Wellness"],
    extraImages: [
      img("palolem-south"),
      img("beach-trees"),
      img("beaches-of-goa"),
    ],
    longDescription:
      "South Goa runs at a completely different speed to the north. Palolem, Agonda, Patnem and Galgibaga have the same sea and better sand, with a fraction of the crowds and almost none of the nightlife. If the point of the trip is to do nothing in particular, book south of the Zuari river.",
    highlights: [
      "Palolem & Agonda",
      "Far fewer crowds",
      "Great for solo",
      "Quiet by 10pm",
    ],
  },
  {
    id: "goa-vibe-palms",
    type: "vibe",
    title: "Palm-Shaded Coast",
    description:
      "Coconut groves running straight down to black rock and open sea.",
    image: img("palms-vagator"),
    tags: ["Nature", "Coastal", "Scenic", "Warm", "Outdoors", "Beach"],
    extraImages: [
      img("palms-coconut"),
      img("beach-trees"),
      img("anjuna-rocks"),
    ],
    longDescription:
      "Between the beaches, Goa's coastline is laterite cliff and coconut plantation. The stretch from Vagator to Chapora and the headlands around Cabo de Rama give you shade, rock pools and views without any of the beach-club noise — and they are almost always empty in the middle of the day.",
    highlights: ["Vagator headland", "Rock pools", "Shade all day", "Free"],
  },
  {
    id: "goa-vibe-monsoon",
    type: "vibe",
    title: "Monsoon Green",
    description:
      "Everything soaked and impossibly green, with half the usual crowds.",
    image: img("paddy-fields"),
    tags: ["Nature", "Forest", "Scenic", "Eco", "Outdoors", "Photography"],
    extraImages: [img("dudhsagar"), img("dudhsagar-2"), img("cashew-tree")],
    longDescription:
      "June to September is the off-season, and it is the most beautiful Goa gets. The paddy fields turn fluorescent, the waterfalls run at full volume and room rates drop sharply. The trade-off is real: swimming is often prohibited, many shacks are dismantled, and boat trips stop entirely.",
    highlights: [
      "Jun–Sep",
      "Cheapest rates",
      "Falls at full flow",
      "No sea swimming",
    ],
  },
  {
    id: "goa-vibe-markets",
    type: "vibe",
    title: "Markets & Bargaining",
    description:
      "Spice cones, silver, textiles — and the expectation that you will haggle.",
    image: img("spices-market"),
    tags: ["Markets", "Shopping", "Local", "Culture", "Fashion", "Social"],
    extraImages: [
      img("flea-market-2"),
      img("flea-market-4"),
      img("flea-market-1"),
    ],
    longDescription:
      "The Anjuna flea market has run every Wednesday since the 1970s, when it started as hippies selling their belongings to fund the trip home. It is now large, touristy and still genuinely good for spices, textiles and silver. Opening price is usually two to three times what the seller expects to get.",
    highlights: [
      "Wed at Anjuna",
      "Haggling expected",
      "Spices & textiles",
      "Bring cash",
    ],
  },
];

// ============================
// ACTIVITIES (10)
// ============================
export const GOA_ACTIVITY_CARDS: DiscoveryCard[] = [
  {
    id: "goa-act-dudhsagar",
    type: "activity",
    title: "Dudhsagar Falls",
    description:
      "A four-tier, 310-metre waterfall deep inside the Mollem forest.",
    image: img("dudhsagar"),
    tags: ["Nature", "Adventure", "Outdoors", "Scenic", "Hiking", "Wildlife"],
    extraImages: [img("dudhsagar-2"), img("paddy-fields"), img("cashew-tree")],
    longDescription:
      "Dudhsagar — 'sea of milk' — is one of India's tallest waterfalls, on the Goa–Karnataka border inside Bhagwan Mahaveer sanctuary. Private vehicles are not allowed to the base; you book a shared forest-department jeep from Kulem, which is a rough and genuinely fun forty minutes. Full flow is July to September.",
    highlights: [
      "Jeep from Kulem",
      "Full day trip",
      "Peak flow Jul–Sep",
      "~₹3000",
    ],
  },
  {
    id: "goa-act-fontainhas",
    type: "activity",
    title: "Fontainhas Heritage Walk",
    description:
      "Two hours through Asia's best-preserved Latin Quarter, on foot and free.",
    image: img("fontainhas-blue"),
    tags: ["Heritage", "Historic", "Culture", "Art", "Photography", "Budget"],
    extraImages: [
      img("fontainhas-street"),
      img("fontainhas-outpost"),
      img("panjim-inn"),
    ],
    longDescription:
      "Start at the Panjim church, drop into the Fontainhas lanes, and wander. The quarter is small enough to cover without a map and rewards going slowly — chapels, bakeries, tiny galleries and doorways left open. It is also one of the few things in Goa that is completely rain-proof and completely free.",
    highlights: ["Panjim", "~2 hours", "Rain-friendly", "Free"],
  },
  {
    id: "goa-act-spice",
    type: "activity",
    title: "Cashew & Spice Farms",
    description:
      "Walk the groves where feni starts, then eat lunch off a banana leaf.",
    image: img("cashew-apple"),
    tags: ["Nature", "Local", "Food", "Eco", "Culture", "Gastronomy"],
    extraImages: [img("cashew-tree"), img("feni-cashew"), img("paddy-fields")],
    longDescription:
      "The Ponda plantations grow cardamom, nutmeg, pepper, vanilla and — most importantly for Goa — cashew. A guided walk explains how each spice actually grows, usually finishes with an unlimited thali on a banana leaf, and is one of the better inland half-days when the coast is too hot.",
    highlights: ["Ponda", "Half day", "Lunch included", "~₹800"],
  },
  {
    id: "goa-act-aguada",
    type: "activity",
    title: "Fort Aguada",
    description:
      "A 1612 Portuguese sea fort and lighthouse guarding the Mandovi mouth.",
    image: img("fort-aguada"),
    tags: ["Historic", "Heritage", "Scenic", "Sea", "Photography", "Castle"],
    extraImages: [
      img("aguada-top"),
      img("chapora-walls"),
      img("beaches-of-goa"),
    ],
    longDescription:
      "Built to keep the Dutch and the Marathas out, Aguada was also a freshwater station — the name comes from 'água'. The four-storey lighthouse is the oldest of its kind in Asia. The upper fort is open and easy to walk; go late afternoon when the laterite turns orange.",
    highlights: ["Built 1612", "Oldest Asian lighthouse", "Candolim", "₹50"],
  },
  {
    id: "goa-act-chapora",
    type: "activity",
    title: "Chapora Fort Sunset",
    description:
      "A short laterite climb above Vagator for the best sunset view up north.",
    image: img("chapora-walls"),
    tags: ["Historic", "Scenic", "Outdoors", "Photography", "Budget", "Sea"],
    extraImages: [img("sunset-anjuna"), img("anjuna-rocks"), img("aguada-top")],
    longDescription:
      "Chapora is mostly ruined walls, which is exactly why it works — there is nothing between you and the view over Vagator beach and the Chapora river mouth. The climb takes about fifteen minutes and there is no shade, so go for sunset rather than the middle of the day.",
    highlights: ["15-min climb", "Vagator", "Go for sunset", "Free"],
  },
  {
    id: "goa-act-river",
    type: "activity",
    title: "Mandovi River & Backwaters",
    description:
      "Mangrove channels, dolphins at the river mouth, and working fishing boats.",
    image: img("mandovi-canoe"),
    tags: ["Water", "Sailing", "Nature", "Calm", "Scenic", "Wildlife"],
    extraImages: [
      img("morjim-boats"),
      img("beaches-of-goa"),
      img("palolem-south"),
    ],
    longDescription:
      "Behind the beaches, Goa is a river state. Early-morning boats out of Coco Beach and Britona head for the Mandovi mouth to look for humpback dolphins; slower backwater trips around Chorão and Divar islands go through the mangroves instead. Mornings are calmer water and far better wildlife.",
    highlights: ["Go early AM", "Dolphins", "Chorão mangroves", "~₹600"],
  },
  {
    id: "goa-act-market",
    type: "activity",
    title: "Anjuna Flea Market",
    description:
      "The Wednesday institution — crafts, clothes, spices and live music.",
    image: img("flea-market-4"),
    tags: ["Markets", "Shopping", "Local", "Social", "Fashion", "Culture"],
    extraImages: [
      img("flea-market-2"),
      img("flea-market-1"),
      img("spices-market"),
    ],
    longDescription:
      "Anjuna on a Wednesday is the original; the Saturday night market at Arpora is the newer, more polished evening version with food stalls and bands. Both are best in the last two hours before closing, when sellers would rather discount than pack up.",
    highlights: [
      "Wed, Anjuna",
      "Sat night, Arpora",
      "Haggle hard",
      "Cash only",
    ],
  },
  {
    id: "goa-act-arambol",
    type: "activity",
    title: "Arambol Sunset Sessions",
    description:
      "The daily drum circle, fire spinners and whoever turns up to play.",
    image: img("arambol-performer"),
    tags: ["Music", "Social", "Creative", "Art", "Beach", "Festive"],
    extraImages: [
      img("arambol-party"),
      img("arambol-night"),
      img("sunset-purple"),
    ],
    longDescription:
      "Every evening around sunset, Arambol beach fills with an unstructured drum circle, jugglers, fire spinners and acro-yoga. Nobody organises it and nobody charges for it. It is the clearest surviving trace of the Goa that people came looking for in the seventies.",
    highlights: ["Daily at sunset", "Arambol", "Nothing to book", "Free"],
  },
  {
    id: "goa-act-oldgoa",
    type: "activity",
    title: "Old Goa Churches",
    description:
      "UNESCO-listed basilicas from when this was the capital of Portuguese Asia.",
    image: img("bom-jesus"),
    tags: ["Heritage", "Historic", "Culture", "Spiritual", "Museum", "History"],
    extraImages: [
      img("bom-jesus-path"),
      img("mangeshi-temple"),
      img("mangeshi-2"),
    ],
    longDescription:
      "In 1600 Old Goa was bigger than London or Lisbon, until cholera emptied it. What remains is a UNESCO World Heritage cluster: the Basilica of Bom Jesus, which holds the remains of St Francis Xavier, and the vast Sé Cathedral. Cool, shaded and completely rain-proof.",
    highlights: ["UNESCO site", "Bom Jesus & Sé", "Rain-safe", "Free"],
  },
  {
    id: "goa-act-temple",
    type: "activity",
    title: "Mangeshi Temple",
    description:
      "Goa's best-known Hindu temple, with a distinctive seven-storey lamp tower.",
    image: img("mangeshi-temple"),
    tags: ["Spiritual", "Heritage", "Culture", "Historic", "Peaceful", "Local"],
    extraImages: [img("mangeshi-2"), img("bom-jesus"), img("bom-jesus-path")],
    longDescription:
      "Shree Mangesh at Mardol is the counterweight to Old Goa: the deity was moved inland in the 1500s to keep it out of Portuguese-controlled territory, and the current temple dates from the 18th century. Its white-and-gold deepstambha lamp tower is the signature image of Hindu Goa. Dress modestly; shoes come off at the steps.",
    highlights: ["Mardol, Ponda", "18th century", "Modest dress", "Free"],
  },
];

// ============================
// FOOD (8)
// ============================
export const GOA_FOOD_CARDS: DiscoveryCard[] = [
  {
    id: "goa-food-thali",
    type: "food",
    title: "Goan Fish Thali",
    description:
      "Rice, kokum curry, a fried mackerel and solkadhi — usually under ₹300.",
    image: img("fish-thali"),
    tags: ["Food", "Local", "Gastronomy", "Value", "Budget", "Sea"],
    extraImages: [
      img("mackerel-plate"),
      img("fish-curry-rice"),
      img("goan-thali"),
    ],
    longDescription:
      "The fish thali is what Goa actually eats for lunch: par-boiled red rice, a coconut-and-kokum curry, one fried fish, a vegetable, pickle and solkadhi to finish. Refills of rice and curry are normally unlimited. The best ones are in unglamorous places away from the beach road.",
    highlights: ["Lunch, 12–3pm", "Unlimited refills", "Go inland", "₹200–350"],
  },
  {
    id: "goa-food-curryrice",
    type: "food",
    title: "Fish Curry Rice",
    description:
      "The single dish Goa would keep if it had to give up all the others.",
    image: img("mackerel-plate"),
    tags: ["Food", "Local", "Gastronomy", "Value", "Warm", "Culture"],
    extraImages: [
      img("fish-curry-rice"),
      img("fish-thali"),
      img("prawn-curry"),
    ],
    longDescription:
      "Xitt kodi — coconut, red chilli, tamarind or kokum, and whatever came off the boat that morning. Mackerel and kingfish are the everyday fish. The sourness comes from kokum rather than tamarind on the coast, which is what makes a Goan curry taste different from a Keralan one.",
    highlights: [
      "Kokum-soured",
      "Mackerel & kingfish",
      "Everyday dish",
      "₹150–300",
    ],
  },
  {
    id: "goa-food-prawn",
    type: "food",
    title: "Prawn Curry & Balchão",
    description:
      "Butter-garlic, rechad or balchão — Goa does a lot with a prawn.",
    image: img("prawn-curry"),
    tags: ["Food", "Gastronomy", "Local", "Sea", "Unique", "Culture"],
    extraImages: [
      img("mackerel-plate"),
      img("fish-thali"),
      img("fish-curry-rice"),
    ],
    longDescription:
      "Balchão is the Portuguese-descended one: prawns preserved in a dark, vinegar-and-chilli masala, sharp enough to keep for days without refrigeration. Rechad is the stuffed-and-fried version, and butter-garlic is the shack default. All three are worth ordering at least once.",
    highlights: [
      "Balchão keeps",
      "Vinegar & chilli",
      "Shack staple",
      "₹350–600",
    ],
  },
  {
    id: "goa-food-bebinca",
    type: "food",
    title: "Bebinca & Goan Sweets",
    description:
      "A sixteen-layer coconut cake baked one painstaking layer at a time.",
    image: img("bebinca"),
    tags: ["Food", "Gastronomy", "Heritage", "Local", "Unique", "Culture"],
    extraImages: [img("goan-thali"), img("juice-siolim"), img("fish-thali")],
    longDescription:
      "Bebinca is the Christmas pudding of Goa and got a GI tag in 2023. Each layer of coconut milk, egg yolk, sugar and ghee is grilled separately before the next is poured on, which is why a proper one takes hours and costs what it costs. Dodol and bolinhas are the other two to try.",
    highlights: [
      "GI-tagged 2023",
      "16 layers",
      "Best at Christmas",
      "₹80–150/slice",
    ],
  },
  {
    id: "goa-food-feni",
    type: "food",
    title: "Feni & Sundowners",
    description:
      "Goa's own spirit — cashew in season, coconut all year, GI-protected.",
    image: img("feni-cashew"),
    tags: ["Wine", "Local", "Unique", "Social", "Heritage", "Night"],
    extraImages: [
      img("cashew-apple"),
      img("cashew-tree"),
      img("sunset-purple"),
    ],
    longDescription:
      "Feni is the only Indian spirit with a Geographical Indication, and it can legally only be made in Goa. Cashew feni is distilled from the pressed apple — not the nut — and is available from roughly February to May; coconut feni runs year-round. Urrak is the lighter first-distillation version and only exists in season.",
    highlights: [
      "GI-protected",
      "Cashew: Feb–May",
      "Try urrak in season",
      "₹100–250",
    ],
  },
  {
    id: "goa-food-shack",
    type: "food",
    title: "Beach Shack Dining",
    description:
      "Pick your fish off the ice, agree a price, eat it twenty minutes later.",
    image: img("shack-menu"),
    tags: ["Food", "Beach", "Social", "Value", "Sea", "Chill"],
    extraImages: [
      img("shack-curlies"),
      img("shack-arambol"),
      img("mackerel-plate"),
    ],
    longDescription:
      "Most shacks will bring out the day's catch on ice and let you choose. Whole fish is priced by weight, so confirm the rate per kilo and roughly what your fish weighs before saying yes — this is normal and nobody will be offended. Grilled with garlic butter is the safe order.",
    highlights: [
      "Priced by weight",
      "Confirm rate first",
      "~20 min",
      "₹600–1200",
    ],
  },
  {
    id: "goa-food-cafe",
    type: "food",
    title: "Juice Centres & Cafés",
    description:
      "Fresh chikoo shakes and slow breakfasts in the villages behind the beach.",
    image: img("juice-siolim"),
    tags: ["Café", "Coffee", "Food", "Local", "Budget", "Chill"],
    extraImages: [img("fontainhas-outpost"), img("shack-menu"), img("bebinca")],
    longDescription:
      "Two different things share the same slot. The old-school juice centre does chikoo, custard apple and mosambi shakes for under ₹100. The newer Assagao and Siolim café scene does sourdough and single-origin coffee for rather more. Both are the right answer at 10am.",
    highlights: ["Assagao & Siolim", "Chikoo shakes", "Good wi-fi", "₹80–500"],
  },
  {
    id: "goa-food-veg",
    type: "food",
    title: "Veg Thali on a Banana Leaf",
    description:
      "Unlimited vegetarian Goan and Konkani food, served until you stop eating.",
    image: img("goan-thali"),
    tags: ["Food", "Local", "Value", "Budget", "Culture", "Gastronomy"],
    extraImages: [
      img("fish-thali"),
      img("fish-curry-rice"),
      img("prawn-curry"),
    ],
    longDescription:
      "Goa is not only a seafood state — Saraswat vegetarian cooking is just as old. A veg thali on a banana leaf gets you several curries, a dry vegetable, dal, rice, papad and pickle, refilled until you fold the leaf towards you to signal you are finished. Ponda and Panjim do the best ones.",
    highlights: [
      "Unlimited refills",
      "Ponda & Panjim",
      "Fold leaf to stop",
      "₹120–250",
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
