import { describe, it, expect } from "bun:test";
import { fixWebmDuration } from "../src/lib/webmDurationPatcher";

describe("WebM EBML Duration Patcher", () => {
  it("should bypass non-webm blobs without alteration", async () => {
    const rawData = new Uint8Array([1, 2, 3, 4, 5]);
    const mp4Blob = new Blob([rawData], { type: "audio/mp4" });
    const result = await fixWebmDuration(mp4Blob, 60000);
    expect(result.type).toBe("audio/mp4");
    const buffer = await result.arrayBuffer();
    expect(new Uint8Array(buffer)).toEqual(rawData);
  });

  it("should patch a 4-byte float32 WebM duration header", async () => {
    // Construct a synthetic EBML buffer with Info tag (0x1549A966) and Duration (0x4489 0x84)
    const buffer = new ArrayBuffer(64);
    const view = new DataView(buffer);

    // Write Segment Info tag at offset 8
    view.setUint8(8, 0x15);
    view.setUint8(9, 0x49);
    view.setUint8(10, 0xa9);
    view.setUint8(11, 0x66);

    // Write Duration tag at offset 16 with size 0x84 (4-byte float)
    view.setUint8(16, 0x44);
    view.setUint8(17, 0x89);
    view.setUint8(18, 0x84);
    view.setFloat32(19, 0.0, false); // initial 0

    const webmBlob = new Blob([buffer], { type: "audio/webm;codecs=opus" });
    const targetDurationMs = 125400; // 125.4 seconds

    const patchedBlob = await fixWebmDuration(webmBlob, targetDurationMs);
    const patchedBuffer = await patchedBlob.arrayBuffer();
    const patchedView = new DataView(patchedBuffer);

    const readDuration = patchedView.getFloat32(19, false);
    expect(readDuration).toBeCloseTo(targetDurationMs, 1);
  });

  it("should patch an 8-byte float64 WebM duration header", async () => {
    // Construct a synthetic EBML buffer with Info tag (0x1549A966) and Duration (0x4489 0x88)
    const buffer = new ArrayBuffer(64);
    const view = new DataView(buffer);

    // Write Segment Info tag at offset 4
    view.setUint8(4, 0x15);
    view.setUint8(5, 0x49);
    view.setUint8(6, 0xa9);
    view.setUint8(7, 0x66);

    // Write Duration tag at offset 12 with size 0x88 (8-byte float)
    view.setUint8(12, 0x44);
    view.setUint8(13, 0x89);
    view.setUint8(14, 0x88);
    view.setFloat64(15, 0.0, false);

    const webmBlob = new Blob([buffer], { type: "audio/webm" });
    const targetDurationMs = 840500; // 840.5 seconds

    const patchedBlob = await fixWebmDuration(webmBlob, targetDurationMs);
    const patchedBuffer = await patchedBlob.arrayBuffer();
    const patchedView = new DataView(patchedBuffer);

    const readDuration = patchedView.getFloat64(15, false);
    expect(readDuration).toBeCloseTo(targetDurationMs, 2);
  });

  it("should gracefully handle buffer without Info tag without crashing", async () => {
    const rawBuffer = new ArrayBuffer(32);
    const blob = new Blob([rawBuffer], { type: "audio/webm" });
    const result = await fixWebmDuration(blob, 50000);
    expect(result.size).toBe(32);
  });
});
