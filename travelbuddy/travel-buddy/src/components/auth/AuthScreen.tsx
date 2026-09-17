"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import { startDemoMode } from "./SessionGate";
import styles from "./entry.module.css";

export default function AuthScreen({ mode, googleConfigured }: { mode: "signin" | "signup"; googleConfigured: boolean }) {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === "authenticated") router.replace("/home"); }, [status, router]);
  const enterDemo = () => {
    startDemoMode();
    router.replace("/home");
  };

  return <main className={styles.authPage}>
    <AuthModal isOpen initialMode={mode} presentation="page" googleConfigured={googleConfigured}
      onModeChange={next => router.push(next === "signup" ? "/signup" : "/login")}
      onClose={() => router.push("/welcome")} onSuccess={enterDemo} skipCredentialValidation />
  </main>;
}
