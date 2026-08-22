import { rateLimit } from "express-rate-limit";

// General API Rate Limiting (100 req/min per IP)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests from this IP, please try again shortly." },
});

// Strict Rate Limiting on Interview Creation (15 interviews per IP per 24 hours)
export const interviewCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 15, // max 15 per day
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "You have reached the daily screening limit (15 interviews per day). Please try again tomorrow.",
  },
});
