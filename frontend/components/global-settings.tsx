"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
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
  userComputeMode: string;
  setComputeMode: (value: string) => void;
  aiPersona: string;
  setAiPersona: (value: string) => void;
  spaces: Space[];
  setSpaces: (spaces: Space[]) => void;
  fetchSpaces: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>({
  userComputeMode: "cloud",
  setComputeMode: () => {},
  aiPersona: "mentor",
  setAiPersona: () => {},
  spaces: [],
  setSpaces: () => {},
  fetchSpaces: async () => {},
});

export function GlobalSettingsProvider({ children }: { children: React.ReactNode }) {
  const [userComputeMode, setUserComputeMode] = useState("cloud");
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

  const value = useMemo(() => ({
    userComputeMode,
    setComputeMode: setUserComputeMode,
    aiPersona,
    setAiPersona,
    spaces,
    setSpaces,
    fetchSpaces,
  }), [userComputeMode, aiPersona, spaces, fetchSpaces]);

  return (
    <SettingsContext.Provider value={value}>
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

  // Derived state: effective computeMode and lock status
  const computeMode = activeSpace?.llm_provider ?? context.userComputeMode;
  const isComputeModeLocked = Boolean(activeSpace?.llm_provider);

  return {
    ...context,
    computeMode,
    isComputeModeLocked,
    activeSpace,
  };
}
