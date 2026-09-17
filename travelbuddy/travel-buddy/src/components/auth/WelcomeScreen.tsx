"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { useSession } from "next-auth/react";
import styles from "./entry.module.css";

const welcomeScenes = [
  { image: "/goa/fire-dancing.jpg", location: "Morjim", alt: "Fire dancers at a nighttime beach party in Morjim, Goa" },
  { image: "/goa/sunset-anjuna.jpg", location: "Anjuna", alt: "Sunset over the rocky shore at Anjuna, Goa" },
  { image: "/goa/fontainhas-street.jpg", location: "Fontainhas, Panjim", alt: "Colourful street in Fontainhas, Panjim" },
  { image: "/goa/dudhsagar.jpg", location: "Dudhsagar Falls", alt: "Water flowing down Dudhsagar Falls in Goa" },
  { image: "/goa/shack-curlies.jpg", location: "Anjuna Beach Shack", alt: "Guests looking out from a beach shack in Anjuna" },
  { image: "/goa/palolem-south.jpg", location: "Palolem", alt: "Palm-lined coast at Palolem beach in Goa" },
];

export default function WelcomeScreen() {
  const { status } = useSession();
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveScene((scene) => (scene + 1) % welcomeScenes.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className={styles.welcome}>
      <section className={styles.hero} aria-label={`${welcomeScenes[activeScene].location}, Goa`}>
        {welcomeScenes.map((scene, index) => (
          <img
            key={scene.image}
            src={scene.image}
            alt={index === activeScene ? scene.alt : ""}
            aria-hidden={index !== activeScene}
            className={`${styles.photo} ${index === activeScene ? styles.activePhoto : ""}`}
          />
        ))}
        <div className={styles.heroOverlay} />
        <div className={styles.heroMeta}>
          <span className={styles.locationDot} aria-hidden="true" />
          <span>{welcomeScenes[activeScene].location}</span>
        </div>
        <div className={styles.sceneDots} aria-hidden="true">
          {welcomeScenes.map((scene, index) => (
            <span key={scene.image} className={index === activeScene ? styles.activeDot : ""} />
          ))}
        </div>
      </section>

      <section className={styles.welcomeContent}>
        <div className={styles.brandMark} aria-hidden="true"><Compass size={32} strokeWidth={2.7} /></div>
        <h1>TravelBuddy</h1>
        <p className={styles.tagline}>Stop searching. Start discovering.</p>

        {status === "authenticated" ? (
          <Link className={styles.primary} href="/home">Go to homepage <ArrowRight size={19} /></Link>
        ) : (
          <Link className={styles.primary} href="/login">
            Plan My Trip <ArrowRight size={19} />
          </Link>
        )}

        <p className={styles.poweredBy}>Powered by HotelAPI &middot; Live trip intelligence</p>
      </section>
    </main>
  );
}
