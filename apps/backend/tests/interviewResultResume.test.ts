import { describe, it, expect } from "bun:test";

// Test the recursive JSON unwrapping logic used in interview.ts
function sanitizeJson<T = any>(val: any): T | null {
  if (!val) return null;
  if (typeof val === "object") return val as T;
  try {
    const parsed = JSON.parse(val);
    return typeof parsed === "string" ? JSON.parse(parsed) : (parsed as T);
  } catch {
    return null;
  }
}

describe("Interview Result Resume & Metadata Serialization", () => {
  it("should cleanly return plain JSON objects without modification", () => {
    const sampleMeta = {
      candidateName: "Chirag Panjabi",
      targetRole: "Full Stack Engineer",
      skills: ["React", "TypeScript", "Bun", "PostgreSQL"],
    };

    const sanitized = sanitizeJson(sampleMeta);
    expect(sanitized).toEqual(sampleMeta);
    expect(sanitized?.candidateName).toBe("Chirag Panjabi");
  });

  it("should unpack single-stringified JSON stored in PostgreSQL Json column", () => {
    const rawString = JSON.stringify({
      candidateName: "Alex Rivera",
      skills: ["Go", "Kubernetes"],
      selectedResumeProject: "Distributed Cache",
    });

    const sanitized = sanitizeJson(rawString);
    expect(sanitized).toBeObject();
    expect(sanitized?.candidateName).toBe("Alex Rivera");
    expect(sanitized?.skills).toEqual(["Go", "Kubernetes"]);
  });

  it("should unpack double-stringified JSON safely without crashing", () => {
    const doubleString = JSON.stringify(
      JSON.stringify({
        candidateName: "Taylor Swift",
        skills: ["Swift", "CoreAudio"],
      })
    );

    const sanitized = sanitizeJson(doubleString);
    expect(sanitized).toBeObject();
    expect(sanitized?.candidateName).toBe("Taylor Swift");
    expect(sanitized?.skills[0]).toBe("Swift");
  });

  it("should return null for undefined, null, or malformed JSON strings", () => {
    expect(sanitizeJson(null)).toBeNull();
    expect(sanitizeJson(undefined)).toBeNull();
    expect(sanitizeJson("")).toBeNull();
    expect(sanitizeJson("{not valid json")).toBeNull();
  });
});
