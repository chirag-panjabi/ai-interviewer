import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Bot, Loader2, PhoneOff, User, Mic, MicOff, AlertCircle, Play, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { VoiceOrb } from "./VoiceOrb";
import { getBackendWsUrl } from "@/lib/config";
import { LiveAudioPlayer, LiveMicrophoneRecorder } from "@/lib/audioProcessor";
import { cn } from "@/lib/utils";

type Status = "idle" | "connecting" | "live" | "reconnecting" | "ending" | "error";

export function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("idle");
  const statusRef = useRef<Status>("idle");
  statusRef.current = status;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiLevel, setAiLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [activeModel, setActiveModel] = useState<string>("gemini-3.1-flash-live-preview");
  const [liveCaption, setLiveCaption] = useState<string>("");
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

  // Toggle Microphone Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
  };

  // Start Mic Level Test
  const startMicTest = async () => {
    try {
      setIsTestingMic(true);
      setMicDetected(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      testStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      testAudioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

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
        if (level > 0.05) {
          setMicDetected(true);
        }
        testRafRef.current = requestAnimationFrame(checkVolume);
      };
      testRafRef.current = requestAnimationFrame(checkVolume);
    } catch (err: any) {
      console.warn("Could not start mic test:", err);
      setIsTestingMic(false);
    }
  };

  // Stop Mic Level Test
  const stopMicTest = (keepStreamAlive = false) => {
    if (testRafRef.current) {
      cancelAnimationFrame(testRafRef.current);
      testRafRef.current = null;
    }
    if (testAudioCtxRef.current && testAudioCtxRef.current.state !== "closed") {
      testAudioCtxRef.current.close().catch(() => {});
      testAudioCtxRef.current = null;
    }
    if (!keepStreamAlive && testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((track) => track.stop());
      testStreamRef.current = null;
    }
    setIsTestingMic(false);
    setTestVolume(0);
  };

  const [isOffline, setIsOffline] = useState(false);

  const startHeartbeat = (ws: WebSocket) => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && !isEndingRef.current) {
        try {
          ws.send(JSON.stringify({ type: "ping" }));
        } catch (e) {
          console.warn("[Interview] Heartbeat send failed:", e);
        }
      }
    }, 15000);
  };

  // Helper to ensure recorder is running and dynamically reading current socketRef
  const ensureRecorderRunning = async (existingStream?: MediaStream) => {
    if (recorderRef.current) {
      await recorderRef.current.resume();
      return;
    }

    const recorder = new LiveMicrophoneRecorder((pcm) => {
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && !isMutedRef.current) {
        try {
          ws.send(JSON.stringify({ type: "audio", pcm }));
        } catch (e) {
          console.warn("[Interview] Audio send failed:", e);
        }
      }
    });

    await recorder.start(existingStream && existingStream.active ? existingStream : undefined);
    recorderRef.current = recorder;
  };

  // Auto-reconnect loop with exponential backoff and online/offline awareness
  const attemptReconnect = (attempt = 1) => {
    if (isEndingRef.current || !interviewId) return;

    // If browser is offline, pause retry attempts until 'online' event fires
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log("[Interview] Browser is offline. Pausing reconnect until internet is restored.");
      setStatus("reconnecting");
      setIsOffline(true);
      return;
    }
    setIsOffline(false);

    if (attempt > 15) {
      setStatus("error");
      setErrorMessage("Network connection lost. Please check your internet connection and click Reconnect.");
      return;
    }

    setStatus("reconnecting");
    setReconnectAttempt(attempt);

    // Flush stale audio buffer from before disconnect
    playerRef.current?.interrupt();

    const wsUrl = getBackendWsUrl(`/api/v1/live/${interviewId}`);
    console.log(`[Interview] Attempting auto-reconnect (${attempt}/15) to ${wsUrl}...`);

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log(`[Interview] Auto-reconnected to backend on attempt ${attempt}`);
        startHeartbeat(socket);
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "pong") {
            // Heartbeat response acknowledged by server
            return;
          }

          if (data.type === "ready" || data.type === "reconnected") {
            if (data.model) setActiveModel(data.model);

            if (playerRef.current) {
              playerRef.current.interrupt();
              await playerRef.current.resume();
            }

            // Ensure microphone recorder is active and un-suspended
            await ensureRecorderRunning();

            setStatus("live");
            setReconnectAttempt(0);
            setIsOffline(false);
          } else if (data.type === "audio" && data.pcm) {
            playerRef.current?.enqueueChunk(data.pcm);
          } else if (data.type === "interrupt") {
            playerRef.current?.interrupt();
          } else if (data.type === "transcript") {
            if (data.text) {
              setLiveCaption((prev) => {
                const prefix = data.role === "user" ? "You: " : "Alex: ";
                if (prev.startsWith(prefix)) {
                  return (prev + data.text).slice(-200);
                }
                return (prefix + data.text).slice(-200);
              });
            }
          } else if (data.type === "error") {
            console.error("[Interview] Reconnect error from backend:", data.message);
          }
        } catch (e) {
          console.error("[Interview] Error parsing reconnect WS message:", e);
        }
      };

      socket.onclose = () => {
        if (!isEndingRef.current && statusRef.current === "reconnecting") {
          const delay = Math.min(8000, 1500 * Math.pow(1.25, attempt - 1)) + Math.random() * 400;
          reconnectTimeoutRef.current = setTimeout(() => {
            attemptReconnect(attempt + 1);
          }, delay);
        }
      };

      socket.onerror = () => {
        // Handled by onclose retry
      };
    } catch (e) {
      const delay = Math.min(8000, 1500 * Math.pow(1.25, attempt - 1)) + Math.random() * 400;
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect(attempt + 1);
      }, delay);
    }
  };

  // Initialize and start interview explicitly from user click
  const joinInterview = async () => {
    if (!interviewId) {
      setStatus("error");
      setErrorMessage("Missing interview ID");
      return;
    }

    const reusableStream = testStreamRef.current;
    stopMicTest(true);

    setStatus("connecting");
    setErrorMessage(null);
    setReconnectAttempt(0);

    try {
      const player = new LiveAudioPlayer();
      player.warmUp();
      playerRef.current = player;

      const wsUrl = getBackendWsUrl(`/api/v1/live/${interviewId}`);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[Interview] WebSocket connected to backend");
        startHeartbeat(socket);
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "pong") {
            // Heartbeat response acknowledged by server
            return;
          }

          if (data.type === "ready" || data.type === "reconnected") {
            if (data.model) setActiveModel(data.model);

            await player.resume();
            await ensureRecorderRunning(reusableStream && reusableStream.active ? reusableStream : undefined);

            setStatus("live");
            if (callStartTimeRef.current === 0) {
              callStartTimeRef.current = Date.now();
              setElapsedSeconds(0);
            }

            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = setInterval(() => {
              const sec = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
              setElapsedSeconds(sec);
            }, 1000);
          } else if (data.type === "audio" && data.pcm) {
            player.enqueueChunk(data.pcm);
          } else if (data.type === "interrupt") {
            player.interrupt();
          } else if (data.type === "transcript") {
            if (data.text) {
              setLiveCaption((prev) => {
                const prefix = data.role === "user" ? "You: " : "Alex: ";
                if (prev.startsWith(prefix)) {
                  return (prev + data.text).slice(-200);
                }
                return (prefix + data.text).slice(-200);
              });
            }
          } else if (data.type === "turnComplete") {
            // Finished current speech turn
          } else if (data.type === "error") {
            setStatus("error");
            setErrorMessage(data.message || "Connection error with interviewer");
          }
        } catch (e) {
          console.error("[Interview] Error parsing WS message:", e);
        }
      };

      socket.onerror = (err) => {
        console.error("[Interview] WebSocket error:", err);
        if (!isEndingRef.current && statusRef.current !== "error") {
          attemptReconnect(1);
        }
      };

      socket.onclose = () => {
        if (!isEndingRef.current && (statusRef.current === "live" || statusRef.current === "connecting")) {
          console.log("[Interview] Connection dropped unexpectedly. Initiating auto-reconnect...");
          attemptReconnect(1);
        }
      };

      const tick = () => {
        if (playerRef.current) {
          setAiLevel(playerRef.current.getVolumeLevel());
        }
        if (recorderRef.current) {
          setUserLevel(recorderRef.current.getVolumeLevel());
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      console.error("[Interview] Join error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Could not access microphone or connect audio.");
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      console.log("[Interview] Browser online event fired. Triggering immediate reconnect...");
      setIsOffline(false);
      if (statusRef.current === "reconnecting" || statusRef.current === "live") {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        attemptReconnect(1);
      }
    };

    const handleOffline = () => {
      console.log("[Interview] Browser offline event fired.");
      setIsOffline(true);
      if (statusRef.current === "live") {
        setStatus("reconnecting");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      cleanup();
    };
  }, []);

  function cleanup() {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    stopMicTest(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "end" }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }
  }

  function endInterview() {
    isEndingRef.current = true;
    setStatus("ending");
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
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground select-none">
      {/* Auto-reconnect banner */}
      {status === "reconnecting" && (
        <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 text-xs font-semibold text-amber-300 backdrop-blur">
          <div className="flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            <span>
              {isOffline
                ? "You are currently offline. Reconnecting as soon as network returns..."
                : `Connection interrupted. Reconnecting to Alex (attempt ${reconnectAttempt}/15)...`}
            </span>
          </div>
          <button
            onClick={() => {
              if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
              attemptReconnect(1);
            }}
            className="rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition-colors cursor-pointer"
          >
            Reconnect Now
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span
              className={
                status === "live"
                  ? "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                  : status === "reconnecting"
                  ? "absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"
                  : "hidden"
              }
            />
            <span
              className={
                "relative inline-flex size-2.5 rounded-full " +
                (status === "live"
                  ? "bg-emerald-400"
                  : status === "error"
                  ? "bg-destructive"
                  : status === "connecting" || status === "reconnecting"
                  ? "bg-amber-400"
                  : "bg-muted-foreground")
              }
            />
          </span>
          <span className="text-sm font-medium">
            {status === "idle"
              ? "Ready to join"
              : status === "connecting"
              ? "Connecting to Gemini Live…"
              : status === "reconnecting"
              ? `Reconnecting (${reconnectAttempt}/15)…`
              : status === "ending"
              ? "Generating Evaluation…"
              : status === "error"
              ? "Connection Error"
              : `Interview in progress · ${formatTimer(elapsedSeconds)}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-secondary/80 px-2.5 py-1 text-xs text-muted-foreground">
            ⚡ {activeModel}
          </span>
        </div>
      </header>

      {/* Stage */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {status === "idle" && (
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="grid size-20 place-items-center rounded-3xl bg-primary/10 text-primary ring-8 ring-primary/5">
              <Bot className="size-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Your Interview is Ready
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Alex has reviewed your GitHub repositories and is prepared to conduct your technical screen.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Button
                size="lg"
                onClick={joinInterview}
                className="w-full gap-2 rounded-xl py-6 text-base font-semibold shadow-lg shadow-primary/20"
              >
                <Play className="size-5 fill-current" />
                Join Interview Now
              </Button>

              {/* Pre-join Mic Check Box */}
              <div className="mt-2 rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mic className="size-3.5 text-primary" />
                    Microphone Check
                  </span>
                  {!isTestingMic ? (
                    <button
                      onClick={startMicTest}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Test Microphone
                    </button>
                  ) : (
                    <button
                      onClick={() => stopMicTest(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Done
                    </button>
                  )}
                </div>

                {isTestingMic && (
                  <div className="mt-3 space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{ width: `${Math.round(testVolume * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {micDetected
                        ? "✅ Microphone is capturing your voice clearly."
                        : "Speak into your microphone to verify level..."}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Clicking activates your audio speakers and connects your microphone.
              </p>
            </div>
          </div>
        )}

        {status === "connecting" && (
          <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
            <div className="grid size-16 place-items-center rounded-2xl bg-secondary/60 text-primary">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Entering Interview Room</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Connecting audio pipeline & initializing Gemini Live…
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-8" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Unable to start interview</p>
              <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => navigate("/")}>
                Back to Home
              </Button>
              <Button onClick={() => setStatus("idle")}>Try Again</Button>
            </div>
          </div>
        )}

        {status === "live" && (
          <div className="flex flex-col items-center gap-12">
            <div className="flex w-full max-w-3xl items-center justify-center gap-12 sm:gap-28">
              <VoiceOrb
                level={aiLevel}
                speaking={aiSpeaking}
                label="Alex (AI Interviewer)"
                sublabel={aiSpeaking ? "Speaking" : "Listening"}
                icon={Bot}
                accent="violet"
              />
              <VoiceOrb
                level={isMuted ? 0 : userLevel}
                speaking={!isMuted && userSpeaking}
                label="You"
                sublabel={isMuted ? "Muted" : userSpeaking ? "Speaking" : "Microphone active"}
                icon={User}
                accent={isMuted ? "violet" : "emerald"}
              />
            </div>

            {liveCaption && (
              <div className="max-w-xl rounded-xl border border-border/50 bg-card/40 px-5 py-3 text-center text-xs text-muted-foreground backdrop-blur shadow-sm">
                <span className="italic font-mono">"{liveCaption}"</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <footer className="flex items-center justify-between border-t border-border/40 px-6 py-5">
        <div className="text-xs text-muted-foreground">
          {status === "live"
            ? "Tip: Speak naturally and interrupt anytime. Use Mute to pause transmission."
            : "Use headphones for the best audio experience."}
        </div>

        {status === "live" && (
          <div className="flex items-center gap-3">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={toggleMute}
              className={cn(
                "gap-2 rounded-full px-5 shadow-sm transition-all",
                isMuted && "ring-2 ring-destructive/40"
              )}
            >
              {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              <span>{isMuted ? "Unmute" : "Mute"}</span>
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={endInterview}
              className="gap-2 rounded-full px-6 shadow-md"
            >
              <PhoneOff className="size-4" />
              End interview
            </Button>
          </div>
        )}
      </footer>
    </main>
  );
}
