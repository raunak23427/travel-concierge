import { TripItinerary } from "@/data/itineraryMock";

export type ItineraryCostBreakdown = TripItinerary["breakdown"];

export interface ItineraryCostSummary {
  breakdown: ItineraryCostBreakdown;
  totalCost: number;
}

export interface PaymentCostSummary {
  tripCost: number;
  convenienceFee: number;
  gst: number;
  subtotal: number;
  travelCashDiscount: number;
  totalPaid: number;
}

function asCost(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function sumListedCosts(
  entries: unknown,
  fallback: unknown,
  keys: string[] = ["cost"],
): number {
  if (!Array.isArray(entries)) return asCost(fallback) ?? 0;

  let hasListedCost = false;
  const total = entries.reduce((sum, entry) => {
    if (!entry || typeof entry !== "object") return sum;

    const value = keys
      .map((key) => asCost((entry as Record<string, unknown>)[key]))
      .find((cost): cost is number => cost !== null);

    if (value === undefined) return sum;
    hasListedCost = true;
    return sum + value;
  }, 0);

  return hasListedCost ? total : asCost(fallback) ?? 0;
}

/**
 * Returns the one price source used by the itinerary, booking confirmation and
 * payment receipt. Flight and accommodation listings are informational only;
 * the traveller's estimate covers planned activities, transfers and selected
 * optional add-ons.
 */
export function calculateItineraryCosts(
  itinerary: TripItinerary,
  manuallyAddedMustDoDays: ReadonlySet<number> = new Set(),
): ItineraryCostSummary {
  const savedBreakdown = itinerary.breakdown ?? {
    flights: 0,
    stay: 0,
    activities: 0,
    transfers: 0,
  };

  const flights = 0;
  const stay = 0;
  const transfers = sumListedCosts(itinerary.transfers, savedBreakdown.transfers, [
    "cost",
    "price",
  ]);

  const activityEntries = (itinerary.days ?? []).flatMap((day, dayIndex) => {
    const includedMustDo =
      day.mustDo?.alignsWithPreferences === true ||
      day.mustDo?.includedInTripCost === true;
    const manuallyAddedMustDo = manuallyAddedMustDoDays.has(dayIndex);
    return [
      ...(day.items ?? []),
      ...(includedMustDo || manuallyAddedMustDo ? [day.mustDo] : []),
    ];
  });
  const activities = sumListedCosts(
    activityEntries,
    savedBreakdown.activities,
    ["cost", "price"],
  );

  const breakdown = {
    flights: Math.round(flights),
    stay: Math.round(stay),
    activities: Math.round(activities),
    transfers: Math.round(transfers),
  };

  return {
    breakdown,
    totalCost:
      breakdown.flights +
      breakdown.stay +
      breakdown.activities +
      breakdown.transfers,
  };
}

export function withCalculatedItineraryCosts(
  itinerary: TripItinerary,
  manuallyAddedMustDoDays?: ReadonlySet<number>,
): TripItinerary {
  return {
    ...itinerary,
    ...calculateItineraryCosts(itinerary, manuallyAddedMustDoDays),
  };
}

/**
 * Applies the onboarding budget to only the costs that are actually included
 * in this product's estimate: itinerary activities and local transfers.
 */
export function withBudgetAlignedItineraryCosts(
  itinerary: TripItinerary,
  requestedBudget: number | undefined = itinerary.budget,
): TripItinerary {
  const targetBudget = asCost(requestedBudget);
  if (targetBudget === null || targetBudget <= 0) {
    return withCalculatedItineraryCosts(itinerary);
  }

  const current = calculateItineraryCosts(itinerary);
  if (current.totalCost <= 0) {
    return withCalculatedItineraryCosts({
      ...itinerary,
      budget: Math.round(targetBudget),
      breakdown: {
        ...itinerary.breakdown,
        flights: 0,
        stay: 0,
        activities: Math.round(targetBudget),
        transfers: 0,
      },
    });
  }

  const multiplier = targetBudget / current.totalCost;
  const scaleCost = (cost: number) => Math.max(0, Math.round(cost * multiplier));
  const adjusted = {
    ...itinerary,
    budget: Math.round(targetBudget),
    transfers: (itinerary.transfers ?? []).map((transfer) => ({
      ...transfer,
      cost: scaleCost(transfer.cost || 0),
    })),
    days: (itinerary.days ?? []).map((day) => {
      const includeMustDo =
        day.mustDo?.alignsWithPreferences === true ||
        day.mustDo?.includedInTripCost === true;
      return {
        ...day,
        items: (day.items ?? []).map((item) => ({
          ...item,
          cost: scaleCost(item.cost || 0),
        })),
        mustDo:
          day.mustDo && includeMustDo
            ? { ...day.mustDo, cost: scaleCost(day.mustDo.cost || 0) }
            : day.mustDo,
      };
    }),
  };

  const rounded = withCalculatedItineraryCosts(adjusted);
  const remainder = Math.round(targetBudget) - rounded.totalCost;
  const adjustableCosts = [
    ...rounded.transfers,
    ...rounded.days.flatMap((day) => [
      ...day.items,
      ...(day.mustDo?.alignsWithPreferences || day.mustDo?.includedInTripCost
        ? [day.mustDo]
        : []),
    ]),
  ];
  const largestCost = adjustableCosts.reduce<(typeof adjustableCosts)[number] | null>(
    (largest, item) => (!largest || item.cost > largest.cost ? item : largest),
    null,
  );

  if (largestCost && largestCost.cost + remainder >= 0) {
    largestCost.cost += remainder;
    return withCalculatedItineraryCosts(rounded);
  }

  return withCalculatedItineraryCosts({
    ...rounded,
    breakdown: {
      ...rounded.breakdown,
      activities: rounded.breakdown.activities + remainder,
    },
  });
}

export function calculatePaymentCosts(
  tripCost: number,
  requestedTravelCashDiscount = 0,
): PaymentCostSummary {
  const normalizedTripCost = Math.round(asCost(tripCost) ?? 0);
  const convenienceFee = Math.round(normalizedTripCost * 0.02);
  const gst = Math.round(convenienceFee * 0.18);
  const subtotal = normalizedTripCost + convenienceFee + gst;
  const travelCashDiscount = Math.min(
    subtotal,
    Math.round(asCost(requestedTravelCashDiscount) ?? 0),
  );

  return {
    tripCost: normalizedTripCost,
    convenienceFee,
    gst,
    subtotal,
    travelCashDiscount,
    totalPaid: subtotal - travelCashDiscount,
  };
}
