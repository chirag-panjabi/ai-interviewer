import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { Bot, Loader2, PhoneOff, User, Mic, Volume2, AlertCircle, Play } from "lucide-react";
import { Button } from "./ui/button";
import { VoiceOrb } from "./VoiceOrb";
import { getBackendWsUrl } from "@/lib/config";
import { LiveAudioPlayer, LiveMicrophoneRecorder } from "@/lib/audioProcessor";

type Status = "idle" | "connecting" | "live" | "ending" | "error";

export function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiLevel, setAiLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [activeModel, setActiveModel] = useState<string>("gemini-3.1-flash-live-preview");
  const [liveCaption, setLiveCaption] = useState<string>("");

  const socketRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const recorderRef = useRef<LiveMicrophoneRecorder | null>(null);
  const rafRef = useRef<number | null>(null);

  // Initialize and start interview explicitly from user click
  const joinInterview = async () => {
    if (!interviewId) {
      setStatus("error");
      setErrorMessage("Missing interview ID");
      return;
    }

    setStatus("connecting");
    setErrorMessage(null);

    try {
      // 1. Create and warm up audio player directly in the user click gesture
      const player = new LiveAudioPlayer();
      player.warmUp();
      playerRef.current = player;

      // 2. Open WebSocket
      const wsUrl = getBackendWsUrl(`/api/v1/live/${interviewId}`);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[Interview] WebSocket connected to backend");
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "ready") {
            if (data.model) setActiveModel(data.model);

            await player.resume();

            // 3. Request and activate microphone
            const recorder = new LiveMicrophoneRecorder((pcm) => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "audio", pcm }));
              }
            });

            await recorder.start();
            recorderRef.current = recorder;

            setStatus("live");
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
            console.error("[Interview] Backend error:", data.message);
            setStatus("error");
            setErrorMessage(data.message || "An error occurred with the live session.");
          }
        } catch (e) {
          console.error("[Interview] Error parsing WS message:", e);
        }
      };

      socket.onerror = (err) => {
        console.error("[Interview] WebSocket error:", err);
        setStatus("error");
        setErrorMessage("Failed to connect to the live interview server.");
      };

      socket.onclose = () => {
        console.log("[Interview] WebSocket closed");
      };

      // 4. Start visualizer animation loop
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
    return () => {
      cleanup();
    };
  }, []);

  function cleanup() {
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
    setStatus("ending");
    cleanup();
    navigate(`/result/${interviewId}`);
  }

  const aiSpeaking = aiLevel > 0.05 && aiLevel >= userLevel;
  const userSpeaking = userLevel > 0.05 && userLevel > aiLevel;

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground select-none">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span
              className={
                status === "live"
                  ? "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
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
                  : status === "connecting"
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
              : status === "ending"
              ? "Generating Evaluation…"
              : status === "error"
              ? "Connection Error"
              : "Interview in progress"}
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
                level={userLevel}
                speaking={userSpeaking}
                label="You"
                sublabel={userSpeaking ? "Speaking" : "Microphone active"}
                icon={User}
                accent="emerald"
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
            ? "Tip: Speak naturally into your mic and interrupt anytime."
            : "Use headphones for the best audio experience."}
        </div>

        {status === "live" && (
          <Button
            variant="destructive"
            size="lg"
            onClick={endInterview}
            className="gap-2 rounded-full px-6 shadow-md"
          >
            <PhoneOff className="size-4" />
            End interview
          </Button>
        )}
      </footer>
    </main>
  );
}
