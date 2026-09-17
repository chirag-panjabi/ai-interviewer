import { describe, expect, it } from "bun:test";
import { buildSystemPrompt } from "../services/promptBuilder";

describe("PromptBuilder Resume Metric & Protocol Invariants", () => {
  it("should extract and highlight quantifiable resume metrics in high-priority audit block", () => {
    const resumeMetadata = {
      candidateName: "Alice Chen",
      targetRole: "Senior Backend Engineer",
      yearsOfExperience: 6,
      skills: ["Go", "Kafka", "PostgreSQL"],
      projects: [
        {
          name: "FastPipeline",
          description: "High-throughput stream processing",
          techStack: ["Go", "Kafka"],
          metrics: "120,000 events/sec with sub-50ms p99 latency",
        },
        {
          name: "CacheKV",
          description: "Distributed cache",
          techStack: ["Go", "Raft"],
          metrics: "85k ops/sec",
        },
      ],
      workHistory: [],
    };

    const prompt = buildSystemPrompt({
      experienceLevel: "SENIOR",
      track: "BACKEND",
      candidateDisplayName: "Alice",
      candidateProfileSummary: "Candidate: Alice Chen",
      hasValidRepos: false,
      selectedResumeProject: "FastPipeline",
      resumeMetadata,
    });

    expect(prompt).toContain("High-Priority Quantifiable Claims to Audit");
    expect(prompt).toContain("120,000 events/sec with sub-50ms p99 latency");
    expect(prompt).toContain("85k ops/sec");
    expect(prompt).toContain("METRIC-PRESSURE & AUTHORSHIP VALIDATION PROTOCOL");
  });

  it("should enforce strict 1-turn time guard on DSA track to preserve coding time", () => {
    const prompt = buildSystemPrompt({
      experienceLevel: "MID",
      track: "DSA",
      candidateDisplayName: "Bob",
      candidateProfileSummary: "Candidate: Bob",
      hasValidRepos: false,
      selectedResumeProject: "MyProject",
    });

    expect(prompt).toContain("STRICT TIME GUARD");
    expect(prompt).toContain("spend AT MOST 1 rapid turn acknowledging it");
    expect(prompt).toContain("Live coding is the primary evaluation signal");
  });

  it("should include Rule 15 Metric-Pressure Protocol with 3-phase drill and honest admission pivot", () => {
    const prompt = buildSystemPrompt({
      experienceLevel: "SENIOR",
      track: "FULLSTACK_GENERAL",
      candidateDisplayName: "Charlie",
      candidateProfileSummary: "Candidate: Charlie",
      hasValidRepos: false,
    });

    expect(prompt).toContain("METRIC-PRESSURE & AUTHORSHIP VALIDATION PROTOCOL");
    expect(prompt).toContain("Curious Peer Tone (Never Prosecutorial)");
    expect(prompt).toContain("Phase 1 (Measurement Reality)");
    expect(prompt).toContain("Honest Admission Pivot");
    expect(prompt).toContain("Phase 2 (Bottleneck Limit & Trade-off)");
    expect(prompt).toContain("Phase 3 (Authorship vs Team Boilerplate)");
  });

  it("should omit metric block cleanly when resume has no claimed metrics", () => {
    const resumeNoMetrics = {
      candidateName: "Dave",
      targetRole: "Frontend Engineer",
      skills: ["React", "CSS"],
      projects: [
        {
          name: "Portfolio",
          description: "Personal website",
          techStack: ["React"],
        },
      ],
      workHistory: [],
    };

    const prompt = buildSystemPrompt({
      experienceLevel: "JUNIOR",
      track: "FRONTEND",
      candidateDisplayName: "Dave",
      candidateProfileSummary: "Candidate: Dave",
      hasValidRepos: false,
      resumeMetadata: resumeNoMetrics,
    });

    expect(prompt).not.toContain("High-Priority Quantifiable Claims to Audit");
    expect(prompt).toContain("Candidate Resume Context");
  });

  it("should extract and join array metrics when project metrics are provided as string[]", () => {
    const resumeArrayMetrics = {
      candidateName: "Eve",
      targetRole: "Cloud Engineer",
      skills: ["AWS", "Terraform"],
      projects: [
        {
          name: "CloudInfra",
          description: "Infrastructure scaling",
          techStack: ["Terraform", "AWS"],
          metrics: ["40% AWS cost reduction", "99.99% uptime SLA achieved"],
        },
      ],
      workHistory: [],
    };

    const prompt = buildSystemPrompt({
      experienceLevel: "SENIOR",
      track: "DEVOPS",
      candidateDisplayName: "Eve",
      candidateProfileSummary: "Candidate: Eve",
      hasValidRepos: false,
      resumeMetadata: resumeArrayMetrics as any,
    });

    expect(prompt).toContain("High-Priority Quantifiable Claims to Audit");
    expect(prompt).toContain("40% AWS cost reduction; 99.99% uptime SLA achieved");
    expect(prompt).toContain('[Claimed Metric: 40% AWS cost reduction; 99.99% uptime SLA achieved]');
  });
});
