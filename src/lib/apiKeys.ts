// API Key management utilities
export interface APIKeys {
  GITHUB_TOKEN?: string;
  GEMINI_API_KEY?: string;
  SERPER_API_KEY?: string;
}

const STORAGE_KEY = "openagent_api_keys";

/**
 * Get API keys from localStorage
 */
export function getStoredAPIKeys(): APIKeys {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as APIKeys;
    }
  } catch (err) {
    console.error("Failed to parse stored API keys:", err);
  }

  return {};
}

/**
 * Save API keys to localStorage
 */
export function saveAPIKeys(keys: APIKeys): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.error("Failed to save API keys:", err);
  }
}

/**
 * Clear stored API keys
 */
export function clearAPIKeys(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear API keys:", err);
  }
}

/**
 * Check if any API keys are stored
 */
export function hasStoredAPIKeys(): boolean {
  const keys = getStoredAPIKeys();
  return !!(keys.GITHUB_TOKEN || keys.GEMINI_API_KEY || keys.SERPER_API_KEY);
}

/**
 * Get a specific API key
 */
export function getAPIKey(key: keyof APIKeys): string | undefined {
  const keys = getStoredAPIKeys();
  return keys[key];
}

/**
 * Update a specific API key
 */
export function updateAPIKey(key: keyof APIKeys, value: string | undefined): void {
  const keys = getStoredAPIKeys();
  if (value) {
    keys[key] = value;
  } else {
    delete keys[key];
  }
  saveAPIKeys(keys);
}
