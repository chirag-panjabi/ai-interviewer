/**
 * Production-grade Web Audio Player & Microphone Recorder for Gemini Live API
 * - Clean 16-bit Int16 PCM decoding with 24kHz AudioBuffer playback
 * - Browser Autoplay & User-Gesture warm-up
 * - Low latency microphone streaming at 16kHz mono Int16 PCM
 * - Real-time VoiceOrb RMS meter
 */

export class LiveAudioPlayer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor() {
    // Lazy init or warm up on user gesture
  }

  public warmUp(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = new AudioCtx({ sampleRate: 24000 });
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.analyserData = new Uint8Array(this.analyser.fftSize);
        this.analyser.connect(this.ctx.destination);
      }

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      // Play 1ms silent buffer to unlock hardware output
      const silentBuffer = this.ctx.createBuffer(1, 24, 24000);
      const source = this.ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.ctx.destination);
      source.start(0);

      this.nextPlayTime = this.ctx.currentTime;
      console.log("[LiveAudioPlayer] Warmed up AudioContext. State:", this.ctx.state, "SampleRate:", this.ctx.sampleRate);
    } catch (e) {
      console.warn("[LiveAudioPlayer] Warm-up error:", e);
    }
  }

  public async resume(): Promise<boolean> {
    if (!this.ctx) {
      this.warmUp();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
        this.nextPlayTime = this.ctx.currentTime;
        console.log("[LiveAudioPlayer] Resumed. State:", this.ctx.state);
        return true;
      } catch (e) {
        console.warn("[LiveAudioPlayer] Resume failed:", e);
        return false;
      }
    }
    return true;
  }

  public isSuspended(): boolean {
    return !this.ctx || this.ctx.state === "suspended";
  }

  public enqueueChunk(base64Pcm: string, sampleRate = 24000): void {
    if (!this.ctx || this.ctx.state === "closed") {
      this.warmUp();
    }
    const ctx = this.ctx!;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      const binary = window.atob(base64Pcm);
      const len = binary.length;
      if (len < 2) return;

      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const numSamples = Math.floor(len / 2);
      const int16 = new Int16Array(bytes.buffer, 0, numSamples);
      const float32 = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        float32[i] = int16[i]! / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Connect source to destination for audible playback
      source.connect(ctx.destination);

      // Also connect to analyser for visualizer
      if (this.analyser) {
        source.connect(this.analyser);
      }

      const now = ctx.currentTime;
      const startTime = Math.max(now, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
      };
    } catch (err) {
      console.error("[LiveAudioPlayer] Error processing audio chunk:", err);
    }
  }

  public interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.ctx) {
      this.nextPlayTime = this.ctx.currentTime;
    }
  }

  public getVolumeLevel(): number {
    if (!this.analyser || !this.analyserData || this.activeSources.length === 0) {
      return 0;
    }
    (this.analyser as any).getByteTimeDomainData(this.analyserData);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      const v = (this.analyserData[i]! - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.analyserData.length);
    return Math.min(1, rms * 4.0);
  }

  public close(): void {
    this.interrupt();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

// Convert Float32Array to 16-bit Little-Endian PCM base64 string
export function float32ToBase64PCM(input: Float32Array): string {
  const len = input.length;
  const bytes = new Uint8Array(len * 2);

  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    bytes[i * 2] = int16 & 0xff;
    bytes[i * 2 + 1] = (int16 >> 8) & 0xff;
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return window.btoa(binary);
}

// Downsample Float32Array to 16kHz
function resampleTo16k(audioData: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return audioData;
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const originalIndex = i * ratio;
    const indexFloor = Math.floor(originalIndex);
    const indexCeil = Math.min(audioData.length - 1, indexFloor + 1);
    const fraction = originalIndex - indexFloor;
    result[i] = audioData[indexFloor]! * (1 - fraction) + audioData[indexCeil]! * fraction;
  }
  return result;
}

// Calculate RMS volume level (0..1)
function calculateRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]!;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / (samples.length || 1));
  return Math.min(1, rms * 4.5);
}

export class LiveMicrophoneRecorder {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private onPcmData: (base64Pcm: string) => void;
  private currentVolume = 0;

  constructor(onPcmData: (base64Pcm: string) => void) {
    this.onPcmData = onPcmData;
  }

  public async start(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtx();
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

    // Buffer size 2048 gives ~42ms low latency at 48kHz
    this.processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      this.currentVolume = calculateRms(inputData);

      // Downsample input data to 16kHz
      const resampled16k = resampleTo16k(inputData, this.audioCtx?.sampleRate || 48000);
      const base64 = float32ToBase64PCM(resampled16k);

      this.onPcmData(base64);
    };

    source.connect(this.processorNode);

    // Mute local feedback
    const silentGain = this.audioCtx.createGain();
    silentGain.gain.value = 0;
    this.processorNode.connect(silentGain);
    silentGain.connect(this.audioCtx.destination);
  }

  public getVolumeLevel(): number {
    return this.currentVolume;
  }

  public stop(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.currentVolume = 0;
  }
}
