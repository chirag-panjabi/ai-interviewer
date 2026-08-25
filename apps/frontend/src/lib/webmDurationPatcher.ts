/**
 * Zero-Dependency EBML Header Duration Patcher for WebM Audio Blobs
 * Resolves Chromium bug crbug.com/642012 where MediaRecorder produces WebM files with
 * Infinity / NaN duration, enabling accurate seeking and scrubbing in HTML5 audio players.
 */

export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob.type.includes("webm")) {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const patchedBuffer = patchEbmlDuration(arrayBuffer, durationMs);
    return new Blob([patchedBuffer], { type: blob.type });
  } catch (err) {
    console.warn("[webmDurationPatcher] Failed to patch WebM duration, returning raw blob:", err);
    return blob;
  }
}

/**
 * Searches for Segment Info (0x1549A966) -> Duration (0x4489) in EBML stream and writes duration.
 */
function patchEbmlDuration(buffer: ArrayBuffer, durationMs: number): ArrayBuffer {
  const view = new DataView(buffer);
  const len = buffer.byteLength;

  // Search for the Segment Info tag (0x1549A966)
  let infoOffset = -1;
  for (let i = 0; i < len - 4; i++) {
    if (
      view.getUint8(i) === 0x15 &&
      view.getUint8(i + 1) === 0x49 &&
      view.getUint8(i + 2) === 0xa9 &&
      view.getUint8(i + 3) === 0x66
    ) {
      infoOffset = i;
      break;
    }
  }

  if (infoOffset === -1) {
    return buffer;
  }

  // Look for Duration tag (0x4489) within the Info block (search up to 256 bytes after Info tag)
  const searchLimit = Math.min(len - 6, infoOffset + 256);
  for (let i = infoOffset; i < searchLimit; i++) {
    if (view.getUint8(i) === 0x44 && view.getUint8(i + 1) === 0x89) {
      // Found Duration tag
      const sizeByte = view.getUint8(i + 2);
      // EBML float length is typically 4 (0x84) or 8 (0x88)
      if (sizeByte === 0x84 || sizeByte === 0x04) {
        // 4-byte float32
        view.setFloat32(i + 3, durationMs, false); // Big-Endian
        return buffer;
      } else if (sizeByte === 0x88 || sizeByte === 0x08) {
        // 8-byte float64
        view.setFloat64(i + 3, durationMs, false); // Big-Endian
        return buffer;
      }
    }
  }

  return buffer;
}
