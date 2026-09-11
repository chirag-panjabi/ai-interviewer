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

export const ResumeProjectSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  techStack: z.array(z.string()).default([]),
  metrics: z.string().optional(),
});
export type ResumeProject = z.infer<typeof ResumeProjectSchema>;

export const ResumeWorkItemSchema = z.object({
  company: z.string(),
  role: z.string(),
  duration: z.string().optional(),
  highlights: z.array(z.string()).default([]),
});
export type ResumeWorkItem = z.infer<typeof ResumeWorkItemSchema>;

export const ResumeLinksSchema = z.object({
  githubUsername: z.string().optional(),
  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
});
export type ResumeLinks = z.infer<typeof ResumeLinksSchema>;

export const ParsedResumeSchema = z.object({
  candidateName: z.string().default("Candidate"),
  targetRole: z.string().optional(),
  yearsOfExperience: z.number().nullable().optional(),
  skills: z.array(z.string()).default([]),
  projects: z.array(ResumeProjectSchema).default([]),
  workHistory: z.array(ResumeWorkItemSchema).default([]),
  links: ResumeLinksSchema.default({}),
});
export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

export const PreInterviewBody = z.object({
  github: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  experienceLevel: ExperienceLevelEnum.default("MID"),
  track: InterviewTrackEnum.default("FULL_MOCK_SCREEN"),
  selectedRepo: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  resumeMetadata: z.any().optional().nullable(),
  selectedResumeProject: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
});
export type PreInterviewBodyType = z.infer<typeof PreInterviewBody>;