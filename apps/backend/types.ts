import z from "zod";

export const PreInterviewBody = z.object({
  github: z.string(),
  selectedRepo: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
});

export type PreInterviewBodyType = z.infer<typeof PreInterviewBody>;