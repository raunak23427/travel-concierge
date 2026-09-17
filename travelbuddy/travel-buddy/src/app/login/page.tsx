import AuthScreen from "@/components/auth/AuthScreen";
export default function Page() { return <AuthScreen mode="signin" googleConfigured={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />; }
