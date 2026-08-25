/**
 * Production-grade Web Audio Player & Microphone Recorder for Gemini Live API
 * - Clean 16-bit Int16 PCM decoding with 24kHz AudioBuffer playback
 * - Browser Autoplay & User-Gesture warm-up
 * - Low latency microphone streaming at 16kHz mono Int16 PCM
 * - Real-time VoiceOrb RMS meter
 * - Dual-track SessionAudioRecorder mixing candidate mic + AI interviewer with zero JS GC overhead
 */

export class LiveAudioPlayer {
  private ctx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
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
        try {
          this.ctx = new AudioCtx({ sampleRate: 24000 });
        } catch {
          // Safari WebKit does not allow custom sampleRate on new AudioContext
          this.ctx = new AudioCtx();
        }

        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.value = 1.0;
        this.masterGainNode.connect(this.ctx.destination);

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.analyserData = new Uint8Array(this.analyser.fftSize);
        this.masterGainNode.connect(this.analyser);
      }

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      this.ctx.onstatechange = () => {
        if (this.ctx && this.ctx.state === "suspended") {
          console.log("[LiveAudioPlayer] Context suspended by browser. Auto-resuming...");
          this.ctx.resume().catch(() => {});
        }
      };

      // Play 1ms silent buffer to unlock hardware output
      const silentBuffer = this.ctx.createBuffer(1, 24, 24000);
      const source = this.ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.masterGainNode || this.ctx.destination);
      source.start(0);

      this.nextPlayTime = this.ctx.currentTime;
      console.log("[LiveAudioPlayer] Warmed up AudioContext. State:", this.ctx.state, "SampleRate:", this.ctx.sampleRate);
    } catch (e) {
      console.warn("[LiveAudioPlayer] Warm-up error:", e);
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterGain(): GainNode | null {
    return this.masterGainNode;
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

      // Connect source to masterGainNode (which feeds hardware speakers, visualizer, and session recorder)
      if (this.masterGainNode) {
        source.connect(this.masterGainNode);
      } else {
        source.connect(ctx.destination);
        if (this.analyser) source.connect(this.analyser);
      }

      const now = ctx.currentTime;
      // If there was a long pause, reset nextPlayTime to current time
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now;
      }
      const startTime = this.nextPlayTime;
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
    if (this.masterGainNode) {
      try { this.masterGainNode.disconnect(); } catch {}
      this.masterGainNode = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch {}
      this.analyser = null;
    }
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
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private silentGainNode: GainNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private onPcmData: (base64Pcm: string) => void;
  private currentVolume = 0;

  constructor(onPcmData: (base64Pcm: string) => void) {
    this.onPcmData = onPcmData;
  }

  public async start(existingStream?: MediaStream): Promise<void> {
    if (existingStream && existingStream.active && existingStream.getAudioTracks().length > 0) {
      this.mediaStream = existingStream;
    } else {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtx();

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // Auto-resume if browser suspends AudioContext during long silence
    this.audioCtx.onstatechange = () => {
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        console.log("[LiveMicrophoneRecorder] AudioContext suspended by browser. Auto-resuming...");
        this.audioCtx.resume().catch(() => {});
      }
    };

    // Store sourceNode on class instance to prevent V8/WebKit garbage collection during silence
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    // Buffer size 2048 gives ~42ms low latency at 48kHz
    this.processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      const inputData = e.inputBuffer.getChannelData(0);
      this.currentVolume = calculateRms(inputData);

      // Downsample input data to 16kHz
      const resampled16k = resampleTo16k(inputData, this.audioCtx?.sampleRate || 48000);
      const base64 = float32ToBase64PCM(resampled16k);

      this.onPcmData(base64);
    };

    this.sourceNode.connect(this.processorNode);

    // Mute local feedback - store gainNode on class instance to prevent GC
    this.silentGainNode = this.audioCtx.createGain();
    this.silentGainNode.gain.value = 0;
    this.processorNode.connect(this.silentGainNode);
    this.silentGainNode.connect(this.audioCtx.destination);
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  public getVolumeLevel(): number {
    return this.currentVolume;
  }

  public async resume(): Promise<boolean> {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      try {
        await this.audioCtx.resume();
        console.log("[LiveMicrophoneRecorder] Resumed AudioContext");
        return true;
      } catch (e) {
        console.warn("[LiveMicrophoneRecorder] Resume failed:", e);
        return false;
      }
    }
    return true;
  }

  public stop(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.silentGainNode) {
      this.silentGainNode.disconnect();
      this.silentGainNode = null;
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

/**
 * Dual-Track Session Audio Recorder
 * - Dynamically negotiates supported browser codec (.webm on Chromium, .m4a on Safari)
 * - Mixes candidate microphone and AI interviewer audio inside native Web Audio DSP graph
 * - Enforces 2-second timeslice chunk streaming for background-tab throttling immunity
 */
export class SessionAudioRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private audioCtx: AudioContext | null = null;
  private mixerDestination: MediaStreamAudioDestinationNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private aiGain: GainNode | null = null;
  private chosenMime = "audio/webm;codecs=opus";
  private chosenExt = "webm";
  private isRecording = false;

  constructor() {
    this.detectSupportedMime();
  }

  private detectSupportedMime(): void {
    const MIME_CANDIDATES = [
      { type: "audio/webm;codecs=opus", ext: "webm" },
      { type: "audio/webm", ext: "webm" },
      { type: "audio/mp4", ext: "m4a" },
      { type: "audio/aac", ext: "m4a" },
      { type: "audio/ogg;codecs=opus", ext: "ogg" },
      { type: "audio/wav", ext: "wav" },
    ];

    if (typeof window !== "undefined" && typeof MediaRecorder !== "undefined") {
      for (const candidate of MIME_CANDIDATES) {
        if (MediaRecorder.isTypeSupported(candidate.type)) {
          this.chosenMime = candidate.type;
          this.chosenExt = candidate.ext;
          console.log(`[SessionAudioRecorder] Selected native audio codec: ${candidate.type} (.${candidate.ext})`);
          return;
        }
      }
    }
  }

  public getExtension(): string {
    return this.chosenExt;
  }

  public getMimeType(): string {
    return this.chosenMime;
  }

  public start(micStream: MediaStream, player: LiveAudioPlayer): void {
    if (this.isRecording) return;

    try {
      const playerCtx = player.getContext();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = playerCtx || new AudioCtx();

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      // Create shared session mixer destination
      this.mixerDestination = this.audioCtx.createMediaStreamDestination();

      // Route 1: Microphone stream with 1.05x gain
      this.micSource = this.audioCtx.createMediaStreamSource(micStream);
      this.micGain = this.audioCtx.createGain();
      this.micGain.gain.value = 1.05;
      this.micSource.connect(this.micGain);
      this.micGain.connect(this.mixerDestination);

      // Route 2: AI Player master output with 0.95x gain headroom
      const aiMasterGain = player.getMasterGain();
      if (aiMasterGain) {
        this.aiGain = this.audioCtx.createGain();
        this.aiGain.gain.value = 0.95;
        aiMasterGain.connect(this.aiGain);
        this.aiGain.connect(this.mixerDestination);
      }

      // Initialize MediaRecorder on the mixed destination stream
      const options: MediaRecorderOptions = {};
      if (this.chosenMime) {
        options.mimeType = this.chosenMime;
      }

      this.chunks = [];
      this.recorder = new MediaRecorder(this.mixerDestination.stream, options);

      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      // 2000ms timeslice guarantees continuous chunk flushing even in backgrounded tabs
      this.recorder.start(2000);
      this.isRecording = true;
      console.log("[SessionAudioRecorder] Active recording started with codec:", this.chosenMime);
    } catch (err) {
      console.warn("[SessionAudioRecorder] Failed to start recording session:", err);
    }
  }

  public setMute(isMuted: boolean): void {
    if (this.micGain && this.audioCtx) {
      this.micGain.gain.setValueAtTime(isMuted ? 0 : 1.05, this.audioCtx.currentTime);
    }
  }

  public stop(): Promise<{ blob: Blob; mimeType: string; extension: string }> {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") {
        const finalBlob = new Blob(this.chunks, { type: this.chosenMime });
        this.cleanup();
        return resolve({ blob: finalBlob, mimeType: this.chosenMime, extension: this.chosenExt });
      }

      const onStopHandler = () => {
        const finalBlob = new Blob(this.chunks, { type: this.chosenMime });
        this.cleanup();
        resolve({ blob: finalBlob, mimeType: this.chosenMime, extension: this.chosenExt });
      };

      this.recorder.onstop = onStopHandler;

      try {
        this.recorder.stop();
      } catch {
        onStopHandler();
      }
    });
  }

  public flush(): { blob: Blob; mimeType: string; extension: string } | null {
    if (this.chunks.length === 0) return null;
    return {
      blob: new Blob(this.chunks, { type: this.chosenMime }),
      mimeType: this.chosenMime,
      extension: this.chosenExt,
    };
  }

  private cleanup(): void {
    this.isRecording = false;
    if (this.micSource) {
      try { this.micSource.disconnect(); } catch {}
      this.micSource = null;
    }
    if (this.micGain) {
      try { this.micGain.disconnect(); } catch {}
      this.micGain = null;
    }
    if (this.aiGain) {
      try { this.aiGain.disconnect(); } catch {}
      this.aiGain = null;
    }
    this.mixerDestination = null;
    this.recorder = null;
  }
}
