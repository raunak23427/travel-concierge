"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Light, dark, or whatever the phone is set to.
 *
 * The chosen theme is written to <html data-theme>, which is what the dark
 * rules in globals.css hang off. "system" deliberately stays live: if the
 * phone flips to dark at sunset, so does the app, without a reload.
 */

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "travelbuddy:theme";

/**
 * Runs before first paint, inlined in <head>.
 *
 * Without this the browser paints the light theme, then React hydrates and
 * swaps to dark — a white flash on every navigation, which is exactly the
 * thing people turn dark mode on to avoid.
 */
export const THEME_BOOTSTRAP = `(function(){try{var c=localStorage.getItem('${THEME_KEY}')||'system';var d=c==='dark'||(c==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

type ThemeContextValue = {
  choice: ThemeChoice;
  /** What is actually on screen once "system" has been resolved. */
  resolved: "light" | "dark";
  setChoice: (choice: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const prefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

function apply(choice: ThemeChoice): "light" | "dark" {
  const dark = choice === "dark" || (choice === "system" && prefersDark());
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  return dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Read what the bootstrap script already decided, rather than guessing again.
  useEffect(() => {
    let stored: ThemeChoice = "system";
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") stored = raw;
    } catch {
      /* private mode — fall back to following the system */
    }
    setChoiceState(stored);
    setResolved(apply(stored));
  }, []);

  // Follow the phone while the choice is "system".
  useEffect(() => {
    if (choice !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(apply("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    setResolved(apply(next));
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* the theme still applies for this session */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ choice, resolved, setChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}
