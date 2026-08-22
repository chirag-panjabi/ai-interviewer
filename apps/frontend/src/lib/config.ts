declare const process: any;

const envBackendUrl =
  (typeof process !== "undefined" && process.env && (
    process.env.BUN_PUBLIC_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.BACKEND_URL
  )) ||
  (typeof window !== "undefined" && (window as any).__ENV__?.BACKEND_URL) ||
  "http://localhost:3001";

export const BACKEND_URL = envBackendUrl;

export function getBackendWsUrl(path: string): string {
  const url = new URL(path, BACKEND_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}