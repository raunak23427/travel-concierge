import ConfirmedItinerary from "@/components/travel/ConfirmedItinerary";
import { SessionGate } from "@/components/auth/SessionGate";

export const metadata = { title: "Your plan | TravelBuddy" };

export default function Page() {
  return (
    <SessionGate>
      <ConfirmedItinerary />
    </SessionGate>
  );
}
