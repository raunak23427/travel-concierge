import type { ItineraryActivity } from "./itineraryMock";

/**
 * Swap-in options for the itinerary's Replace sheet.
 *
 * Grouped by the item type they can stand in for, so replacing a dinner
 * offers dinners and replacing a transfer offers transfers — the previous
 * sheet offered the same three beaches whatever you tapped.
 *
 * Everything here is a real place or a real way of getting about in Goa, and
 * the names match the gazetteer in lib/goa-geo so the map and the routed
 * distances keep working after a swap.
 */

export type Alternative = {
  activity: string;
  description: string;
  /** Indicative rupees per person; 0 means free. */
  cost: number;
  /** Short area label, shown as context in the sheet. */
  area: string;
  /** Roughly how long to set aside. */
  duration: string;
  tags: string[];
};

export const ALTERNATIVES: Record<ItineraryActivity["type"], Alternative[]> = {
  activity: [
    {
      activity: "Fort Aguada",
      description: "1612 sea fort and Asia's oldest lighthouse",
      cost: 50,
      area: "Candolim",
      duration: "2 hr",
      tags: ["Heritage", "Sea"],
    },
    {
      activity: "Chapora Fort",
      description: "Short laterite climb, the best sunset up north",
      cost: 0,
      area: "Vagator",
      duration: "1.5 hr",
      tags: ["Sunset", "Free"],
    },
    {
      activity: "Basilica of Bom Jesus",
      description: "UNESCO-listed, shaded and rain-proof",
      cost: 0,
      area: "Old Goa",
      duration: "2 hr",
      tags: ["Heritage", "Rain-safe"],
    },
    {
      activity: "Fontainhas Walk",
      description: "Asia's best-preserved Latin Quarter, on foot",
      cost: 0,
      area: "Panjim",
      duration: "2 hr",
      tags: ["Heritage", "Free"],
    },
    {
      activity: "Mangeshi Temple",
      description: "18th-century temple with the lamp tower",
      cost: 0,
      area: "Ponda",
      duration: "1.5 hr",
      tags: ["Spiritual", "Local"],
    },
    {
      activity: "Spice Plantation",
      description: "Guided walk, lunch on a banana leaf",
      cost: 800,
      area: "Ponda",
      duration: "Half day",
      tags: ["Nature", "Food"],
    },
    {
      activity: "Dudhsagar Waterfalls",
      description: "Forest jeep to a 310m four-tier falls",
      cost: 3000,
      area: "Mollem",
      duration: "Full day",
      tags: ["Nature", "Adventure"],
    },
    {
      activity: "Anjuna Flea Market",
      description: "The Wednesday institution since the seventies",
      cost: 0,
      area: "Anjuna",
      duration: "3 hr",
      tags: ["Markets", "Shopping"],
    },
    {
      activity: "Grande Island",
      description: "Beginner dive and snorkel on a wreck reef",
      cost: 3500,
      area: "Vasco",
      duration: "Full day",
      tags: ["Water", "Adventure"],
    },
    {
      activity: "Divar Island",
      description: "Free ferry across to empty village lanes",
      cost: 0,
      area: "Divar",
      duration: "3 hr",
      tags: ["Quiet", "Ferry"],
    },
  ],
  food: [
    {
      activity: "Lunch at Vinayak",
      description: "Famous fish thali, locals queue for it",
      cost: 400,
      area: "Assagao",
      duration: "1 hr",
      tags: ["Goan", "Value"],
    },
    {
      activity: "Dinner at Martin's Corner",
      description: "Institution for Goan seafood and live music",
      cost: 1800,
      area: "Betalbatim",
      duration: "2 hr",
      tags: ["Seafood", "Classic"],
    },
    {
      activity: "Lunch at Ritz Classic",
      description: "Panjim's reliable thali and prawn rava fry",
      cost: 600,
      area: "Panjim",
      duration: "1 hr",
      tags: ["Goan", "Value"],
    },
    {
      activity: "Breakfast at Cafe Bhonsle",
      description: "Old-school Panjim breakfast counter",
      cost: 200,
      area: "Panjim",
      duration: "45 min",
      tags: ["Local", "Budget"],
    },
    {
      activity: "Brunch at Gunpowder",
      description: "Garden courtyard, South Indian plates",
      cost: 1200,
      area: "Assagao",
      duration: "1.5 hr",
      tags: ["Cafe", "Trendy"],
    },
    {
      activity: "Dinner at Thalassa",
      description: "Greek on the cliff, book the sunset slot",
      cost: 2200,
      area: "Vagator",
      duration: "2 hr",
      tags: ["Sunset", "Upscale"],
    },
    {
      activity: "Lunch at Mum's Kitchen",
      description: "Recipes collected from Goan grandmothers",
      cost: 1100,
      area: "Panjim",
      duration: "1.5 hr",
      tags: ["Goan", "Heritage"],
    },
    {
      activity: "Dinner at Bomra's",
      description: "Burmese, one of the state's best kitchens",
      cost: 2400,
      area: "Candolim",
      duration: "2 hr",
      tags: ["Upscale", "Booking"],
    },
    {
      activity: "Lunch at Venite",
      description: "Balcao tables over a Fontainhas lane",
      cost: 900,
      area: "Panjim",
      duration: "1.5 hr",
      tags: ["Goan", "Heritage"],
    },
    {
      activity: "Snacks at Baba Au Rhum",
      description: "Bakery in the fields, croissants and coffee",
      cost: 500,
      area: "Anjuna",
      duration: "1 hr",
      tags: ["Cafe", "Bakery"],
    },
  ],
  relax: [
    {
      activity: "Palolem Beach",
      description: "Crescent bay, calm water, kayaks for hire",
      cost: 0,
      area: "Palolem",
      duration: "Half day",
      tags: ["Quiet", "Swim"],
    },
    {
      activity: "Ashwem Beach",
      description: "Wide and uncrowded, good shacks",
      cost: 0,
      area: "Ashwem",
      duration: "Half day",
      tags: ["Calm", "Shacks"],
    },
    {
      activity: "Morjim Beach",
      description: "Long flat sand at the Chapora river mouth",
      cost: 0,
      area: "Morjim",
      duration: "Half day",
      tags: ["Calm", "Turtles"],
    },
    {
      activity: "Candolim Beach",
      description: "Central and easy, plenty of sunbeds",
      cost: 0,
      area: "Candolim",
      duration: "Half day",
      tags: ["Easy", "Central"],
    },
    {
      activity: "Agonda Beach",
      description: "The quiet one, almost no nightlife",
      cost: 0,
      area: "Agonda",
      duration: "Half day",
      tags: ["Quiet", "Solo"],
    },
    {
      activity: "Arambol Sunset Sessions",
      description: "Daily drum circle and fire spinners",
      cost: 0,
      area: "Arambol",
      duration: "3 hr",
      tags: ["Music", "Free"],
    },
    {
      activity: "Yoga at Mandrem",
      description: "Morning shala session, drop-ins welcome",
      cost: 500,
      area: "Mandrem",
      duration: "1.5 hr",
      tags: ["Wellness", "Morning"],
    },
  ],
  travel: [
    {
      activity: "Scooter rental",
      description: "Cheapest and most flexible, carry your licence",
      cost: 400,
      area: "Anywhere",
      duration: "Per day",
      tags: ["Scooter", "Flexible"],
    },
    {
      activity: "Pre-paid taxi",
      description: "Fixed fare from the airport counter",
      cost: 1200,
      area: "Airport",
      duration: "1 hr",
      tags: ["Taxi", "Fixed fare"],
    },
    {
      activity: "App cab transfer",
      description: "Goa Miles or Rapido, metered",
      cost: 900,
      area: "Anywhere",
      duration: "1 hr",
      tags: ["Taxi", "Metered"],
    },
    {
      activity: "Rental car with driver",
      description: "Worth it with luggage or a group",
      cost: 2500,
      area: "Anywhere",
      duration: "Per day",
      tags: ["Car", "Comfort"],
    },
    {
      activity: "Local bus",
      description: "Very cheap, frequent on the main roads",
      cost: 40,
      area: "Anywhere",
      duration: "1.5 hr",
      tags: ["Bus", "Budget"],
    },
    {
      activity: "Divar ferry crossing",
      description: "Free flat-bottom ferry over the Mandovi",
      cost: 0,
      area: "Divar",
      duration: "20 min",
      tags: ["Ferry", "Free"],
    },
  ],
};

/**
 * Options that could stand in for this item, ranked so the cheapest sensible
 * swaps come first, excluding anything already on the itinerary.
 */
export function alternativesFor(
  item: ItineraryActivity,
  alreadyPlanned: string[],
): Alternative[] {
  const pool = ALTERNATIVES[item.type] || ALTERNATIVES.activity;
  const taken = new Set(alreadyPlanned.map((a) => a.toLowerCase()));
  const budget = item.cost || 0;
  return pool
    .filter((a) => !taken.has(a.activity.toLowerCase()))
    .sort((a, b) => Math.abs(a.cost - budget) - Math.abs(b.cost - budget))
    .slice(0, 6);
}
