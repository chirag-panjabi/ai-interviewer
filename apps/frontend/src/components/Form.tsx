import { useState, useRef, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Github,
  Loader2,
  Mic,
  CheckCircle2,
  Circle,
  Sparkles,
  Globe,
  Server,
  Palette,
  Layers,
  Binary,
  Users,
  Cloud,
  Brain,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ExperienceLevel = "JUNIOR" | "MID" | "SENIOR";

type InterviewTrack =
  | "FULLSTACK_GENERAL"
  | "BACKEND"
  | "FRONTEND"
  | "SYSTEM_DESIGN"
  | "DSA"
  | "BEHAVIORAL"
  | "DEVOPS_CLOUD"
  | "ML_AI";

const EXPERIENCE_LEVELS: Array<{
  id: ExperienceLevel;
  label: string;
  sublabel: string;
  badge: string;
}> = [
  {
    id: "JUNIOR",
    label: "Junior",
    sublabel: "0-2 years exp",
    badge: "🌱 Entry",
  },
  {
    id: "MID",
    label: "Mid-Level",
    sublabel: "2-5 years exp",
    badge: "🔧 Standard",
  },
  {
    id: "SENIOR",
    label: "Senior / Lead",
    sublabel: "5+ years exp",
    badge: "🏗️ Advanced",
  },
];

const TRACKS: Array<{
  id: InterviewTrack;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "FULLSTACK_GENERAL",
    title: "Full-Stack General",
    description: "APIs, Frontend, Database & State",
    icon: Globe,
  },
  {
    id: "BACKEND",
    title: "Backend Engineering",
    description: "APIs, Concurrency, Caching & DBs",
    icon: Server,
  },
  {
    id: "FRONTEND",
    title: "Frontend Engineering",
    description: "Components, Rendering & Web Vitals",
    icon: Palette,
  },
  {
    id: "SYSTEM_DESIGN",
    title: "System Design",
    description: "High-Scale Topologies & Resilience",
    icon: Layers,
  },
  {
    id: "DSA",
    title: "DSA & Algorithms",
    description: "Problem Solving & Big-O Complexity",
    icon: Binary,
  },
  {
    id: "BEHAVIORAL",
    title: "Behavioral & Leadership",
    description: "STAR Method, Conflict & Ownership",
    icon: Users,
  },
  {
    id: "DEVOPS_CLOUD",
    title: "DevOps & Cloud",
    description: "CI/CD, Kubernetes, IaC & Reliability",
    icon: Cloud,
  },
  {
    id: "ML_AI",
    title: "ML & AI Engineering",
    description: "RAG Systems, Embeddings & Pipelines",
    icon: Brain,
  },
];

export function Form() {
  const [github, setGithub] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("MID");
  const [track, setTrack] = useState<InterviewTrack>("FULLSTACK_GENERAL");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const apiIdRef = useRef<string | null>(null);
  const minTimeElapsedRef = useRef(false);

  const selectedTrackObj = TRACKS.find((t) => t.id === track);
  const selectedLevelObj = EXPERIENCE_LEVELS.find((l) => l.id === experienceLevel);

  const loadingSteps = [
    "Fetching GitHub profile & public repositories...",
    "Analyzing project architecture & code history...",
    `Calibrating ${selectedLevelObj?.label || "Mid-Level"} ${selectedTrackObj?.title || "Full-Stack"} persona...`,
    "Preparing live audio interview room...",
  ];

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
        experienceLevel,
        track,
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
    <main className="flex min-h-screen w-screen items-center justify-center overflow-y-auto px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Mic className="size-3.5 text-primary" />
          Live Voice Technical Screening
        </span>

        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
          AI Technical Interviewer
        </h1>
        <p className="mt-3 max-w-lg text-balance text-sm text-muted-foreground sm:text-base">
          Practice realistic 1-on-1 technical screens tailored to your domain and seniority. Alex adapts difficulty dynamically and delivers instant rubric evaluation.
        </p>

        {/* Step 1: Target Experience Level Baseline */}
        <div className="mt-8 w-full text-left">
          <div className="mb-2.5 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Select Experience Level
            </label>
            <span className="text-[11px] text-muted-foreground/80">
              Sets starting difficulty baseline
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {EXPERIENCE_LEVELS.map((lvl) => {
              const isSelected = experienceLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setExperienceLevel(lvl.id)}
                  className={cn(
                    "relative flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                      : "border-border/70 bg-card/40 hover:border-border hover:bg-card/70",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {lvl.label}
                    </span>
                    {isSelected && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    {lvl.sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Interview Track */}
        <div className="mt-6 w-full text-left">
          <div className="mb-2.5 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Choose Interview Track
            </label>
            <span className="text-[11px] text-muted-foreground/80">
              8 specialized domain tracks
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {TRACKS.map((t) => {
              const isSelected = track === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setTrack(t.id)}
                  className={cn(
                    "relative flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                      : "border-border/70 bg-card/40 hover:border-border hover:bg-card/70",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex w-full items-center justify-between mb-2">
                    <div
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg border",
                        isSelected
                          ? "border-primary/40 bg-primary/20 text-primary"
                          : "border-border/60 bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    {isSelected && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground line-clamp-1">
                      {t.title}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                      {t.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Enter GitHub Profile & Launch */}
        <div className="mt-6 w-full text-left">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            3. GitHub Profile for Project Context
          </label>
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border bg-card/60 p-2 shadow-sm backdrop-blur transition-all",
              validationError
                ? "border-destructive/80 ring-2 ring-destructive/20"
                : "border-border focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30"
            )}
          >
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
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
            />
            <Button
              disabled={loading}
              onClick={onSubmit}
              size="lg"
              className="shrink-0 gap-2 rounded-lg font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Calibrating
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
                <span>Preparing Your Interview Room</span>
              </div>
              <div className="space-y-2.5">
                {loadingSteps.map((stepText, idx) => {
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
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Alex will greet you verbally once you enter the room. Microphone access is requested on entry.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
