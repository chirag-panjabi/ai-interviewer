import z from "zod";

export const ExperienceLevelEnum = z.enum(["JUNIOR", "MID", "SENIOR"]);
export type ExperienceLevel = z.infer<typeof ExperienceLevelEnum>;

export const InterviewTrackEnum = z.enum([
  "FULLSTACK_GENERAL",
  "BACKEND",
  "FRONTEND",
  "SYSTEM_DESIGN",
  "DSA",
  "BEHAVIORAL",
  "DEVOPS_CLOUD",
  "ML_AI",
]);
export type InterviewTrack = z.infer<typeof InterviewTrackEnum>;

export const PreInterviewBody = z.object({
  github: z.string(),
  experienceLevel: ExperienceLevelEnum.default("MID"),
  track: InterviewTrackEnum.default("FULLSTACK_GENERAL"),
});