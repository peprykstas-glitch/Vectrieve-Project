"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
};

const SettingsContext = createContext<SettingsContextType>({
  computeMode: "cloud",
  setComputeMode: () => {},
  aiPersona: "mentor",
  setAiPersona: () => {},
  spaces: [],
  setSpaces: () => {},
  fetchSpaces: async () => {},
});

export function GlobalSettingsProvider({ children }: { children: React.ReactNode }) {
  const [computeMode, setComputeMode] = useState("cloud");
  const [aiPersona, setAiPersona] = useState("mentor");
  const [spaces, setSpaces] = useState<Space[]>([]);

  const fetchSpaces = useCallback(async () => {
    try {
      const data = await apiClient<Space[]>('/spaces');
      setSpaces(data);
    } catch (e) {
      console.error("Failed to load spaces", e);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  const context = useContext(SettingsContext);
  const searchParams = useSearchParams();
  
  const spaceId = searchParams.get('space');
  const activeSpace = spaceId 
    ? context.spaces.find(s => s.id === spaceId) || null
    : null;

  // Reactively synchronize computeMode with activeSpace provider restriction
  useEffect(() => {
    if (activeSpace?.llm_provider) {
      context.setComputeMode(activeSpace.llm_provider);
    }
  }, [activeSpace, context]);

  return {
    ...context,
    activeSpace,
  };
}
