import dotenv from "dotenv";
import path from "node:path";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    console.warn(`[Config Warning] Missing environment variable: ${key}`);
    return "";
  }
  return value;
}

export const config = {
  DATABASE_URL: getEnv("DATABASE_URL"),
  GEMINI_API_KEY: getEnv("GEMINI_API_KEY"),
  GEMINI_LIVE_MODEL: getEnv("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview"),
  GEMINI_EVAL_MODEL: getEnv("GEMINI_EVAL_MODEL", "gemini-flash-latest"),
  GITHUB_TOKEN: process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.trim().replace(/^["']|["']$/g, "") : undefined,
  PORT: parseInt(getEnv("PORT", "3001"), 10),
  CORS_ORIGIN: getEnv("CORS_ORIGIN", "http://localhost:3000"),
};

export function validateConfig() {
  const missing: string[] = [];
  if (!config.DATABASE_URL) missing.push("DATABASE_URL");
  if (!config.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");

  if (missing.length > 0) {
    console.warn(`\n⚠️  [AI Interviewer Config] Warning: The following environment variables are missing:\n  - ${missing.join("\n  - ")}\nMake sure to set them in your .env file.\n`);
  }

  if (config.GITHUB_TOKEN) {
    const masked = config.GITHUB_TOKEN.slice(0, 4) + "..." + config.GITHUB_TOKEN.slice(-4);
    console.log(`🔑 [GitHub Auth] GITHUB_TOKEN detected: ${masked} (5,000 req/hr rate limit enabled)`);
  } else {
    console.warn(`⚠️  [GitHub Auth] GITHUB_TOKEN is not set. Requests will use the unauthenticated 60 req/hr IP rate limit.`);
  }
}
