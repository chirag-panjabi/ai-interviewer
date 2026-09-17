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

  it("should schedule rapid streaming chunks strictly sequentially with 0ms overlap", () => {
    const scheduledStarts: number[] = [];

    const mockCtx = {
      currentTime: 0,
      state: "running",
      sampleRate: 24000,
      destination: {},
      createGain: () => ({ gain: { value: 1.0 }, connect: () => {} }),
      createAnalyser: () => ({ fftSize: 256, smoothingTimeConstant: 0.8, connect: () => {} }),
      createBuffer: (_channels: number, length: number, rate: number) => ({
        duration: length / rate,
        copyToChannel: () => {},
      }),
      createBufferSource: () => ({
        connect: () => {},
        start: (when: number) => { scheduledStarts.push(when); },
        stop: () => {},
        disconnect: () => {},
      }),
      resume: () => Promise.resolve(),
      close: () => Promise.resolve(),
    };

    const { LiveAudioPlayer } = require("../src/lib/audioProcessor");
    const player = new LiveAudioPlayer();
    // Inject mock context
    (player as any).ctx = mockCtx;

    // Simulate 10 chunks (each 200ms audio, arriving every 20ms of wall clock time)
    const chunkDuration = 0.20;
    const samplesPerChunk = 4800; // 200ms at 24kHz

    for (let i = 0; i < 10; i++) {
      mockCtx.currentTime = i * 0.02; // 20ms elapsed per chunk
      const samples = new Float32Array(samplesPerChunk);
      const b64 = float32ToBase64PCM(samples);
      player.enqueueChunk(b64, 24000);
    }

    expect(scheduledStarts.length).toBe(10);

    // Initial chunk primes 150ms jitter buffer
    expect(scheduledStarts[0]).toBeCloseTo(0.15, 2);

    // Verify 0ms overlap across all consecutive pairs
    for (let i = 0; i < scheduledStarts.length - 1; i++) {
      const currentEnd = scheduledStarts[i]! + chunkDuration;
      const nextStart = scheduledStarts[i + 1]!;
      expect(nextStart).toBeGreaterThanOrEqual(currentEnd - 0.0001);
      expect(nextStart).toBeCloseTo(currentEnd, 3); // Exactly sequential!
    }
  });

  it("should handle micro-jitter without injecting artificial 150ms pauses", () => {
    const scheduledStarts: number[] = [];

    const mockCtx = {
      currentTime: 0,
      state: "running",
      sampleRate: 24000,
      destination: {},
      createGain: () => ({ gain: { value: 1.0 }, connect: () => {} }),
      createAnalyser: () => ({ fftSize: 256, smoothingTimeConstant: 0.8, connect: () => {} }),
      createBuffer: (_channels: number, length: number, rate: number) => ({
        duration: length / rate,
        copyToChannel: () => {},
      }),
      createBufferSource: () => ({
        connect: () => {},
        start: (when: number) => { scheduledStarts.push(when); },
        stop: () => {},
        disconnect: () => {},
      }),
      resume: () => Promise.resolve(),
      close: () => Promise.resolve(),
    };

    const { LiveAudioPlayer } = require("../src/lib/audioProcessor");
    const player = new LiveAudioPlayer();
    (player as any).ctx = mockCtx;

    // First chunk plays from 0.15s to 0.35s
    mockCtx.currentTime = 0.0;
    const chunk1 = float32ToBase64PCM(new Float32Array(4800)); // 200ms
    player.enqueueChunk(chunk1, 24000);
    expect(scheduledStarts[0]).toBeCloseTo(0.15, 2);

    // Fast forward to 0.37s (micro-jitter: 20ms past scheduled end 0.35s, which is <= 80ms threshold)
    mockCtx.currentTime = 0.37;
    const chunk2 = float32ToBase64PCM(new Float32Array(4800));
    player.enqueueChunk(chunk2, 24000);

    // Should schedule immediately at now (0.37s), NOT at now + 0.15s (0.52s)
    expect(scheduledStarts[1]).toBeCloseTo(0.37, 2);

    // Fast forward to 1.0s (true pause/underrun: 0.43s past scheduled end 0.57s, > 80ms threshold)
    mockCtx.currentTime = 1.0;
    const chunk3 = float32ToBase64PCM(new Float32Array(4800));
    player.enqueueChunk(chunk3, 24000);

    // Should prime full 150ms jitter buffer (1.0 + 0.15 = 1.15s)
    expect(scheduledStarts[2]).toBeCloseTo(1.15, 2);
  });
});

