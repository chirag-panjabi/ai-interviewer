import { describe, expect, it } from "bun:test";
import { EvaluationResultSchema, ResumeClaimAuditSchema } from "../services/evaluation";

describe("Resume Claim Audit Schema & Evaluation Resiliency", () => {
  it("should parse standard uppercase verdicts cleanly", () => {
    const item = {
      claim: "Built Go distributed event pipeline handling 120k events/sec",
      verdict: "VERIFIED",
      reasoning: "Candidate explained ring buffer allocation and zero-copy deserialization accurately.",
      quote: "We partitioned the stream by user ID and tuned batch flush to 10ms.",
    };

    const parsed = ResumeClaimAuditSchema.parse(item);
    expect(parsed.verdict).toBe("VERIFIED");
    expect(parsed.claim).toBe(item.claim);
    expect(parsed.quote).toBe(item.quote);
  });

  it("should apply fuzzy normalization to lowercase, titlecase, and conversational verdicts", () => {
    const testCases = [
      { raw: "Verified", expected: "VERIFIED" },
      { raw: "partially verified", expected: "VERIFIED" },
      { raw: "unsubstantiated", expected: "UNSUBSTANTIATED" },
      { raw: "exaggerated claims", expected: "UNSUBSTANTIATED" },
      { raw: "failed core questions", expected: "UNSUBSTANTIATED" },
      { raw: "plausible", expected: "PLAUSIBLE" },
      { raw: "Likely true", expected: "PLAUSIBLE" },
    ];

    for (const { raw, expected } of testCases) {
      const parsed = ResumeClaimAuditSchema.parse({
        claim: "Test Claim",
        verdict: raw,
        reasoning: "Reasoning statement.",
      });
      expect(parsed.verdict).toBe(expected as any);
    }
  });

  it("should handle null or omitted quotes gracefully", () => {
    const parsedWithoutQuote = ResumeClaimAuditSchema.parse({
      claim: "Redis cache stampede mitigation",
      verdict: "PLAUSIBLE",
      reasoning: "Discussed TTL jitter at a high level.",
    });
    expect(parsedWithoutQuote.quote).toBeNull();

    const parsedWithNullQuote = ResumeClaimAuditSchema.parse({
      claim: "PostgreSQL partitioning",
      verdict: "UNSUBSTANTIATED",
      reasoning: "Candidate confused range partitioning with sharding.",
      quote: null,
    });
    expect(parsedWithNullQuote.quote).toBeNull();
  });

  it("should validate full EvaluationResultSchema with claimAudits", () => {
    const fullEvaluation = {
      overallScore: 8.5,
      recommendation: "Hire",
      summary: "Candidate demonstrated strong backend fundamentals and deep systems knowledge.",
      categories: {
        technicalAccuracy: { score: 8.5, feedback: "Solid accuracy." },
        problemSolving: { score: 8.0, feedback: "Great trade-offs." },
        communication: { score: 9.0, feedback: "Very clear." },
        depth: { score: 8.5, feedback: "Strong systems depth." },
      },
      strengths: ["Clean concurrency control", "Detailed database indexing"],
      improvements: ["Study multi-region consensus subtleties"],
      evidence: [
        {
          quote: "We utilized Raft consensus for state replication.",
          assessment: "Proves hands-on distributed protocol familiarity.",
        },
      ],
      claimAudits: [
        {
          claim: "Go event streaming at 120k QPS",
          verdict: "VERIFIED",
          reasoning: "Deep knowledge of batch flushes and socket memory buffers.",
          quote: "We sized the TCP socket buffers to 16MB.",
        },
        {
          claim: "Sub-50ms P99 latency",
          verdict: "PLAUSIBLE",
          reasoning: "High-level understanding of histogram measurement, but didn't detail GC pause tuning.",
          quote: null,
        },
      ],
      evalModel: "gemini-3.6-flash",
    };

    const validated = EvaluationResultSchema.parse(fullEvaluation);
    expect(validated.claimAudits).toHaveLength(2);
    expect(validated.claimAudits![0]!.verdict).toBe("VERIFIED");
    expect(validated.claimAudits![1]!.verdict).toBe("PLAUSIBLE");
  });

  it("should default claimAudits to empty array when omitted (backwards compatibility)", () => {
    const legacyEvaluation = {
      overallScore: 7.0,
      recommendation: "Hire",
      summary: "Legacy evaluation record.",
      categories: {
        technicalAccuracy: { score: 7.0, feedback: "Good." },
        problemSolving: { score: 7.0, feedback: "Good." },
        communication: { score: 7.0, feedback: "Good." },
        depth: { score: 7.0, feedback: "Good." },
      },
      strengths: ["Strong problem solving"],
      improvements: ["Improve edge case speed"],
      evidence: [],
    };

    const validated = EvaluationResultSchema.parse(legacyEvaluation);
    expect(validated.claimAudits).toBeDefined();
    expect(Array.isArray(validated.claimAudits)).toBe(true);
    expect(validated.claimAudits).toHaveLength(0);
  });
});
