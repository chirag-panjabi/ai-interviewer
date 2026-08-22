/* Hallmark · genre: modern-minimal · macrostructure: Studio-Console · theme: custom-carbon · states: idle · connecting · live · reconnecting · ending · error */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Bot,
  Loader2,
  PhoneOff,
  User,
  Mic,
  MicOff,
  AlertCircle,
  Play,
  Radio,
  CheckCircle2,
  Headphones,
  Sliders,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { VoiceOrb } from "./VoiceOrb";
import { getBackendWsUrl } from "@/lib/config";
import { getCustomApiKey } from "@/lib/apiKeyStorage";
import { LiveAudioPlayer, LiveMicrophoneRecorder } from "@/lib/audioProcessor";
import { cn } from "@/lib/utils";

type Status = "idle" | "connecting" | "live" | "reconnecting" | "ending" | "error";

function formatLiveModelName(model: string): string {
  if (!model) return "Gemini Live Audio";
  if (model.includes("flash-live") || model.includes("live-preview")) return "Gemini Live Audio";
  return model.replace(/^gemini-/, "Gemini ").replace(/-/g, " ");
}

interface LiveCaption {
  speaker: "assistant" | "user";
  text: string;
}

export function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("idle");
  const statusRef = useRef<Status>("idle");
  statusRef.current = status;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiLevel, setAiLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [activeModel, setActiveModel] = useState<string>("gemini-live-audio");
  const [liveCaption, setLiveCaption] = useState<LiveCaption | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Controls & Timer State
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const callStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isEndingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-join Mic Test State
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testVolume, setTestVolume] = useState(0);
  const [micDetected, setMicDetected] = useState(false);
  const testStreamRef = useRef<MediaStream | null>(null);
  const testAudioCtxRef = useRef<AudioContext | null>(null);
  const testRafRef = useRef<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const recorderRef = useRef<LiveMicrophoneRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
  };

  const startMicTest = async () => {
    try {
      setIsTestingMic(true);
      setMicDetected(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      testAudioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.fftSize);
      const checkVolume = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i]! - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(1, rms * 4.5);
        setTestVolume(level);
        if (level > 0.05) setMicDetected(true);
        testRafRef.current = requestAnimationFrame(checkVolume);
      };
      testRafRef.current = requestAnimationFrame(checkVolume);
    } catch (err: any) {
      console.warn("Could not start mic test:", err);
      setIsTestingMic(false);
    }
  };

  const stopMicTest = (keepStreamAlive = false) => {
    if (testRafRef.current) cancelAnimationFrame(testRafRef.current);
    if (testAudioCtxRef.current) testAudioCtxRef.current.close().catch(() => {});
    if (!keepStreamAlive && testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((track) => track.stop());
      testStreamRef.current = null;
    }
    setIsTestingMic(false);
    setTestVolume(0);
  };

  const startHeartbeat = (ws: WebSocket) => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && !isEndingRef.current) {
        try { ws.send(JSON.stringify({ type: "ping" })); } catch (e) {}
      }
    }, 15000);
  };

  const ensureRecorderRunning = async (existingStream?: MediaStream) => {
    if (recorderRef.current) {
      await recorderRef.current.resume();
      return;
    }
    const recorder = new LiveMicrophoneRecorder((pcm) => {
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && !isMutedRef.current) {
        try { ws.send(JSON.stringify({ type: "audio", pcm })); } catch (e) {}
      }
    });
    await recorder.start(existingStream && existingStream.active ? existingStream : undefined);
    recorderRef.current = recorder;
  };

  const attemptReconnect = (attempt = 1) => {
    if (isEndingRef.current || !interviewId) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("reconnecting");
      setIsOffline(true);
      return;
    }

    setStatus("reconnecting");
    setReconnectAttempt(attempt);
    playerRef.current?.interrupt();

    const customKey = getCustomApiKey();
    const wsUrl = getBackendWsUrl(`/api/v1/live/${interviewId}${customKey ? `?apiKey=${encodeURIComponent(customKey)}` : ""}`);

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) socketRef.current.close();
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (customKey) try { socket.send(JSON.stringify({ type: "auth", apiKey: customKey })); } catch (e) {}
        startHeartbeat(socket);
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return;
          if (data.type === "ready" || data.type === "reconnected") {
            if (data.model) setActiveModel(data.model);
            if (playerRef.current) { playerRef.current.interrupt(); await playerRef.current.resume(); }
            await ensureRecorderRunning();
            setStatus("live");
            setReconnectAttempt(0);
            setIsOffline(false);
          } else if (data.type === "audio" && data.pcm) {
            playerRef.current?.enqueueChunk(data.pcm);
          } else if (data.type === "interrupt") {
            playerRef.current?.interrupt();
            setLiveCaption((prev) => (prev?.speaker === "assistant" ? { ...prev, text: prev.text + " [Interrupted]" } : prev));
          } else if (data.type === "transcript") {
            if (data.text) {
              const incomingSpeaker = data.role === "user" ? "user" : "assistant";
              setLiveCaption((prev) => {
                if (!prev || prev.speaker !== incomingSpeaker) {
                  return { speaker: incomingSpeaker, text: data.text };
                }
                return { speaker: incomingSpeaker, text: (prev.text + data.text).slice(-300) };
              });
            }
          }
        } catch (err) { console.error("[Interview] Reconnect parse error:", err); }
      };

      socket.onclose = (e) => {
        if (isEndingRef.current) return;
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        const nextDelay = Math.min(1000 * Math.pow(1.4, attempt), 8000);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => { attemptReconnect(attempt + 1); }, nextDelay);
      };
    } catch (err: any) { console.error("[Interview] Reconnect setup threw error:", err); }
  };

  const joinInterview = async () => {
    try {
      setStatus("connecting");
      setErrorMessage(null);
      const streamToTransfer = testStreamRef.current;
      stopMicTest(true);
      const player = new LiveAudioPlayer();
      player.warmUp();
      await player.resume();
      playerRef.current = player;
      const customKey = getCustomApiKey();
      const wsUrl = getBackendWsUrl(`/api/v1/live/${interviewId}${customKey ? `?apiKey=${encodeURIComponent(customKey)}` : ""}`);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = async () => {
        if (customKey) try { socket.send(JSON.stringify({ type: "auth", apiKey: customKey })); } catch (e) {}
        startHeartbeat(socket);
        await ensureRecorderRunning(streamToTransfer && streamToTransfer.active ? streamToTransfer : undefined);
        callStartTimeRef.current = Date.now();
        timerIntervalRef.current = setInterval(() => {
          setElapsedSeconds(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
        }, 1000);
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return;
          if (data.type === "ready") {
            if (data.model) setActiveModel(data.model);
            setStatus("live");
          } else if (data.type === "audio" && data.pcm) {
            player.enqueueChunk(data.pcm);
          } else if (data.type === "interrupt") {
            player.interrupt();
            setLiveCaption((prev) => (prev?.speaker === "assistant" ? { ...prev, text: prev.text + " [Interrupted]" } : prev));
          } else if (data.type === "transcript") {
            if (data.text) {
              const incomingSpeaker = data.role === "user" ? "user" : "assistant";
              setLiveCaption((prev) => {
                if (!prev || prev.speaker !== incomingSpeaker) {
                  return { speaker: incomingSpeaker, text: data.text };
                }
                return { speaker: incomingSpeaker, text: (prev.text + data.text).slice(-300) };
              });
            }
          } else if (data.type === "error") {
            setStatus("error");
            setErrorMessage(data.message || "An error occurred during the interview.");
          }
        } catch (err) { console.error("[Interview] Failed to parse WebSocket message:", err); }
      };

      socket.onerror = (e) => {
        if (statusRef.current === "connecting") {
          setStatus("error");
          setErrorMessage("Failed to connect to the interview server.");
        }
      };

      socket.onclose = () => {
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (!isEndingRef.current && statusRef.current === "live") attemptReconnect(1);
      };

      const updateLevels = () => {
        if (playerRef.current) setAiLevel(playerRef.current.getVolumeLevel());
        if (recorderRef.current) setUserLevel(recorderRef.current.getVolumeLevel());
        rafRef.current = requestAnimationFrame(updateLevels);
      };
      rafRef.current = requestAnimationFrame(updateLevels);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage("Failed to initialize audio devices.");
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      if (statusRef.current === "reconnecting") {
        setIsOffline(false);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        attemptReconnect(1);
      }
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      cleanup();
    };
  }, []);

  function cleanup() {
    isEndingRef.current = true;
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recorderRef.current) { recorderRef.current.stop(); recorderRef.current = null; }
    if (playerRef.current) { playerRef.current.close(); playerRef.current = null; }
    if (socketRef.current) { socketRef.current.close(); socketRef.current = null; }
    stopMicTest(false);
  }

  function endInterview() {
    cleanup();
    navigate(`/result/${interviewId}`);
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const aiSpeaking = aiLevel > 0.05 && aiLevel >= userLevel;
  const userSpeaking = userLevel > 0.05 && userLevel > aiLevel;

  return (
    <main className="flex h-screen w-full max-w-full flex-col overflow-hidden bg-background text-foreground select-none justify-between">
      {status === "reconnecting" && (
        <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 text-xs font-semibold text-amber-300 backdrop-blur">
          <div className="flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin text-amber-400" />
            <span>{isOffline ? "Network connection offline." : `Connection interrupted. Reconnecting (attempt ${reconnectAttempt}/15)...`}</span>
          </div>
          <button onClick={() => attemptReconnect(1)} className="rounded-md bg-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase cursor-pointer">Reconnect</button>
        </div>
      )}

      <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className={"relative inline-flex size-2.5 rounded-full " + (status === "live" ? "bg-emerald-400" : status === "reconnecting" ? "bg-amber-400" : "bg-muted-foreground")} />
          </span>
          <span className="text-xs font-semibold tracking-wider font-mono text-foreground uppercase">
            {status === "idle" ? "STUDIO READY" : status === "live" ? "LIVE SESSION" : "SYSTEM STATUS"}
          </span>
          {status === "live" && <><span className="h-3 w-px bg-border/60" /><span className="font-mono text-xs font-semibold tabular-nums">{formatTimer(elapsedSeconds)}</span></>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1 text-xs text-muted-foreground">
            <Radio className="size-3 text-primary animate-pulse" />
            <span className="font-mono text-[11px]">{formatLiveModelName(activeModel)}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        {status === "idle" && (
          <div className="w-full max-w-xl rounded-2xl border border-border/80 bg-card/60 p-8 shadow-sm backdrop-blur text-left space-y-6">
            <div className="flex items-start justify-between border-b border-border/40 pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Interview Stage Ready</h1>
                <p className="mt-1 text-xs text-muted-foreground">Alex is calibrated to your technical stack and ready to conduct your interview.</p>
              </div>
              <div className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Bot className="size-5" /></div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5"><Sliders className="size-3.5 text-primary" /> Audio Diagnostics</span>
                <button
                  type="button"
                  onClick={isTestingMic ? () => stopMicTest(false) : startMicTest}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  {isTestingMic ? "Stop Testing" : "Test Mic Level"}
                </button>
              </div>
              {isTestingMic && (
                <div className="space-y-2 pt-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.round(testVolume * 100)}%` }} /></div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {micDetected ? (
                      <>
                        <CheckCircle2 className="size-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Signal detected.</span>
                      </>
                    ) : (
                      <span>Speak to test level...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button size="lg" onClick={joinInterview} className="w-full gap-2 rounded-xl py-5 text-sm font-semibold cursor-pointer">
              <Play className="size-4 fill-current" /> Join Live Audio Room <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {status === "live" && (
          <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
            <div className="flex w-full items-center justify-center gap-24">
              <VoiceOrb level={aiLevel} speaking={aiSpeaking} label="Alex (AI)" sublabel={aiSpeaking ? "Speaking" : "Listening"} icon={Bot} />
              <VoiceOrb level={isMuted ? 0 : userLevel} speaking={!isMuted && userSpeaking} label="You (Candidate)" sublabel={isMuted ? "Muted" : "Active"} icon={User} />
            </div>
            {liveCaption && liveCaption.text && (
              <div className="max-w-xl rounded-xl border border-border/60 bg-card/60 px-5 py-3 text-center text-xs text-foreground/90 backdrop-blur shadow-sm animate-in fade-in duration-150 space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="flex size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {liveCaption.speaker === "user" ? "Candidate (You)" : "Alex (Interviewer)"}
                  </span>
                </div>
                <p className="italic font-mono text-xs leading-relaxed text-foreground">
                  "{liveCaption.text}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-border/40 px-6 py-4">
        <div className="text-xs text-muted-foreground">Real-Time Screening Console</div>
        {status === "live" && (
          <div className="flex items-center gap-2.5">
            <Button variant={isMuted ? "destructive" : "outline"} size="sm" onClick={toggleMute} className="rounded-lg text-xs gap-1.5">
              {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />} {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="destructive" size="sm" onClick={endInterview} className="rounded-lg text-xs gap-1.5 shadow-sm">
              <PhoneOff className="size-3.5" /> End Interview
            </Button>
          </div>
        )}
      </footer>
    </main>
  );
}

