import axios from "axios";
import { BACKEND_URL } from "./config";

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
  if (trimmed.length < 15) {
    return {
      isValid: false,
      error: "API key is too short. Please paste a valid Google Gemini API key.",
    };
  }
  // Catch wrong token types like OpenAI (sk-...) or GitHub (ghp_...)
  if (trimmed.startsWith("sk-") || trimmed.startsWith("ghp_") || trimmed.startsWith("gho_")) {
    return {
      isValid: false,
      error: "This looks like an OpenAI or GitHub token. Please enter a Google Gemini API key.",
    };
  }
  return { isValid: true };
}

export async function verifyGeminiApiKey(key: string): Promise<{ isValid: boolean; error?: string }> {
  const formatCheck = validateApiKeyFormat(key);
  if (!formatCheck.isValid) {
    return formatCheck;
  }

  const trimmed = key.trim();

  // Try backend verification endpoint first
  try {
    const res = await axios.post(
      `${BACKEND_URL}/api/v1/verify-key`,
      { apiKey: trimmed },
      { timeout: 8000 }
    );
    if (res.data?.valid) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: res.data?.error || "Google rejected this API key. Please check your key in Google AI Studio.",
    };
  } catch (err: any) {
    // If backend verification fails or times out, fallback to direct client-side Google ping
    try {
      const googleRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmed)}`
      );
      if (googleRes.ok) {
        return { isValid: true };
      }
      const data = await googleRes.json().catch(() => ({}));
      return {
        isValid: false,
        error:
          data?.error?.message ||
          "Google rejected this API key. Please verify your key in Google AI Studio.",
      };
    } catch {
      // If network cannot reach Google at all, allow saving if syntax is valid
      return { isValid: true };
    }
  }
}
