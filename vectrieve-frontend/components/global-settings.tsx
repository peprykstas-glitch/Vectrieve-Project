"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/client";

export interface Space {
  id: string;
  name: string;
  system_prompt?: string;
  llm_provider?: "cloud" | "local" | null;
  llm_model?: string | null;
  temperature?: number | null;
  max_tokens?: number | null;
  top_p?: number | null;
}

type SettingsContextType = {
  computeMode: string;
  setComputeMode: (value: string) => void;
  aiPersona: string;
  setAiPersona: (value: string) => void;
  spaces: Space[];
  setSpaces: (spaces: Space[]) => void;
  fetchSpaces: () => Promise<void>;
  activeSpace: Space | null;
};

const SettingsContext = createContext<SettingsContextType>({
  computeMode: "cloud",
  setComputeMode: () => {},
  aiPersona: "mentor",
  setAiPersona: () => {},
  spaces: [],
  setSpaces: () => {},
  fetchSpaces: async () => {},
  activeSpace: null,
});

export function GlobalSettingsProvider({ children }: { children: React.ReactNode }) {
  const [computeMode, setComputeMode] = useState("cloud");
  const [aiPersona, setAiPersona] = useState("mentor");
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);

  const fetchSpaces = useCallback(async () => {
    try {
      const data = await apiClient<Space[]>('/spaces');
      setSpaces(data);
      
      const params = new URLSearchParams(window.location.search);
      const spaceId = params.get('space');
      if (spaceId) {
        const found = data.find(s => s.id === spaceId);
        setActiveSpace(found || null);
      } else {
        setActiveSpace(null);
      }
    } catch (e) {
      console.error("Failed to load spaces", e);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  useEffect(() => {
    if (activeSpace?.llm_provider) {
      setComputeMode(activeSpace.llm_provider);
    }
  }, [activeSpace]);

  return (
    <SettingsContext.Provider 
      value={{ 
        computeMode, 
        setComputeMode, 
        aiPersona, 
        setAiPersona, 
        spaces, 
        setSpaces, 
        fetchSpaces, 
        activeSpace 
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  return useContext(SettingsContext);
}
