"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SupportedLanguage, FontSizeOption, TranslationDictionary, translations } from "./translations";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "vectrieve_preferred_language";
const FONT_SIZE_STORAGE_KEY = "vectrieve_font_size";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [fontSize, setFontSizeState] = useState<FontSizeOption>("default");

  useEffect(() => {
    // 1. Read stored language
    const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
    if (savedLang && (savedLang === "uk" || savedLang === "en" || savedLang === "pl" || savedLang === "es")) {
      setLanguageState(savedLang);
    }

    // 2. Read stored font size
    const savedSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY) as FontSizeOption | null;
    if (savedSize && (savedSize === "compact" || savedSize === "default" || savedSize === "large")) {
      setFontSizeState(savedSize);
      applyFontSizeClass(savedSize);
    }
  }, []);

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
  };

  const applyFontSizeClass = (size: FontSizeOption) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("text-compact", "text-default", "text-large");
      if (size === "compact") document.documentElement.classList.add("text-compact");
      else if (size === "large") document.documentElement.classList.add("text-large");
      else document.documentElement.classList.add("text-default");
    }
  };

  const setFontSize = (newSize: FontSizeOption) => {
    setFontSizeState(newSize);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, newSize);
    applyFontSizeClass(newSize);
  };

  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, fontSize, setFontSize, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
