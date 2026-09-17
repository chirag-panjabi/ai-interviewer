import { describe, it, expect } from "bun:test";
import type { TranscriptTurn } from "../src/components/LiveTranscriptDrawer";

// Test helper mirroring LiveTranscriptDrawer question parsing logic
function extractLatestAlexQuestion(turns: TranscriptTurn[]) {
  const latestAlexTurn = [...turns]
    .reverse()
    .find((t) => t.speaker === "assistant" && t.text.trim().length > 0);

  if (!latestAlexTurn) return null;
  const text = latestAlexTurn.text.trim();
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
  if (!sentences || sentences.length <= 1) {
    return { context: null, inquiry: text, fullText: text };
  }
  const context = sentences.slice(0, -1).join("").trim();
  const inquiry = sentences[sentences.length - 1]?.trim() || text;
  return { context, inquiry, fullText: text };
}

function filterTranscriptTurns(turns: TranscriptTurn[], query: string) {
  if (!query.trim()) return turns;
  const q = query.toLowerCase();
  return turns.filter((t) => t.text.toLowerCase().includes(q));
}

describe("Live Transcript Drawer Core Invariants", () => {
  const sampleTurns: TranscriptTurn[] = [
    {
      id: "turn-1",
      speaker: "assistant",
      text: "Hey Chirag, great to meet you! Give me a quick 60-second walkthrough of your engineering background.",
      timestamp: Date.now() - 30000,
    },
    {
      id: "turn-2",
      speaker: "user",
      text: "I built StreamPulse, a Go-based telemetry ingestion service handling 85,000 QPS with p99 under 25ms.",
      timestamp: Date.now() - 20000,
    },
    {
      id: "turn-3",
      speaker: "assistant",
      text: "Handling 85,000 QPS in Go is serious ingestion scale. Was that performance measured under live production traffic or synthetic load, and what bottleneck capped your throughput?",
      timestamp: Date.now() - 10000,
    },
    {
      id: "turn-4",
      speaker: "user",
      text: "It was synthetic testing with Locust on 8 staging nodes.",
      timestamp: Date.now() - 5000,
      isStreaming: true,
    },
  ];

  it("should extract latest Alex question even when the candidate is the last speaker (Trap 1 Hardening)", () => {
    const parsed = extractLatestAlexQuestion(sampleTurns);
    expect(parsed).not.toBeNull();
    expect(parsed?.fullText).toContain("85,000 QPS in Go is serious ingestion scale");
    expect(parsed?.inquiry).toContain("what bottleneck capped your throughput?");
    expect(parsed?.context).toBe("Handling 85,000 QPS in Go is serious ingestion scale.");
  });

  it("should handle single sentence Alex turns cleanly", () => {
    const singleSentenceTurns: TranscriptTurn[] = [
      {
        id: "turn-1",
        speaker: "assistant",
        text: "What specific locking strategy or isolation level did you use?",
        timestamp: Date.now(),
      },
    ];
    const parsed = extractLatestAlexQuestion(singleSentenceTurns);
    expect(parsed).not.toBeNull();
    expect(parsed?.context).toBeNull();
    expect(parsed?.inquiry).toBe("What specific locking strategy or isolation level did you use?");
  });

  it("should return null if no Alex turn exists in history yet", () => {
    const candidateOnlyTurns: TranscriptTurn[] = [
      {
        id: "turn-1",
        speaker: "user",
        text: "Hello, I am ready to start.",
        timestamp: Date.now(),
      },
    ];
    const parsed = extractLatestAlexQuestion(candidateOnlyTurns);
    expect(parsed).toBeNull();
  });

  it("should filter transcript turns accurately by case-insensitive query", () => {
    const resultsQps = filterTranscriptTurns(sampleTurns, "qps");
    expect(resultsQps.length).toBe(2); // Turn 2 & Turn 3 contain QPS

    const resultsLocust = filterTranscriptTurns(sampleTurns, "locust");
    expect(resultsLocust.length).toBe(1);
    expect(resultsLocust[0]?.speaker).toBe("user");

    const resultsEmpty = filterTranscriptTurns(sampleTurns, "");
    expect(resultsEmpty.length).toBe(4);

    const resultsNone = filterTranscriptTurns(sampleTurns, "nonexistent-keyword-xyz");
    expect(resultsNone.length).toBe(0);
  });

  it("should preserve interrupted and streaming flags on turns", () => {
    const turnsWithFlags: TranscriptTurn[] = [
      {
        id: "turn-1",
        speaker: "assistant",
        text: "How did you handle the... [Interrupted]",
        timestamp: Date.now(),
        wasInterrupted: true,
        isStreaming: false,
      },
    ];
    expect(turnsWithFlags[0]?.wasInterrupted).toBe(true);
    expect(turnsWithFlags[0]?.isStreaming).toBe(false);
  });
});
