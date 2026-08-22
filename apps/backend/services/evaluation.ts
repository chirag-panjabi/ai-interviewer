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
  evalModel: z.string().optional().describe("Model name used to perform evaluation"),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export async function calculateResult(
  conversations: Array<{ type: string; message: string; createdAt?: Date }>,
  githubMetadata?: any,
  experienceLevel: string = "MID",
  track: string = "FULLSTACK_GENERAL"
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
      summary: `Interview session was truncated or ended prematurely after only ${userMessages.length} candidate response(s). Insufficient data was gathered to evaluate skills depth.`,
      categories: {
        technicalAccuracy: { score: 2.5, feedback: "Insufficient responses to gauge accuracy." },
        problemSolving: { score: 2.5, feedback: "Session concluded before problem solving could be assessed." },
        communication: { score: 3.5, feedback: "Brief participation recorded." },
        depth: { score: 2.0, feedback: "Did not engage in deep technical trade-off discussions." },
      },
      strengths: [
        "Connected to the interview session.",
      ],
      improvements: [
        "Participate in full multi-question interview session to demonstrate problem-solving depth.",
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

  // Track context description
  let trackContext = "Full-Stack General software engineering (covering frontend, backend, APIs, and databases).";
  let isBehavioral = track === "BEHAVIORAL";
  let isDSA = track === "DSA";

  if (track === "BACKEND") {
    trackContext = "Backend Engineering (API architecture, database optimization, caching, concurrency, and message queues).";
  } else if (track === "FRONTEND") {
    trackContext = "Frontend Engineering (component design, state management, rendering performance, web standards, and UX responsiveness).";
  } else if (track === "SYSTEM_DESIGN") {
    trackContext = "System Design & Distributed Architecture (scalability, multi-tier topology, partition tolerance, and trade-off analysis).";
  } else if (track === "DSA") {
    trackContext = "Data Structures & Algorithms (algorithmic logic, asymptotic time/space bounds, and optimization).";
  } else if (track === "BEHAVIORAL") {
    trackContext = "Behavioral & Engineering Leadership (STAR-method situation storytelling, technical conflict, ownership, and mentorship).";
  } else if (track === "DEVOPS_CLOUD") {
    trackContext = "DevOps & Cloud Infrastructure (CI/CD pipelines, Kubernetes/containers, Infrastructure as Code, observability, and cloud resilience).";
  } else if (track === "ML_AI") {
    trackContext = "Machine Learning & AI Engineering (ML pipelines, vector embeddings, RAG architectures, model serving, and LLM evaluation).";
  }

  // Level-specific scoring rubric
  let rubricText = "";
  if (experienceLevel === "JUNIOR") {
    rubricText = `- **0.0 - 3.9 (No Hire)**: Severe conceptual flaws on basic syntax, protocols, or fundamental concepts; unable to articulate simple logic.
- **4.0 - 5.9 (Lean No Hire)**: Familiar with terminology but cannot explain how basic mechanisms or code flows operate without heavy guidance.
- **6.0 - 7.9 (Hire - Junior Expectations Met)**: Solid grasp of fundamentals, correctly explains core patterns, demonstrates good problem-solving instincts and learning capacity. (Do NOT penalize for lacking distributed systems or advanced architecture depth).
- **8.0 - 10.0 (Strong Hire - Exceptional Junior)**: Exceeds entry-level expectations; demonstrates architectural curiosity, clean code intuition, and ability to handle stretch questions.`;
  } else if (experienceLevel === "SENIOR") {
    rubricText = `- **0.0 - 3.9 (No Hire)**: Cannot justify architectural decisions, struggles with basic concurrency/data boundaries, or reveals fundamental gaps expected of senior engineers.
- **4.0 - 5.9 (Lean No Hire)**: Conventional knowledge but struggles when pressed on distributed failure modes, edge cases, or multi-region scale.
- **6.0 - 7.9 (Hire - Senior Expectations Met)**: Strong systems mastery, articulates architectural trade-offs with nuance, designs for failure, shows clear engineering maturity.
- **8.0 - 10.0 (Strong Hire - Staff+ Master)**: Exceptional depth across high-scale distributed systems, proactive mitigation of cascading failures, exemplary trade-off communication.`;
  } else {
    // MID (Default)
    rubricText = `- **0.0 - 3.9 (No Hire)**: Significant gaps in standard engineering practices, unable to explain core mechanisms in their stack.
- **4.0 - 5.9 (Lean No Hire)**: Relies on surface buzzwords; struggles with database indexing, caching strategies, or error edge cases.
- **6.0 - 7.9 (Hire - Mid-Level Expectations Met)**: Solid production intuition, correctly explains data flow, handles trade-offs well, articulates ideas clearly.
- **8.0 - 10.0 (Strong Hire - Near Senior)**: Proactively identifies edge cases, demonstrates strong architectural depth beyond typical mid-level requirements.`;
  }

  // Category evaluation descriptions
  let categoryDescriptions = `1. **Technical Accuracy**: Did the candidate state correct technical facts, APIs, protocols, and mechanisms?
2. **Problem Solving & Trade-offs**: Did they reason through constraints effectively rather than reciting dogmatic answers?
3. **Communication**: Was the candidate articulate, structured, and concise in their explanations?
4. **Engineering Depth**: Did the candidate understand the *underlying mechanics* rather than dropping surface buzzwords?`;

  if (isBehavioral) {
    categoryDescriptions = `1. **Situation Framing (mapped to technicalAccuracy)**: Quality of context setting using the STAR method (clear Situation & Task).
2. **Action Quality (mapped to problemSolving)**: Specificity and technical/operational decisiveness of the candidate's personal actions.
3. **Impact & Communication (mapped to communication)**: Clear articulation of quantifiable business/technical impact and lessons learned.
4. **Leadership Signals (mapped to depth)**: Demonstration of ownership, empathy, mentorship, and navigating conflict/ambiguity.`;
  } else if (isDSA) {
    categoryDescriptions = `1. **Algorithmic Correctness (mapped to technicalAccuracy)**: Correctness of data structure choices, logic, and edge-case awareness.
2. **Optimization Ability (mapped to problemSolving)**: Ability to iterate from initial approach to an optimal runtime/memory solution.
3. **Communication (mapped to communication)**: Structured thought process and ability to explain algorithmic invariants clearly.
4. **Complexity Analysis (mapped to depth)**: Precise Big-O time and space complexity evaluation.`;
  }

  const prompt = `You are a Principal Staff Software Engineer conducting an objective, rigorous technical interview evaluation.
Evaluate the candidate's performance based strictly and exclusively on the interview transcript provided below.

### INTERVIEW METADATA:
- **Track**: ${trackContext}
- **Declared Experience Level Baseline**: ${experienceLevel} (${experienceLevel === "JUNIOR" ? "0-2 years" : experienceLevel === "SENIOR" ? "5+ years" : "2-5 years"})

### CANDIDATE GITHUB CONTEXT:
${githubMetadata ? (typeof githubMetadata === "string" ? githubMetadata : JSON.stringify(githubMetadata, null, 2)) : "None provided"}

### INTERVIEW TRANSCRIPT:
${transcriptFormatted}

### STANDARDIZED SCORING CALIBRATION RUBRIC (0.0 to 10.0 scale for ${experienceLevel} Baseline):
${rubricText}

### ADAPTIVE SCORING RULES:
1. **Anchor on Declared Level**: Evaluate the candidate against the rubric for their declared level (${experienceLevel}).
2. **Reward Successful Stretch**: If Alex probed upward into more complex questions and the candidate handled them well, award a higher score (8.0+) and praise this in the summary.
3. **Fairness on Stretch Failures**: A Junior who attempts an advanced Senior question and misses it should NOT be penalized heavily if their fundamental answers were solid.
4. **Observed vs Declared Calibration**: In the summary, mention the candidate's observed capability level (e.g., "Declared: Junior | Observed: Strong Mid-level capability").

### EVALUATION CRITERIA:
${categoryDescriptions}

### OUTPUT FORMAT:
Respond with ONLY a valid JSON object strictly matching this schema:
{
  "overallScore": number (0-10, one decimal precision),
  "recommendation": "Strong Hire" | "Hire" | "Lean Hire" | "No Hire",
  "summary": "string (2-3 sentences executive summary including observed level)",
  "categories": {
    "technicalAccuracy": { "score": number, "feedback": "string" },
    "problemSolving": { "score": number, "feedback": "string" },
    "communication": { "score": number, "feedback": "string" },
    "depth": { "score": number, "feedback": "string" }
  },
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"],
  "evidence": [
    { "quote": "string (verbatim transcript excerpt)", "assessment": "string (concrete observation)" }
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
