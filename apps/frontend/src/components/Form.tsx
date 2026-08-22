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
  Star,
  Code,
  FolderGit2,
  Plus,
  AlertCircle,
  RefreshCw,
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

interface RepoPreview {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
}

interface ProfilePreview {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  publicReposCount: number;
  repos: RepoPreview[];
}

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

  // GitHub Preview and Selected Repo State
  const [profilePreview, setProfilePreview] = useState<ProfilePreview | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isGeneralDomainOnly, setIsGeneralDomainOnly] = useState(false);
  const [customRepoInput, setCustomRepoInput] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const navigate = useNavigate();
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const apiIdRef = useRef<string | null>(null);
  const minTimeElapsedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedTrackObj = TRACKS.find((t) => t.id === track);
  const selectedLevelObj = EXPERIENCE_LEVELS.find((l) => l.id === experienceLevel);

  const loadingSteps = [
    "Fetching GitHub profile & target project architecture...",
    "Analyzing code structure & dependencies...",
    `Calibrating ${selectedLevelObj?.label || "Mid-Level"} ${selectedTrackObj?.title || "Full-Stack"} persona...`,
    "Preparing live audio interview room...",
  ];

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  function parseInput(value: string): { isValid: boolean; username: string; repo?: string } {
    const trimmed = value.trim();
    if (!trimmed) return { isValid: false, username: "" };

    let cleaned = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^github\.com\//i, "");
    cleaned = cleaned.split("?")[0]!.split("#")[0]!.replace(/\.git$/i, "");
    const parts = cleaned.split("/").filter(Boolean);

    if (parts.length === 0) return { isValid: false, username: "" };
    const username = parts[0]!;
    const isUsernameValid = /^[a-zA-Z0-9_-]+$/.test(username);

    if (!isUsernameValid) return { isValid: false, username: "" };

    const repo = parts.length >= 2 && !["tab", "repositories", "stars"].includes(parts[1]!) ? parts[1] : undefined;
    return { isValid: true, username, repo };
  }

  // Trigger preview fetch on debounced input change or onBlur
  async function triggerPreviewFetch(inputVal: string) {
    const { isValid, username, repo } = parseInput(inputVal);
    if (!isValid || !username) {
      setProfilePreview(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setFetchingPreview(true);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/github-preview`,
        { github: inputVal.trim() },
        { signal: controller.signal }
      );

      const previewData: ProfilePreview = res.data;
      setProfilePreview(previewData);

      // If user pasted a direct repo URL, auto-select that repo
      if (repo) {
        setSelectedRepo(repo);
        setIsGeneralDomainOnly(false);
        setIsCustomMode(false);
      } else if (!selectedRepo && !isGeneralDomainOnly && !isCustomMode && previewData.repos.length > 0) {
        // Default to top starred repo
        setSelectedRepo(previewData.repos[0]?.name || null);
      }
    } catch (err: any) {
      if (axios.isCancel(err)) return;
      console.warn("Could not fetch preview:", err?.message);
    } finally {
      setFetchingPreview(false);
    }
  }

  function handleGithubChange(val: string) {
    setGithub(val);
    if (validationError) setValidationError(null);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      triggerPreviewFetch(val);
    }, 350);
  }

  function validateInput(value: string): boolean {
    const { isValid } = parseInput(value);
    if (!isValid) {
      setValidationError("Please enter a valid GitHub username (e.g. 'torvalds') or repository URL");
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

    // Determine target selected repo (if any)
    let finalSelectedRepo: string | undefined = undefined;
    if (!isGeneralDomainOnly) {
      if (isCustomMode && customRepoInput.trim()) {
        finalSelectedRepo = customRepoInput.trim();
      } else if (selectedRepo) {
        finalSelectedRepo = selectedRepo;
      }
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, {
        github: github.trim(),
        experienceLevel,
        track,
        selectedRepo: finalSelectedRepo,
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

        {/* Step 3: GitHub Profile & Flagship Project Selection */}
        <div className="mt-6 w-full text-left">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              3. GitHub Profile & Project Context
            </label>
            <span className="text-[11px] text-muted-foreground/80">
              Profile or direct repo link
            </span>
          </div>

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
              placeholder="github.com/username or username/repo"
              onChange={(e) => handleGithubChange(e.target.value)}
              onBlur={() => triggerPreviewFetch(github)}
              onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
              disabled={loading}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
            />
            {github.trim() && (
              <button
                type="button"
                onClick={() => triggerPreviewFetch(github)}
                disabled={fetchingPreview || loading}
                title="Scan repositories"
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors mr-1"
              >
                {fetchingPreview ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
              </button>
            )}
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

          {/* Interactive Project / Repository Selector */}
          {(() => {
            const parsed = parseInput(github);
            if (!parsed.isValid || !parsed.username) return null;

            // Loading Skeleton
            if (fetchingPreview && !profilePreview) {
              return (
                <div className="mt-4 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      Scanning GitHub repositories for @{parsed.username}...
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="h-16 rounded-xl border border-border/40 bg-card/20 animate-pulse" />
                    <div className="h-16 rounded-xl border border-border/40 bg-card/20 animate-pulse" />
                  </div>
                </div>
              );
            }

            const hasRepos = profilePreview && profilePreview.repos && profilePreview.repos.length > 0;

            return (
              <div className="mt-4 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FolderGit2 className="size-3.5 text-primary" />
                    {hasRepos
                      ? "Select flagship project for Alex to discuss (or skip):"
                      : `Choose interview focus for @${parsed.username}:`}
                  </span>
                  <div className="flex items-center gap-2">
                    {profilePreview?.name && hasRepos && (
                      <span className="text-[11px] text-foreground/80 font-normal">
                        @{profilePreview.username} ({profilePreview.publicReposCount} repos)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => triggerPreviewFetch(github)}
                      disabled={fetchingPreview || loading}
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <RefreshCw className={cn("size-2.5", fetchingPreview && "animate-spin")} />
                      Scan
                    </button>
                  </div>
                </div>

                {!hasRepos && !fetchingPreview && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left text-[11px] text-muted-foreground">
                    💡 No public repos auto-listed. You can select <strong>General Domain</strong> or specify any public repo below:
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {/* General Domain Screen Option */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsGeneralDomainOnly(true);
                      setIsCustomMode(false);
                      setSelectedRepo(null);
                    }}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                      isGeneralDomainOnly
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                        : "border-border/70 bg-card/40 hover:border-border hover:bg-card/70",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-primary">
                      <Globe className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          General Domain Screen
                        </span>
                        {isGeneralDomainOnly && (
                          <Check className="size-3 text-primary stroke-[3]" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        Skip project questions; launch directly into domain scenarios
                      </p>
                    </div>
                  </button>

                  {/* Candidate Public Repositories (Top 5) */}
                  {hasRepos &&
                    profilePreview.repos.slice(0, 5).map((r) => {
                      const isSelected = !isGeneralDomainOnly && !isCustomMode && selectedRepo === r.name;
                      return (
                        <button
                          key={r.name}
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setSelectedRepo(r.name);
                            setIsGeneralDomainOnly(false);
                            setIsCustomMode(false);
                          }}
                          className={cn(
                            "flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                              : "border-border/70 bg-card/40 hover:border-border hover:bg-card/70",
                            loading && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-foreground/70">
                            <Code className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {r.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {r.stars > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium">
                                    <Star className="size-2.5 fill-amber-400" />
                                    {r.stars}
                                  </span>
                                )}
                                {isSelected && (
                                  <Check className="size-3 text-primary stroke-[3]" />
                                )}
                              </div>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                              {r.language && (
                                <span className="font-medium text-foreground/70">
                                  {r.language}
                                </span>
                              )}
                              <span className="truncate">
                                {r.description || "No description provided"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                  {/* Custom Repo Option */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsCustomMode(true);
                      setIsGeneralDomainOnly(false);
                      setSelectedRepo(null);
                    }}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                      isCustomMode
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                        : "border-border/70 bg-card/40 hover:border-border hover:bg-card/70",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-primary">
                      <Plus className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {hasRepos ? "Other Public Repo..." : "Specific Repo Name..."}
                        </span>
                        {isCustomMode && (
                          <Check className="size-3 text-primary stroke-[3]" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        Enter any specific repository name
                      </p>
                    </div>
                  </button>
                </div>

                {/* Inline input if Custom Repo is chosen */}
                {isCustomMode && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/50 bg-card/80 p-1.5 animate-in fade-in duration-150">
                    <span className="pl-2 text-xs font-medium text-muted-foreground">
                      Repo Name:
                    </span>
                    <Input
                      value={customRepoInput}
                      placeholder="e.g. ai-interviewer or my-app"
                      onChange={(e) => setCustomRepoInput(e.target.value)}
                      disabled={loading}
                      className="h-8 border-0 bg-transparent text-xs focus-visible:ring-0"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            );
          })()}

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
