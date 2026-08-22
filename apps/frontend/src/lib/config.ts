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

  // 4. Dynamic hostname resolution (Localhost, 127.0.0.1, or Local Network IP for Phone testing)
  if (typeof window !== "undefined" && window.location) {
    const { hostname, protocol } = window.location;
    const isLocalOrLan =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local") ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if (isLocalOrLan) {
      return `${protocol}//${hostname}:3001`;
    }

    // Production Vercel or any HTTPS origin: Use deployed backend to prevent Safari mixed-content blocks
    if (protocol === "https:" || hostname.endsWith(".vercel.app")) {
      return "https://ai-interviewer-backend-6jio.onrender.com";
    }
  }

  return "https://ai-interviewer-backend-6jio.onrender.com";
}

export const BACKEND_URL: string = getBackendUrl();

export function getBackendWsUrl(path: string): string {
  const url = new URL(path, BACKEND_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}