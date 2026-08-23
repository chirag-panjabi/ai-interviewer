import { calculateResult } from "../services/evaluation";

interface TestCase {
  name: string;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR";
  track: string;
  githubMetadata: any;
  conversations: Array<{ type: string; message: string }>;
  expectedRecommendation: string[];
  minScore: number;
  maxScore: number;
}

const testCases: TestCase[] = [
  // Archetype 1: Senior Staff Engineer - Full Mock Screen (5 Phases)
  {
    name: "Archetype 1: Senior Staff Engineer (Tier-1 Systems Mastery)",
    experienceLevel: "SENIOR",
    track: "FULL_MOCK_SCREEN",
    githubMetadata: { repo: "distributed-event-stream", language: "Go / Rust", stars: 450 },
    expectedRecommendation: ["Strong Hire", "Hire"],
    minScore: 7.5,
    maxScore: 10.0,
    conversations: [
      {
        type: "Assistant",
        message: "Hey Chirag, great to meet you! I'm Alex. To kick things off, give me a crisp 60-second walkthrough of your engineering background.",
      },
      {
        type: "User",
        message: "I've spent the last 6 years as a Senior Backend Engineer building high-throughput distributed systems in Go and Rust. Most recently at ScaleTech, I led the re-architecture of our event ingestion engine, reducing P99 latency from 450ms to 45ms while handling 120,000 events/sec.",
      },
      {
        type: "Assistant",
        message: "Impressive latency reduction on that stream. What specific bottleneck in the original ingestion path caused the 450ms P99 spike?",
      },
      {
        type: "User",
        message: "The legacy service executed synchronous row-by-row Postgres inserts behind an HTTP gateway, causing massive connection exhaustion and WAL write amplification. I decoupled ingress by buffering events in memory with ring buffers and flushing in batched micro-transactions using Kafka and ClickHouse with zstd compression.",
      },
      {
        type: "Assistant",
        message: "Solid mechanical insight on the WAL contention. If a network partition isolates three Kafka broker nodes, how does your consumer group recover without dropping messages or duplicate processing?",
      },
      {
        type: "User",
        message: "We configure idempotent producers with a transactional replication factor of 3 and min.insync.replicas=2 so writes fail rather than dropping silently. On the consumer side, we track offsets via Redis leases and apply unique idempotency keys on database upserts to guarantee exactly-once processing semantics.",
      },
      {
        type: "Assistant",
        message: "Clean distributed guarantee. Tell me about a time when a critical schema migration failed in production and how you led team communication.",
      },
      {
        type: "User",
        message: "During a major user table migration, an unindexed foreign key lock cascaded into connection exhaustion, taking down our checkout API for 8 minutes. I declared an SEV-1, took incident command, rolled back via our blue-green switch, and posted status updates every 15 minutes. In the post-mortem, I owned the missing checklist review and built automated query lock detection into our CI pipeline.",
      },
      {
        type: "Assistant",
        message: "Great accountability and actionable post-mortem rigor. What questions do you have for me about our engineering team?",
      },
      {
        type: "User",
        message: "How does your engineering organization manage cross-team RFCs and balance technical debt repayment against quarterly product roadmaps?",
      },
      {
        type: "Assistant",
        message: "We operate on an RFC process where Staff+ engineers review architecture across domains, and every squad reserves 20% of every sprint for tech debt.",
      },
    ],
  },

  // Archetype 2: Charismatic Buzzwords / Fluff (Technical Gating Check)
  {
    name: "Archetype 2: Charismatic Candidate with Zero Technical Depth (Technical Competency Gate)",
    experienceLevel: "SENIOR",
    track: "FULL_MOCK_SCREEN",
    githubMetadata: { repo: "enterprise-cloud-suite", language: "JavaScript", stars: 4 },
    expectedRecommendation: ["No Hire", "Lean No Hire"],
    minScore: 0.0,
    maxScore: 4.0,
    conversations: [
      {
        type: "Assistant",
        message: "Hey there! Give me a quick 60-second summary of your experience and current tech stack.",
      },
      {
        type: "User",
        message: "I am a visionary lead developer with 7 years of passion building enterprise synergy across clouds! I leverage agile paradigms, cutting-edge microservices, AI enablement, and modern paradigms to deliver maximum business ROI and customer delight!",
      },
      {
        type: "Assistant",
        message: "Let's dive into the architecture. In that cloud suite, how did you handle data consistency and locking across your microservices?",
      },
      {
        type: "User",
        message: "We used modern cloud-native best practices with Redis and Kafka. Everything was completely asynchronous and auto-scaled in the cloud so we never had any consistency issues.",
      },
      {
        type: "Assistant",
        message: "What specific locking strategy or isolation level did you use in Redis or your database when concurrent writes occurred?",
      },
      {
        type: "User",
        message: "We just followed standard software engineering principles and let the framework handle all the concurrency automatically.",
      },
    ],
  },

  // Archetype 3: Junior Candidate with High Coachability
  {
    name: "Archetype 3: Junior Frontend Developer (Passing Junior Bar with Coachability)",
    experienceLevel: "JUNIOR",
    track: "FRONTEND",
    githubMetadata: { repo: "react-task-board", language: "TypeScript", stars: 8 },
    expectedRecommendation: ["Lean Hire", "Hire"],
    minScore: 4.5,
    maxScore: 7.5,
    conversations: [
      {
        type: "Assistant",
        message: "Hi! Tell me about your background and what you've built recently.",
      },
      {
        type: "User",
        message: "I am a junior engineer with 1 year of experience building React and TypeScript web apps. I built a task board with optimistic UI updates.",
      },
      {
        type: "Assistant",
        message: "How did you handle rollback if the server rejected an optimistic task deletion?",
      },
      {
        type: "User",
        message: "At first I didn't save the old state, so when the server errored the task was gone from the screen. But then I changed it to store a snapshot of the tasks array before updating state, and in the catch block I restore the previous snapshot.",
      },
    ],
  },
];

