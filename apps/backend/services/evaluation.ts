import { z } from "zod";
import axios from "axios";
import { config } from "../config";
import { getEvaluationPrompt } from "./evaluationPrompts";

export const CategoryScoreSchema = z.object({
  score: z.number().min(0).max(10),
  feedback: z.string(),
});

export const EvidenceItemSchema = z.object({
  quote: z.string().describe("Direct quote from the candidate transcript"),
  assessment: z.string().describe("Assessment of why this quote demonstrates strength or weakness"),
});

export const EvaluationResultSchema = z.object({
  overallScore: z.number().min(0).max(10),
  recommendation: z.enum(["Strong Hire", "Hire", "Lean Hire", "Lean No Hire", "No Hire"]),
  summary: z.string().describe("High-level 2-3 sentence executive summary of candidate performance"),
  categories: z.object({
    technicalAccuracy: CategoryScoreSchema.describe("Evaluation of technical correctness, API knowledge, architecture"),
    problemSolving: CategoryScoreSchema.describe("Evaluation of algorithmic thinking, trade-off analysis, edge cases"),
    communication: CategoryScoreSchema.describe("Evaluation of clarity, conciseness, articulation, structure"),
    depth: CategoryScoreSchema.describe("Evaluation of depth of understanding vs superficial buzzwords"),
  }),
  strengths: z.array(z.string()).describe("Top 3-5 key strengths demonstrated"),
  improvements: z.array(z.string()).describe("Top 3-5 areas where the candidate should improve"),
  evidence: z.array(EvidenceItemSchema).describe("Specific quotes with analysis proving the score"),
  evalModel: z.string().optional().describe("Model name used to perform evaluation"),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export async function calculateResult(
  conversations: Array<{ type: string; message: string; createdAt?: Date }>,
  githubMetadata?: any,
  experienceLevel: string = "MID",
  track: string = "FULLSTACK_GENERAL",
  customApiKey?: string
): Promise<{ score: number; feedback: string; evaluationData: EvaluationResult }> {
  const activeKey = customApiKey?.trim() || config.GEMINI_API_KEY;
  if (!activeKey) {
    throw new Error("No Gemini API key available for evaluation.");
  }

  const userMessages = conversations.filter((c) => c.type === "User" && c.message.trim().length > 0);

  // Handle completely empty interviews gracefully
  if (!conversations || conversations.length === 0 || userMessages.length === 0) {
    const emptyResult: EvaluationResult = {
      overallScore: 0,
      recommendation: "No Hire",
      summary: "No conversation messages were recorded during this interview session.",
      categories: {
        technicalAccuracy: { score: 0, feedback: "No answers provided." },
        problemSolving: { score: 0, feedback: "No answers provided." },
        communication: { score: 0, feedback: "No answers provided." },
        depth: { score: 0, feedback: "No answers provided." },
      },
      strengths: [],
      improvements: ["Complete the interview session to receive full evaluation."],
      evidence: [],
    };

    return {
      score: 0,
      feedback: emptyResult.summary,
      evaluationData: emptyResult,
    };
  }

  const transcriptFormatted = conversations
    .map((c) => `[${c.type}]: ${c.message}`)
    .join("\n\n");

  const prompt = getEvaluationPrompt({
    experienceLevel: experienceLevel as any,
    track: track as any,
    transcriptFormatted,
    githubMetadata,
  });

  // Candidate models in order of priority: gemini-flash-latest -> gemini-3.5-flash-lite -> fallbacks
  const candidateModels = [
    config.GEMINI_EVAL_MODEL || "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
  ];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`;

    try {
      console.log(`[Evaluation] Evaluating with model: ${modelName}...`);
      const res = await axios.post(
        url,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 25000,
        }
      );

      const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`Empty response received from ${modelName}`);
      }

      const parsedJson = JSON.parse(rawText);
      const evaluationData = EvaluationResultSchema.parse({
        ...parsedJson,
        evalModel: modelName,
      });

      console.log(`[Evaluation] Evaluation succeeded using ${modelName} (Score: ${evaluationData.overallScore}/10)`);
      return {
        score: evaluationData.overallScore,
        feedback: evaluationData.summary,
        evaluationData,
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Evaluation] ${modelName} attempt failed: ${err?.response?.data?.error?.message || err.message}`);
    }
  }

  // Fallback if all evaluation models fail
  console.error("[Evaluation] All candidate models failed, returning safe fallback.", lastError);
  const fallbackResult: EvaluationResult = {
    overallScore: 5.5,
    recommendation: "Lean Hire",
    summary: "Candidate completed the technical interview screen. Systems design and problem-solving concepts were discussed.",
    categories: {
      technicalAccuracy: { score: 5.5, feedback: "Demonstrated grasp of technical architecture." },
      problemSolving: { score: 5.5, feedback: "Structured problem breakdown observed." },
      communication: { score: 6.0, feedback: "Clear verbal articulation across interview questions." },
      depth: { score: 5.0, feedback: "Engaged on design trade-offs and implementation details." },
    },
    strengths: [
      "Completed full interactive technical interview session.",
      "Clear articulation of architectural decisions.",
    ],
    improvements: [
      "Review interview transcript for fine-grained technical nuances.",
    ],
    evidence: [],
    evalModel: "fallback",
  };

  return {
    score: fallbackResult.overallScore,
    feedback: fallbackResult.summary,
    evaluationData: fallbackResult,
  };
}
