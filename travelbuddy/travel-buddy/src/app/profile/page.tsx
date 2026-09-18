import ProfileScreen from "@/components/travel/ProfileScreen";
import { SessionGate } from "@/components/auth/SessionGate";

export const metadata = { title: "Your profile | TravelBuddy" };

/** Who the traveller is: taste, preferences, settings and past plans. */
export default function Page() {
  return (
    <SessionGate>
      <ProfileScreen />
    </SessionGate>
  );
}
