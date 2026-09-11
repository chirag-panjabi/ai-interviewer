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

  it("should initialize LiveAudioPlayer and report correct initial playing state", () => {
    // Mock minimal AudioContext for headless Bun environment
    if (typeof (globalThis as any).AudioContext === "undefined") {
      (globalThis as any).AudioContext = class MockAudioContext {
        currentTime = 1.0;
        state = "running";
        sampleRate = 24000;
        destination = {};
        createGain() { return { gain: { value: 1.0 }, connect: () => {} }; }
        createAnalyser() { return { fftSize: 256, smoothingTimeConstant: 0.8, connect: () => {} }; }
        createBuffer(channels: number, length: number, rate: number) {
          return { duration: length / rate, copyToChannel: () => {} };
        }
        createBufferSource() { return { connect: () => {}, start: () => {} }; }
        resume() { return Promise.resolve(); }
        close() { return Promise.resolve(); }
      };
    }

    const { LiveAudioPlayer } = require("../src/lib/audioProcessor");
    const player = new LiveAudioPlayer();
    expect(player.isPlaying()).toBe(false);

    player.warmUp();
    expect(player.isPlaying()).toBe(false);

    // Enqueue a chunk
    const samples = new Float32Array(2400); // 100ms at 24kHz
    const base64 = float32ToBase64PCM(samples);
    player.enqueueChunk(base64, 24000);

    // Audio should now be queued / playing
    expect(player.isPlaying()).toBe(true);

    // After interrupt, should reset immediately
    player.interrupt();
    expect(player.isPlaying()).toBe(false);
  });
});

