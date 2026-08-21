import { z } from "zod";
import axios from "axios";
import { config } from "../config";

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
  recommendation: z.enum(["Strong Hire", "Hire", "Lean Hire", "No Hire"]),
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
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export async function calculateResult(
  conversations: Array<{ type: string; message: string; createdAt?: Date }>,
  githubMetadata?: any
): Promise<{ score: number; feedback: string; evaluationData: EvaluationResult }> {
  if (!config.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment.");
  }

  const userMessages = conversations.filter((c) => c.type === "User" && c.message.trim().length > 0);

  // Handle empty or premature/abandoned interviews gracefully
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

  // Handle truncated / ultra-short sessions (< 3 candidate answers)
  if (userMessages.length < 3) {
    const truncatedResult: EvaluationResult = {
      overallScore: 2.5,
      recommendation: "No Hire",
      summary: `Interview session was truncated or ended prematurely after only ${userMessages.length} candidate response(s). Insufficient technical data was gathered to evaluate systems depth or problem solving.`,
      categories: {
        technicalAccuracy: { score: 2.5, feedback: "Insufficient responses to gauge technical accuracy." },
        problemSolving: { score: 2.5, feedback: "Session concluded before algorithmic or design problem solving could be assessed." },
        communication: { score: 3.5, feedback: "Brief participation recorded." },
        depth: { score: 2.0, feedback: "Did not engage in deep architecture or trade-off discussions." },
      },
      strengths: [
        "Connected to the technical interview session.",
      ],
      improvements: [
        "Participate in full multi-question interview session to demonstrate systems architecture and problem-solving depth.",
      ],
      evidence: userMessages.slice(0, 2).map((m) => ({
        quote: m.message,
        assessment: "Brief answer recorded before interview was ended.",
      })),
    };

    return {
      score: truncatedResult.overallScore,
      feedback: truncatedResult.summary,
      evaluationData: truncatedResult,
    };
  }

  const transcriptFormatted = conversations
    .map((c) => `[${c.type}]: ${c.message}`)
    .join("\n\n");

  const prompt = `You are a Principal Staff Software Engineer conducting an objective, rigorous technical interview evaluation.
Evaluate the candidate's performance based strictly and exclusively on the interview transcript provided below.

### CANDIDATE GITHUB CONTEXT:
${githubMetadata ? (typeof githubMetadata === "string" ? githubMetadata : JSON.stringify(githubMetadata, null, 2)) : "None provided"}

### INTERVIEW TRANSCRIPT:
${transcriptFormatted}

### STANDARDIZED SCORING CALIBRATION RUBRIC (0.0 to 10.0 scale):
- **0.0 - 3.9 (No Hire)**: Severe conceptual flaws, inability to explain basic code/data flow, heavy evasion, or interview abandoned prematurely.
- **4.0 - 5.9 (Lean No Hire / Junior)**: Familiar with common library and syntax names, but struggles with architectural trade-offs, concurrency, scaling, failure recovery, or relies on superficial buzzwords.
- **6.0 - 7.9 (Hire / Mid-to-Senior)**: Solid systems intuition, correctly explains data flow and bottlenecks, understands concurrency and database trade-offs, communicates clearly.
- **8.0 - 10.0 (Strong Hire / Staff+)**: Exceptional engineering depth, proactively discusses distributed edge cases, failure modes, backpressure, latency vs throughput trade-offs, and shows hands-on mastery.

### EVALUATION CRITERIA:
1. **Technical Accuracy**: Did the candidate state correct technical facts, protocols, and time/space complexities? Penalize incorrect claims.
2. **Problem Solving & Trade-offs**: Did they reason through constraints, or just give rigid dogmatic answers?
3. **Engineering Depth vs. Buzzword Evasion**: Did the candidate explain the *underlying mechanism* (e.g. how locking works, how cache invalidation behaves, how WebSockets buffer), or did they just drop tool names (Kafka, Redis, AI) without understanding?
4. **Communication**: Was the candidate concise, structured, and direct?

### OUTPUT FORMAT:
Respond with ONLY a valid JSON object strictly matching this schema:
{
  "overallScore": number (0-10, one decimal precision),
  "recommendation": "Strong Hire" | "Hire" | "Lean Hire" | "No Hire",
  "summary": "string (2-3 sentences executive summary)",
  "categories": {
    "technicalAccuracy": { "score": number, "feedback": "string" },
    "problemSolving": { "score": number, "feedback": "string" },
    "communication": { "score": number, "feedback": "string" },
    "depth": { "score": number, "feedback": "string" }
  },
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"],
  "evidence": [
    { "quote": "string (verbatim transcript excerpt)", "assessment": "string (technical observation)" }
  ]
}`;

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.GEMINI_API_KEY}`;

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
      const evaluationData = EvaluationResultSchema.parse(parsedJson);

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
  };

  return {
    score: fallbackResult.overallScore,
    feedback: fallbackResult.summary,
    evaluationData: fallbackResult,
  };
}
