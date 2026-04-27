"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { APIKeys } from "@/lib/apiKeys";
import { getStoredAPIKeys, saveAPIKeys } from "@/lib/apiKeys";

interface APIKeyContextType {
  apiKeys: APIKeys;
  setAPIKeys: (keys: APIKeys) => void;
  updateKey: (key: keyof APIKeys, value: string | undefined) => void;
  clearKeys: () => void;
  isLoaded: boolean;
}

const APIKeyContext = createContext<APIKeyContextType | undefined>(undefined);

export function APIKeyProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeysState] = useState<APIKeys>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getStoredAPIKeys();
    setApiKeysState(stored);
    setIsLoaded(true);
  }, []);

  const setAPIKeys = (keys: APIKeys) => {
    setApiKeysState(keys);
    saveAPIKeys(keys);
  };

  const updateKey = (key: keyof APIKeys, value: string | undefined) => {
    const updated = { ...apiKeys };
    if (value) {
      updated[key] = value;
    } else {
      delete updated[key];
    }
    setAPIKeys(updated);
  };

  const clearKeys = () => {
    setApiKeysState({});
    saveAPIKeys({});
  };

  return (
    <APIKeyContext.Provider value={{ apiKeys, setAPIKeys, updateKey, clearKeys, isLoaded }}>
      {children}
    </APIKeyContext.Provider>
  );
}

export function useAPIKeys() {
  const context = useContext(APIKeyContext);
  if (!context) {
    throw new Error("useAPIKeys must be used within an APIKeyProvider");
  }
  return context;
}
