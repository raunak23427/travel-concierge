import HomeScreen from "@/components/travel/HomeScreen";
import { SessionGate } from "@/components/auth/SessionGate";

export const metadata = { title: "Your plan | TravelBuddy" };

/** The Plan tab: the full editable itinerary plus any archived plans. */
export default function Page() {
  return (
    <SessionGate>
      <HomeScreen view="plan" />
    </SessionGate>
  );
}
