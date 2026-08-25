import { describe, it, expect } from "bun:test";
import { float32ToBase64PCM } from "../src/lib/audioProcessor";

describe("Audio Processing Utilities", () => {
  it("should encode Float32 audio samples to valid 16-bit PCM base64 string", () => {
    // 4 float samples: 0, 0.5, -0.5, 1.0
    const samples = new Float32Array([0, 0.5, -0.5, 1.0]);
    const base64 = float32ToBase64PCM(samples);

    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);

    // Decode base64 to check exact 16-bit Int16 values
    const binary = atob(base64);
    expect(binary.length).toBe(8); // 4 samples * 2 bytes = 8 bytes

    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);

    expect(int16[0]).toBe(0);
    expect(int16[1]).toBe(16383); // 0.5 * 32767
    expect(int16[2]).toBe(-16384); // -0.5 * 32768
    expect(int16[3]).toBe(32767); // 1.0 * 32767
  });

  it("should clamp out-of-range floats to valid 16-bit integer boundaries", () => {
    const extremeSamples = new Float32Array([2.5, -3.0]);
    const base64 = float32ToBase64PCM(extremeSamples);

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);

    expect(int16[0]).toBe(32767); // max Int16
    expect(int16[1]).toBe(-32768); // min Int16
  });
});
