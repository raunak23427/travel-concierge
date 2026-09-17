import HomeScreen from "@/components/travel/HomeScreen";
import { SessionGate } from "@/components/auth/SessionGate";
export default function Page() { return <SessionGate><HomeScreen /></SessionGate>; }
