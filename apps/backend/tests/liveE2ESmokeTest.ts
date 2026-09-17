import axios from "axios";
import { config } from "../config";
import { buildSystemPrompt } from "../services/promptBuilder";
import { calculateResult } from "../services/evaluation";
import { ParsedResume } from "../types";

async function callGemini(
  systemPrompt: string,
  history: Array<{ role: "user" | "model"; content: string }>
): Promise<string> {
  const candidateModels = [
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
  ];

  const contents = history.map((h) => ({
    role: h.role,
    parts: [{ text: h.content }],
  }));

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`;
      const response = await axios.post(
        url,
        {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        },
        { headers: { "Content-Type": "application/json" }, timeout: 20000 }
      );

      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      if (text) {
        return text.trim();
      }
    } catch (e: any) {
      console.warn(`[LiveTestWarning] Model ${model} failed (${e.message}), trying next model...`);
    }
  }
  throw new Error("All Gemini test candidate models failed");
}

export async function runLiveE2ESmokeTest() {
  console.log("===============================================================");
  console.log("🚀 STARTING LIVE E2E SMOKE TEST: ALEX PROBING & CLAIM AUDIT MATRIX");
  console.log("===============================================================\n");

  const sampleResume: ParsedResume = {
    candidateName: "Chirag Panjabi",
    githubUsername: "chirag-panjabi",
    skills: ["Go", "Kafka", "ClickHouse", "Distributed Systems", "Kubernetes"],
    projects: [
      {
        name: "StreamPulse",
        description: "Real-time distributed telemetry ingestion and analytics pipeline",
        techStack: ["Go", "Kafka", "ClickHouse", "Docker"],
        metrics: "85,000 QPS with p99 latency < 25ms, reduced memory footprint by 40% with zero-copy ring buffers",
        repoUrl: "https://github.com/chirag-panjabi/stream-pulse",
      },
      {
        name: "Pragna",
        description: "Adaptive developer cockpit and live metrics visualizer",
        techStack: ["React", "TypeScript", "Tailwind CSS"],
        metrics: "Sub-16ms render times on 10,000 data points",
      },
    ],
    workExperience: [
      {
        company: "Apex Distributed Labs",
        role: "Senior Systems Engineer",
        duration: "2022 - Present",
        highlights: [
          "Architected telemetry ingestion tier handling millions of daily events",
          "Engineered zero-copy memory buffers reducing GC overhead by 40%",
        ],
      },
    ],
  };

  const experienceLevel = "SENIOR";
  const track = "SYSTEM_DESIGN";

  console.log("📋 1. Generating Level-Calibrated System Prompt with Resume Grounding...");
  const systemPrompt = buildSystemPrompt({
    experienceLevel,
    track,
    candidateDisplayName: "Chirag",
    candidateProfileSummary: "Candidate: Chirag (SENIOR). Projects: StreamPulse (Go / Kafka / 85,000 QPS), Pragna (React UI).",
    hasValidRepos: true,
    resumeMetadata: sampleResume,
    focusProject: "StreamPulse",
  });

  console.log(`   System Prompt Length: ${systemPrompt.length} chars`);
  console.log(`   Includes Rule 15 Metric Pressure: ${systemPrompt.includes("METRIC-PRESSURE")}`);
  console.log(`   Includes 85,000 QPS claim: ${systemPrompt.includes("85,000 QPS")}\n`);

  const candidatePrompt = `You are Chirag, a Senior Systems Engineer interviewing with Alex.
Your resume project is StreamPulse (Go / Kafka / ClickHouse).
You claimed: 85,000 QPS with p99 < 25ms, zero-copy ring buffers.
Instructions for your answers:
1. Always directly answer the specific question Alex asked.
2. If asked how the metric was measured, be transparent that 85k QPS was achieved during distributed synthetic load testing with Locust on 8 staging nodes, not everyday sustained baseline traffic in production.
3. If asked about bottlenecks, explain Go GC pause spikes from small byte allocations and TCP socket buffers, resolved using sync.Pool.
4. If asked what parts you personally built vs boilerplate, explain you wrote the ring buffer and zero-copy byte serializer from scratch, while using Shopify Sarama for Kafka publishing.
5. If asked about distributed systems scenarios (e.g. global tracking, geo-partitioning, consistency, replication, or consensus), provide senior-level architectural mechanics (e.g. Raft, CRDTs, geohashing, Uber H3 spatial indexing, partitioned queues).
6. If Alex invites you to ask questions about the team or company, ask a crisp architectural question about their infrastructure or tech debt.
7. Keep responses strictly under 3 concise sentences. Speak in natural conversational English.`;

  console.log("🗣️ 2. Running Live 5-Turn Dual-Agent Dialogue Simulation with Gemini...");

  const alexHistory: Array<{ role: "user" | "model"; content: string }> = [];
  const candidateHistory: Array<{ role: "user" | "model"; content: string }> = [];
  const conversationsForEval: Array<{ type: "User" | "Assistant"; message: string }> = [];

  // Turn 1: Alex greets candidate
  console.log("\n---------------------------------------------------------------");
  console.log("TURN 1: Initial Greeting & Project Grounding");
  console.log("---------------------------------------------------------------");
  const alexTurn1 = await callGemini(systemPrompt, [
    { role: "user", content: "Hello Alex, I am ready to start the interview." },
  ]);
  console.log(`🤖 Alex:\n"${alexTurn1}"`);
  alexHistory.push({ role: "model", content: alexTurn1 });
  candidateHistory.push({ role: "user", content: alexTurn1 });
  conversationsForEval.push({ type: "Assistant", message: alexTurn1 });

  for (let turn = 2; turn <= 5; turn++) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`TURN ${turn}: Live Dynamic Turn`);
    console.log(`---------------------------------------------------------------`);

    // Candidate speaks
    const candidateMsg = await callGemini(candidatePrompt, candidateHistory);
    console.log(`👤 Candidate:\n"${candidateMsg}"`);
    candidateHistory.push({ role: "model", content: candidateMsg });
    alexHistory.push({ role: "user", content: candidateMsg });
    conversationsForEval.push({ type: "User", message: candidateMsg });

    // Alex speaks
    const alexMsg = await callGemini(systemPrompt, alexHistory);
    console.log(`🤖 Alex:\n"${alexMsg}"`);
    alexHistory.push({ role: "model", content: alexMsg });
    candidateHistory.push({ role: "user", content: alexMsg });
    conversationsForEval.push({ type: "Assistant", message: alexMsg });
  }

  console.log("\n---------------------------------------------------------------");
  console.log("📊 3. Running Post-Interview Evaluation & Resume Claim Audit Matrix...");
  console.log("---------------------------------------------------------------");

  const evalStartTime = Date.now();
  const result = await calculateResult(
    conversationsForEval,
    { repo: "stream-pulse", language: "Go", stars: 120 },
    experienceLevel,
    track,
    undefined,
    sampleResume
  );
  const evalDurationMs = Date.now() - evalStartTime;

  console.log(`\n✅ Evaluation Generated in ${evalDurationMs}ms!`);
  console.log("===============================================================");
  console.log("📈 EVALUATION DOSSIER OUTPUT");
  console.log("===============================================================");
  console.log(`Overall Score:     ${result.evaluationData.overallScore} / 10.0`);
  console.log(`Recommendation:    ${result.evaluationData.recommendation}`);
  console.log(`Executive Summary: ${result.evaluationData.summary}`);
  console.log(`Technical Accuracy:${result.evaluationData.categories.technicalAccuracy.score} / 10.0`);
  console.log(`Problem Solving:   ${result.evaluationData.categories.problemSolving.score} / 10.0`);
  console.log(`Communication:     ${result.evaluationData.categories.communication.score} / 10.0`);
  console.log(`Depth:             ${result.evaluationData.categories.depth.score} / 10.0`);

  console.log("\n🔍 RESUME CLAIM AUDIT MATRIX RESULTS:");
  const claimAudits = result.evaluationData.claimAudits || [];
  if (claimAudits.length === 0) {
    console.warn("⚠️ Warning: No claim audits were returned by Gemini.");
  } else {
    claimAudits.forEach((audit, idx) => {
      console.log(`\n[Claim Audit #${idx + 1}]`);
      console.log(`  Claim:     "${audit.claim}"`);
      console.log(`  Verdict:   ${audit.verdict}`);
      console.log(`  Reasoning: ${audit.reasoning}`);
      console.log(`  Quote:     ${audit.quote ? `"${audit.quote}"` : "None"}`);
    });
  }

  console.log("\n💡 STRENGTHS:");
  result.evaluationData.strengths.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  console.log("\n🎯 AREAS FOR IMPROVEMENT:");
  result.evaluationData.improvements.forEach((imp, i) => console.log(`  ${i + 1}. ${imp}`));

  console.log("\n===============================================================");
  console.log("🏁 E2E VERIFICATION INVARIANTS CHECK");
  console.log("===============================================================");

  const scoreValid = result.evaluationData.overallScore >= 7.0 && result.evaluationData.overallScore <= 10.0;
  console.log(`✓ Score within Senior Staff range [7.0-10.0]: ${scoreValid} (${result.evaluationData.overallScore})`);

  const recValid = ["Strong Hire", "Hire"].includes(result.evaluationData.recommendation);
  console.log(`✓ Recommendation is Hire / Strong Hire: ${recValid} (${result.evaluationData.recommendation})`);

  const auditsPopulated = claimAudits.length > 0;
  console.log(`✓ Claim audits populated: ${auditsPopulated} (${claimAudits.length} claims audited)`);

  const verifiedOrPlausible = claimAudits.some((a) => a.verdict === "VERIFIED" || a.verdict === "PLAUSIBLE");
  console.log(`✓ At least one claim verified/plausible: ${verifiedOrPlausible}`);

  if (!scoreValid || !recValid || !auditsPopulated) {
    throw new Error("E2E Smoke test assertions failed.");
  }

  console.log("\n🎉 LIVE E2E SMOKE TEST PASSED WITH COMPLETE GROUNDING!");
}

if (import.meta.main) {
  runLiveE2ESmokeTest().catch((e) => {
    console.error("Live E2E Smoke Test Failed:", e);
    process.exit(1);
  });
}
