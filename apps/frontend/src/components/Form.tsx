import { useState, useRef, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useNavigate } from "react-router";
import { ArrowRight, Github, Loader2, Mic, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const LOADING_STEPS = [
  "Fetching GitHub profile & public repositories...",
  "Analyzing project architecture & README files...",
  "Calibrating Principal Engineer interview persona...",
  "Preparing live audio interview room...",
];

export function Form() {
  const [github, setGithub] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const apiIdRef = useRef<string | null>(null);
  const minTimeElapsedRef = useRef(false);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  function validateInput(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError("Please enter your GitHub username or profile URL");
      return false;
    }

    // Must be either a valid GitHub URL or a valid username
    const isGithubUrl = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?.*$/i.test(trimmed);
    const isUsername = /^[a-zA-Z0-9_-]+$/.test(trimmed);

    if (!isGithubUrl && !isUsername) {
      setValidationError("Please enter a valid GitHub username (e.g. 'torvalds') or URL");
      return false;
    }

    setValidationError(null);
    return true;
  }

  function tryNavigate(interviewId: string) {
    if (minTimeElapsedRef.current) {
      navigate(`/interview/${interviewId}`);
    } else {
      apiIdRef.current = interviewId;
    }
  }

  async function onSubmit() {
    if (!validateInput(github)) {
      return;
    }

    setLoading(true);
    setCurrentStep(0);
    minTimeElapsedRef.current = false;
    apiIdRef.current = null;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Schedule progressive step animations
    const t1 = setTimeout(() => setCurrentStep(1), 1000);
    const t2 = setTimeout(() => setCurrentStep(2), 2200);
    const t3 = setTimeout(() => setCurrentStep(3), 3200);
    const tMin = setTimeout(() => {
      minTimeElapsedRef.current = true;
      if (apiIdRef.current) {
        navigate(`/interview/${apiIdRef.current}`);
      }
    }, 3000);

    timersRef.current.push(t1, t2, t3, tMin);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, {
        github: github.trim(),
      });
      tryNavigate(response.data.id);
    } catch (e: any) {
      timersRef.current.forEach(clearTimeout);
      toast.error(e?.response?.data?.message || "Something went wrong starting your interview. Please try again.");
      setLoading(false);
      setCurrentStep(0);
    }
  }

  return (
    <main className="flex min-h-screen w-screen items-center justify-center overflow-y-auto px-6 py-12">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Mic className="size-3.5 text-primary" />
          Voice-based technical screening
        </span>

        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          AI Technical Interviewer
        </h1>
        <p className="mt-4 max-w-md text-balance text-base text-muted-foreground">
          Enter your GitHub profile to start a live, voice-driven screening interview with Alex. Discuss real architecture, trade-offs, and receive an instant scorecard.
        </p>

        <div className="mt-8 w-full">
          <div className={cn(
            "flex items-center gap-2 rounded-xl border bg-card/60 p-2 shadow-sm backdrop-blur transition-all",
            validationError ? "border-destructive/80 ring-2 ring-destructive/20" : "border-border focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30"
          )}>
            <div className="flex items-center pl-2 text-muted-foreground">
              <Github className="size-5" />
            </div>
            <Input
              value={github}
              placeholder="https://github.com/username or username"
              onChange={(e) => {
                setGithub(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
              disabled={loading}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              disabled={loading}
              onClick={onSubmit}
              size="lg"
              className="shrink-0 gap-2 rounded-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  Start interview
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {validationError && (
            <p className="mt-2 text-left text-xs font-medium text-destructive">
              {validationError}
            </p>
          )}

          {/* Animated Ingestion Stepper */}
          {loading && (
            <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-5 text-left backdrop-blur animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 mb-3">
                <Sparkles className="size-3.5 text-primary animate-pulse" />
                <span>Preparing Your Interview Session</span>
              </div>
              <div className="space-y-2.5">
                {LOADING_STEPS.map((stepText, idx) => {
                  const isDone = currentStep > idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2.5 text-xs transition-colors duration-200",
                        isDone
                          ? "text-foreground font-medium"
                          : isCurrent
                          ? "text-primary font-medium"
                          : "text-muted-foreground/60"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="size-4 shrink-0 text-primary animate-spin" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground/30" />
                      )}
                      <span>{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && (
            <p className="mt-3 text-xs text-muted-foreground">
              We'll request microphone access once you enter the interview room.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
