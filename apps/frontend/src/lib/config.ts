const defaultBackendUrl = "http://localhost:3001";

export const BACKEND_URL =
  (typeof process !== "undefined" && process.env?.BUN_PUBLIC_BACKEND_URL) ||
  (typeof window !== "undefined" && (window as any).__ENV__?.BACKEND_URL) ||
  defaultBackendUrl;

export function getBackendWsUrl(path: string): string {
  const url = new URL(path, BACKEND_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}