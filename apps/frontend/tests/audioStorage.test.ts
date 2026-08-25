import { describe, it, expect } from "bun:test";
import {
  saveSessionAudio,
  getSessionAudio,
  deleteSessionAudio,
} from "../src/lib/audioStorage";

// Mock URL.createObjectURL for test environment if undefined
if (typeof globalThis.URL.createObjectURL === "undefined") {
  globalThis.URL.createObjectURL = (blob: Blob) => `blob:mock-url-${blob.size}`;
}

describe("Audio Storage Engine", () => {
  it("should save and retrieve a session audio recording", async () => {
    const testId = "test-interview-101";
    const rawAudio = new Uint8Array([10, 20, 30, 40, 50, 60]);
    const blob = new Blob([rawAudio], { type: "audio/webm;codecs=opus" });
    const duration = 184; // seconds

    await saveSessionAudio(testId, blob, "audio/webm;codecs=opus", "webm", duration);

    const retrieved = await getSessionAudio(testId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.mimeType).toBe("audio/webm;codecs=opus");
    expect(retrieved?.extension).toBe("webm");
    expect(retrieved?.duration).toBe(184);
    expect(retrieved?.url).toContain("blob:");

    const retrievedBytes = new Uint8Array(await retrieved!.blob.arrayBuffer());
    expect(retrievedBytes).toEqual(rawAudio);
  });

  it("should delete a session recording cleanly", async () => {
    const testId = "test-interview-delete";
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mp4" });

    await saveSessionAudio(testId, blob, "audio/mp4", "m4a", 45);
    let item = await getSessionAudio(testId);
    expect(item).not.toBeNull();

    await deleteSessionAudio(testId);
    item = await getSessionAudio(testId);
    expect(item).toBeNull();
  });

  it("should handle multiple sessions and preserve independent records", async () => {
    const s1 = "session-alpha";
    const s2 = "session-beta";

    const b1 = new Blob([new Uint8Array([1, 1, 1])], { type: "audio/webm" });
    const b2 = new Blob([new Uint8Array([2, 2, 2, 2])], { type: "audio/mp4" });

    await saveSessionAudio(s1, b1, "audio/webm", "webm", 120);
    await saveSessionAudio(s2, b2, "audio/mp4", "m4a", 300);

    const r1 = await getSessionAudio(s1);
    const r2 = await getSessionAudio(s2);

    expect(r1?.duration).toBe(120);
    expect(r1?.extension).toBe("webm");

    expect(r2?.duration).toBe(300);
    expect(r2?.extension).toBe("m4a");
  });
});