export async function runEvaluationRegressionTests() {
  console.log("===============================================================");
  console.log("🚀 STARTING EVALUATION ENGINE REGRESSION DOSSIER TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  for (const tc of testCases) {
    console.log(`🧪 Running: ${tc.name}`);
    try {
      const result = await calculateResult(
        tc.conversations as any,
        tc.githubMetadata,
        tc.experienceLevel,
        tc.track
      );

      const evalData = result.evaluationData;
      console.log(`   Overall Score: ${evalData.overallScore} / 10.0`);
      console.log(`   Recommendation: ${evalData.recommendation}`);
      console.log(`   Technical Accuracy: ${evalData.categories.technicalAccuracy.score} / 10.0`);
      console.log(`   Executive Summary: ${evalData.summary}`);
      console.log(`   Evidence Quotes Captured: ${evalData.evidence.length}`);

      const scoreOk = evalData.overallScore >= tc.minScore && evalData.overallScore <= tc.maxScore;
      const recOk = tc.expectedRecommendation.includes(evalData.recommendation);

      if (scoreOk && recOk) {
        console.log(`   ✅ PASSED calibration benchmark\n`);
        passed++;
      } else {
        console.error(`   ❌ FAILED calibration: expected score [${tc.minScore}-${tc.maxScore}] & rec [${tc.expectedRecommendation}], got ${evalData.overallScore} & ${evalData.recommendation}\n`);
      }
    } catch (e: any) {
      console.error(`   ❌ ERROR evaluating test case: ${e.message}\n`);
    }
  }

  console.log("===============================================================");
  console.log(`🎉 EVALUATION REGRESSION SUITE COMPLETE: ${passed} / ${testCases.length} PASSED`);
  console.log("===============================================================\n");

  if (passed !== testCases.length) {
    throw new Error(`Evaluation calibration failed: only ${passed}/${testCases.length} passed.`);
  }
}

if (import.meta.main) {
  runEvaluationRegressionTests().catch((e) => {
    console.error("Test suite failed:", e);
    process.exit(1);
  });
}
