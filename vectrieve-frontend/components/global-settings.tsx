"use client";
import React, { createContext, useContext, useState } from "react";

type SettingsContextType = {
  computeMode: string;
  setComputeMode: (value: string) => void;
  aiPersona: string;
  setAiPersona: (value: string) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  computeMode: "cloud",
  setComputeMode: () => {},
  aiPersona: "mentor",
  setAiPersona: () => {},
});

export function GlobalSettingsProvider({ children }: { children: React.ReactNode }) {
  const [computeMode, setComputeMode] = useState("cloud");
  const [aiPersona, setAiPersona] = useState("mentor");

  return (
    <SettingsContext.Provider value={{ computeMode, setComputeMode, aiPersona, setAiPersona }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  return useContext(SettingsContext);
}
