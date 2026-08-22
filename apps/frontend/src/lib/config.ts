function getBackendUrl(): string {
  // 1. Check window.__ENV__ if injected
  if (typeof window !== "undefined" && (window as any).__ENV__?.BACKEND_URL) {
    return (window as any).__ENV__.BACKEND_URL;
  }

  // 2. Safely check process.env if defined
  try {
    if (typeof process !== "undefined" && process?.env) {
      const url =
        process.env.BUN_PUBLIC_BACKEND_URL ||
        process.env.VITE_BACKEND_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL;
      if (url) return url;
    }
  } catch {
    // ignore in browser
  }

  // 3. Check import.meta.env if available
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv) {
      const url =
        metaEnv.BUN_PUBLIC_BACKEND_URL ||
        metaEnv.VITE_BACKEND_URL ||
        metaEnv.NEXT_PUBLIC_BACKEND_URL ||
        metaEnv.BACKEND_URL;
      if (url) return url;
    }
  } catch {
    // ignore
  }

  // 4. Localhost fallback
  if (typeof window !== "undefined" && window.location) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:3001";
    }
  }

  return "http://localhost:3001";
}

export const BACKEND_URL: string = getBackendUrl();

export function getBackendWsUrl(path: string): string {
  const url = new URL(path, BACKEND_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}