const STORAGE_KEY = "gemini_custom_api_key";

export function getCustomApiKey(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const key = localStorage.getItem(STORAGE_KEY);
    if (!key || !key.trim()) return null;
    return key.trim();
  } catch {
    return null;
  }
}

export function setCustomApiKey(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn("[ApiKeyStorage] Failed to save key to localStorage:", err);
  }
}

export function removeCustomApiKey(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[ApiKeyStorage] Failed to remove key from localStorage:", err);
  }
}

export function hasCustomApiKey(): boolean {
  const key = getCustomApiKey();
  return Boolean(key && key.length >= 15);
}

export function maskApiKey(key: string | null): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}`;
}

export function validateApiKeyFormat(key: string): { isValid: boolean; error?: string } {
  const trimmed = key.trim();
  if (!trimmed) {
    return { isValid: false, error: "API key cannot be empty." };
  }
  if (!trimmed.startsWith("AIzaSy")) {
    return {
      isValid: false,
      error: "Invalid Google API key format. Google Gemini keys start with 'AIzaSy...'",
    };
  }
  if (trimmed.length < 35 || trimmed.length > 45) {
    return {
      isValid: false,
      error: "Unexpected key length. Standard Google AI Studio keys are ~39 characters.",
    };
  }
  return { isValid: true };
}
