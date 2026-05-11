"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
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

function loadLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  return stored === "en" ? "en" : "zh";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
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
