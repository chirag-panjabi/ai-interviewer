import z from "zod";

export const ExperienceLevelEnum = z.enum(["JUNIOR", "MID", "SENIOR"]);
export type ExperienceLevel = z.infer<typeof ExperienceLevelEnum>;

export const InterviewTrackEnum = z.enum([
  "FULL_MOCK_SCREEN",
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
  github: z.string().default("candidate"),
  experienceLevel: ExperienceLevelEnum.default("MID"),
  track: z.string().default("FULLSTACK_GENERAL"),
  selectedRepo: z.string().nullable().optional(),
});