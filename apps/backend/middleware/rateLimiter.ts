import { rateLimit } from "express-rate-limit";
import { config } from "../config";

// General API Rate Limiting (Configurable per IP)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.GENERAL_API_RATE_LIMIT_PER_MIN,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests from this IP, please try again shortly." },
});

// Configurable Rate Limiting on Interview Creation for Hosted Demo Tier
export const interviewCreationLimiter = rateLimit({
  windowMs: config.DEMO_RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  limit: config.DEMO_DAILY_INTERVIEW_LIMIT,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => {
    // If candidate or power user supplies their own Gemini API key, bypass rate limit
    const customKey = (req.headers["x-gemini-api-key"] || req.headers["x-api-key"]) as string | undefined;
    return Boolean(customKey && typeof customKey === "string" && customKey.trim().length >= 15);
  },
  message: {
    message: `You have reached the hosted demo limit (${config.DEMO_DAILY_INTERVIEW_LIMIT} interviews per ${config.DEMO_RATE_LIMIT_WINDOW_HOURS}h). Please provide your own free Gemini API key to continue practicing.`,
  },
});
