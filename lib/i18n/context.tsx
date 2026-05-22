"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { zh, en } from "./dict";
import type { Locale, Dictionary } from "./dict";

const dictionaries: Record<Locale, Dictionary> = { zh, en };

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  dict: zh,
  setLocale: () => {},
});

const STORAGE_KEY = "ysu-locale";
const MANUAL_KEY = "ysu-locale-manual";

function resolveLocale(raw: string): Locale {
  return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function detectSystemLocale(): Locale {
  if (typeof navigator !== "undefined" && navigator.language) {
    return resolveLocale(navigator.language);
  }
  return "zh";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectSystemLocale);

  // On mount: detect system language unless user has manually set one
  useEffect(() => {
    if (typeof window === "undefined") return;
    // User has manually set language — respect it and skip system detection
    if (localStorage.getItem(MANUAL_KEY)) {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && saved !== locale) {
        setLocaleState(saved);
      }
      return;
    }

    let cancelled = false;

    (async () => {
      let detected: Locale;
      try {
        const { Device } = await import("@capacitor/device");
        const { value } = await Device.getLanguageCode();
        detected = resolveLocale(value);
      } catch {
        detected = detectSystemLocale();
      }
      if (!cancelled) {
        setLocaleState(detected);
        localStorage.setItem(STORAGE_KEY, detected);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
      localStorage.setItem(MANUAL_KEY, "1");
    }
  }, []);

  const dict = dictionaries[locale];

  return (
    <I18nContext.Provider value={{ locale, dict, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
