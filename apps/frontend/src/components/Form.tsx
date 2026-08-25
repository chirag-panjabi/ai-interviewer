/* Hallmark · genre: modern-minimal · macrostructure: Workbench · theme: custom-carbon · states: default · hover · focus · active · disabled · loading */

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "../lib/config";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Github,
  Loader2,
  Mic,
  Globe,
  Server,
  Palette,
  Layers,
  Binary,
  Users,
  Cloud,
  Brain,
  Check,
  Code2,
  RefreshCw,
  Key,
  Radio,
  Sparkles,
  ShieldCheck,
  Plus,
  Star,
  FolderGit2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ApiKeyModal } from "./ApiKeyModal";
import { getCustomApiKey, hasCustomApiKey, maskApiKey } from "../lib/apiKeyStorage";

type ExperienceLevel = "JUNIOR" | "MID" | "SENIOR";

type InterviewTrack =
  | "FULL_MOCK_SCREEN"
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
  rateLimited?: boolean;
  error?: string | null;
}

const EXPERIENCE_LEVELS: Array<{
  id: ExperienceLevel;
  label: string;
  sublabel: string;
}> = [
  {
    id: "JUNIOR",
    label: "Junior",
    sublabel: "0–2 yrs exp",
  },
  {
    id: "MID",
    label: "Mid-Level",
    sublabel: "2–5 yrs exp",
  },
  {
    id: "SENIOR",
    label: "Senior / Lead",
    sublabel: "5+ yrs exp",
  },
];

const FULL_MOCK_TRACK = {
  id: "FULL_MOCK_SCREEN" as const,
  title: "Comprehensive Full Mock Screen",
  badge: "360° Simulation",
  description: "Intro Story · Flagship Project Deep-Dive · Live Tech Scenario · Behavioral · Reverse Q&A",
  icon: Sparkles,
};

const DOMAIN_TRACKS: Array<{
  id: InterviewTrack;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "FULLSTACK_GENERAL",
    title: "Full-Stack",
    description: "APIs, Frontend & DBs",
    icon: Globe,
  },
  {
    id: "BACKEND",
    title: "Backend",
    description: "Concurrency, APIs & DBs",
    icon: Server,
  },
  {
    id: "FRONTEND",
    title: "Frontend",
    description: "React, Web Vitals & UI",
    icon: Palette,
  },
  {
    id: "SYSTEM_DESIGN",
    title: "System Design",
    description: "Distributed Topologies",
    icon: Layers,
  },
  {
    id: "DSA",
    title: "DSA & Algorithms",
    description: "Problem Solving & Big-O",
    icon: Binary,
  },
  {
    id: "ML_AI",
    title: "ML & AI Systems",
    description: "RAG, Models & Pipelines",
    icon: Brain,
  },
  {
    id: "DEVOPS_CLOUD",
    title: "DevOps & Cloud",
    description: "CI/CD, K8s & Infra",
    icon: Cloud,
  },
  {
    id: "BEHAVIORAL",
    title: "Behavioral & Culture",
    description: "STAR Method & Leadership",
    icon: Users,
  },
];

const ALL_TRACKS = [FULL_MOCK_TRACK, ...DOMAIN_TRACKS];

export function Form() {
  const [github, setGithub] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("MID");
  const [track, setTrack] = useState<InterviewTrack>("FULL_MOCK_SCREEN");
  const [contextMode, setContextMode] = useState<"general" | "github">("general");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customKeyActive, setCustomKeyActive] = useState(() => hasCustomApiKey());

  const [profilePreview, setProfilePreview] = useState<ProfilePreview | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isCustomRepoMode, setIsCustomRepoMode] = useState(false);
  const [customRepoInput, setCustomRepoInput] = useState("");

  const navigate = useNavigate();
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const apiIdRef = useRef<string | null>(null);
  const minTimeElapsedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedTrackObj = ALL_TRACKS.find((t) => t.id === track);
  const selectedLevelObj = EXPERIENCE_LEVELS.find((l) => l.id === experienceLevel);

  const loadingSteps = [
    contextMode === "github" && github.trim()
      ? "Inspecting GitHub architecture context..."
      : "Initializing track evaluation matrix...",
    `Calibrating ${selectedLevelObj?.label || "Mid-Level"} ${selectedTrackObj?.title || "Technical"} persona...`,
    "Opening low-latency audio interview room...",
  ];

  useEffect(() => {
    axios.get(`${BACKEND_URL}/health`, { timeout: 10000 }).catch(() => {});

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlUser = searchParams.get("user") || searchParams.get("github") || searchParams.get("username");
      const urlTrack = searchParams.get("track");
      const urlLevel = searchParams.get("level") || searchParams.get("exp");

      if (urlTrack && ALL_TRACKS.some((t) => t.id === urlTrack)) {
        setTrack(urlTrack as InterviewTrack);
      }
      if (urlLevel && EXPERIENCE_LEVELS.some((l) => l.id === urlLevel.toUpperCase())) {
        setExperienceLevel(urlLevel.toUpperCase() as ExperienceLevel);
      }
      if (urlUser && urlUser.trim()) {
        const cleanUser = urlUser.trim();
        setContextMode("github");
        setGithub(cleanUser);
        triggerPreviewFetch(cleanUser);
      }
    } catch {
      // ignore
    }

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

  async function triggerPreviewFetch(inputVal: string) {
    const { isValid, username, repo } = parseInput(inputVal);
    if (!isValid || !username) {
      setProfilePreview(null);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setFetchingPreview(true);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/github-preview`,
        { github: inputVal.trim() },
        { signal: controller.signal, timeout: 25000 }
      );

      const previewData: ProfilePreview = res.data;
      setProfilePreview(previewData);

      if (repo) {
        setSelectedRepo(repo);
        setIsCustomRepoMode(false);
      } else if (!selectedRepo && !isCustomRepoMode && previewData.repos?.length > 0) {
        setSelectedRepo(previewData.repos[0]?.name || "__ALL__");
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
    if (contextMode === "general") {
      setValidationError(null);
      return true;
    }

    if (!value.trim()) {
      setValidationError("Please enter a GitHub username or repository link, or switch to Standard Practice.");
      return false;
    }

    const { isValid } = parseInput(value);
    if (!isValid) {
      setValidationError("Please enter a valid GitHub username (e.g. 'torvalds') or repository link");
      return false;
    }
    setValidationError(null);
    return true;
  }

  function tryNavigate(interviewId: string) {
    apiIdRef.current = interviewId;
    if (minTimeElapsedRef.current) {
      navigate(`/interview/${interviewId}`);
    }
  }

  async function onSubmit() {
    if (loading) return;
    if (!validateInput(github)) return;

    setLoading(true);
    setCurrentStep(0);
    apiIdRef.current = null;
    minTimeElapsedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const TOTAL_ANIMATION_TIME = 2400;
    const STEP_INTERVAL = TOTAL_ANIMATION_TIME / loadingSteps.length;

    for (let i = 1; i < loadingSteps.length; i++) {
      const t = setTimeout(() => {
        setCurrentStep(i);
      }, i * STEP_INTERVAL);
      timersRef.current.push(t);
    }

    const minTimer = setTimeout(() => {
      minTimeElapsedRef.current = true;
      if (apiIdRef.current) {
        navigate(`/interview/${apiIdRef.current}`);
      }
    }, TOTAL_ANIMATION_TIME);
    timersRef.current.push(minTimer);

    try {
      const customKey = getCustomApiKey();

      let finalSelectedRepo: string | null = null;
      if (contextMode === "github") {
        if (isCustomRepoMode && customRepoInput.trim()) {
          finalSelectedRepo = customRepoInput.trim();
        } else if (selectedRepo && selectedRepo !== "__ALL__") {
          finalSelectedRepo = selectedRepo;
        }
      }

      const finalGithub = contextMode === "github" && github.trim() ? github.trim() : "candidate";

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/pre-interview`,
        {
          github: finalGithub,
          experienceLevel,
          track,
          selectedRepo: finalSelectedRepo,
        },
        {
          timeout: 35000,
          headers: customKey ? { "x-gemini-api-key": customKey } : {},
        }
      );
      tryNavigate(response.data.id);
    } catch (e: any) {
      timersRef.current.forEach(clearTimeout);
      setLoading(false);
      setCurrentStep(0);

      if (e?.response?.status === 429) {
        toast.error("Daily demo limit reached. Enter your Gemini key to practice without limits!");
        setIsApiKeyModalOpen(true);
        return;
      }

      toast.error(e?.response?.data?.message || "Something went wrong starting your interview. Please try again.");
    }
  }

  return (
    <main className="w-full max-w-full min-h-screen px-4 py-8 sm:px-6 md:py-12 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-3xl">
        {/* Minimal Hallmark Top Nav */}
        <header className="mb-8 flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                AI INTERVIEWER
              </span>
            </div>
            <span className="hidden sm:inline-block h-3.5 w-px bg-border/60" />
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Radio className="size-3 text-primary" />
              Gemini Live Voice Engine
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsApiKeyModalOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                customKeyActive
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                  : "border-border/80 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <Key className={cn("size-3.5", customKeyActive ? "text-emerald-400" : "text-primary")} />
              {customKeyActive ? (
                <span className="font-mono">BYOK ({maskApiKey(getCustomApiKey())})</span>
              ) : (
                <span>Gemini Key (Optional)</span>
              )}
            </button>
          </div>
        </header>

        {/* Clean Hero */}
        <section className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            AI Technical Interviewer
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Practice realistic, interactive voice screens with Alex. Calibrated to your seniority and tech stack with instant rubric evaluation.
          </p>
        </section>

        {/* Unified Studio Card */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 sm:p-7 shadow-sm space-y-6 text-left">
          
          {/* 1. Track Selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              1. Choose Interview Mode & Track
            </label>

            {/* Featured Comprehensive Full Mock Banner */}
            <button
              type="button"
              role="radio"
              aria-checked={track === "FULL_MOCK_SCREEN"}
              disabled={loading}
              onClick={() => setTrack("FULL_MOCK_SCREEN")}
              className={cn(
                "w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer mb-3 relative",
                track === "FULL_MOCK_SCREEN"
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                  : "border-border/70 bg-background/60 hover:border-border hover:bg-background/90",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">
                      Comprehensive Full Mock Screen
                    </span>
                    <span className="rounded bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider">
                      Full 360° Loop
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Intro Story · Flagship Project Deep-Dive · Live Tech Scenario · Behavioral · Reverse Q&A
                  </p>
                </div>
              </div>
              {track === "FULL_MOCK_SCREEN" && (
                <Check className="size-4 text-primary stroke-[3] shrink-0 ml-2" />
              )}
            </button>

            {/* Specialized Domain Track Pills (2x4 Grid) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Or Target a Specific Technical Track:
              </span>
              <div role="radiogroup" aria-label="Select Focus Track" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DOMAIN_TRACKS.map((t) => {
                  const isSelected = track === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={loading}
                      onClick={() => setTrack(t.id)}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer relative",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <Icon className={cn("size-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                        {isSelected && <Check className="size-3 text-primary stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold text-foreground leading-tight">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {t.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Seniority Level */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              2. Seniority Level
            </label>
            <div role="radiogroup" aria-label="Select Seniority Baseline" className="grid grid-cols-3 gap-2">
              {EXPERIENCE_LEVELS.map((lvl) => {
                const isSelected = experienceLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={loading}
                    onClick={() => setExperienceLevel(lvl.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {lvl.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {lvl.sublabel}
                      </span>
                    </div>
                    {isSelected && <Check className="size-3 text-primary stroke-[3] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Interview Context (Progressive Disclosure) */}
          <div className="pt-2 border-t border-border/40">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              3. Interview Context (Optional)
            </label>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setContextMode("general");
                  setSelectedRepo(null);
                  setIsCustomRepoMode(false);
                  setValidationError(null);
                }}
                disabled={loading}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer",
                  contextMode === "general"
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80"
                )}
              >
                <Sparkles className={cn("size-4 shrink-0", contextMode === "general" ? "text-primary" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Standard Practice</span>
                    {contextMode === "general" && <Check className="size-3 text-primary stroke-[3]" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">Core domain concepts</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContextMode("github");
                  setValidationError(null);
                }}
                disabled={loading}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer",
                  contextMode === "github"
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80"
                )}
              >
                <Github className={cn("size-4 shrink-0", contextMode === "github" ? "text-primary" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Drill GitHub Repo</span>
                    {contextMode === "github" && <Check className="size-3 text-primary stroke-[3]" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">Architecture & code</span>
                </div>
              </button>
            </div>

            {/* GitHub Input & Repo Selector when contextMode === "github" */}
            {contextMode === "github" && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border/80 bg-background/60 animate-in fade-in duration-200">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 transition-all",
                    validationError
                      ? "border-destructive ring-1 ring-destructive/30"
                      : "border-border/80 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40"
                  )}
                >
                  <Github className="size-4 text-muted-foreground shrink-0" />
                  <Input
                    value={github}
                    aria-label="GitHub username or repository URL"
                    placeholder="e.g. username or github.com/username/repo"
                    onChange={(e) => handleGithubChange(e.target.value)}
                    onBlur={() => triggerPreviewFetch(github)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
                    disabled={loading}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-xs font-mono h-8 p-0"
                    autoFocus={!github}
                  />
                  {github.trim() && (
                    <button
                      type="button"
                      onClick={() => triggerPreviewFetch(github)}
                      disabled={fetchingPreview || loading}
                      aria-label="Scan GitHub repositories"
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {fetchingPreview ? (
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {validationError && (
                  <p className="text-xs font-medium text-destructive">
                    {validationError}
                  </p>
                )}

                {/* Quick Demos */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono text-[10px] uppercase">Try Quick Demo:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGithub("torvalds");
                      triggerPreviewFetch("torvalds");
                    }}
                    className="rounded border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-mono hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    torvalds
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGithub("facebook");
                      triggerPreviewFetch("facebook");
                    }}
                    className="rounded border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-mono hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    facebook
                  </button>
                </div>

                {/* Scanned Repositories List + All Profile + Custom Repo */}
                {profilePreview && (
                  <div className="pt-2 border-t border-border/40 space-y-2">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Select Architecture Focus:
                    </span>

                    {/* General Profile (All Repos) option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRepo("__ALL__");
                        setIsCustomRepoMode(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                        !isCustomRepoMode && selectedRepo === "__ALL__"
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 className="size-3.5 text-primary shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-foreground block">
                            General Profile Portfolio
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Discuss architecture across all public repositories ({profilePreview.publicReposCount} total)
                          </span>
                        </div>
                      </div>
                      {!isCustomRepoMode && selectedRepo === "__ALL__" && (
                        <Check className="size-3 text-primary stroke-[3] shrink-0" />
                      )}
                    </button>

                    {/* Scanned Repositories Grid */}
                    {profilePreview.repos && profilePreview.repos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {profilePreview.repos.slice(0, 6).map((r) => {
                          const isSelected = !isCustomRepoMode && selectedRepo === r.name;
                          return (
                            <button
                              key={r.name}
                              type="button"
                              onClick={() => {
                                setSelectedRepo(r.name);
                                setIsCustomRepoMode(false);
                              }}
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-sm"
                                  : "border-border/60 bg-background hover:border-border"
                              )}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="text-xs font-semibold font-mono text-foreground block truncate">
                                  {r.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {r.language || "Repository"} {r.stars > 0 && `· ${r.stars}★`}
                                </span>
                              </div>
                              {isSelected && <Check className="size-3 text-primary stroke-[3] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Custom Repository Mode Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomRepoMode(true);
                        setSelectedRepo(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                        isCustomRepoMode
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Plus className="size-3.5 text-primary shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-foreground block">
                            Target Other / Specific Repository...
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Specify any other project name from this profile
                          </span>
                        </div>
                      </div>
                      {isCustomRepoMode && <Check className="size-3 text-primary stroke-[3] shrink-0" />}
                    </button>

                    {isCustomRepoMode && (
                      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-primary/50 bg-background p-1.5 animate-in fade-in">
                        <span className="pl-2 text-xs font-mono text-muted-foreground shrink-0">
                          Repo:
                        </span>
                        <Input
                          value={customRepoInput}
                          placeholder="e.g. my-project-name or distributed-cache"
                          onChange={(e) => setCustomRepoInput(e.target.value)}
                          disabled={loading}
                          className="h-8 border-0 bg-transparent text-xs font-mono focus-visible:ring-0 p-0"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="pt-4 border-t border-border/40 space-y-3">
            <Button
              disabled={loading}
              onClick={onSubmit}
              size="lg"
              className="w-full gap-2 rounded-xl font-semibold text-sm py-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Calibrating Audio Room...
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  Start Live Voice Interview ({selectedLevelObj?.label} · {selectedTrackObj?.title})
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            {/* Stepped Loading Animation */}
            {loading && (
              <div className="pt-2 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  {loadingSteps.map((stepText, idx) => {
                    const isDone = currentStep > idx;
                    const isCurrent = currentStep === idx;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-2 text-xs transition-opacity duration-200",
                          isDone
                            ? "text-emerald-400"
                            : isCurrent
                            ? "text-foreground font-medium"
                            : "text-muted-foreground/40"
                        )}
                      >
                        {isDone ? (
                          <Check className="size-3 text-emerald-400 stroke-[3] shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="size-3 animate-spin text-primary shrink-0" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-border shrink-0 ml-1 mr-0.5" />
                        )}
                        <span>{stepText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  Zero credentials stored. Encrypted live WebSocket audio.
                </span>
                <span className="hidden sm:inline-block">
                  Mic prompted on entry
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Colophon Footer */}
        <footer className="mt-8 text-center text-xs text-muted-foreground/70 pb-4">
          <p>
            AI Technical Interviewer · Built for High-Signal Engineering Evaluations
          </p>
        </footer>
      </div>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyChange={(hasKey) => setCustomKeyActive(hasKey)}
      />
    </main>
  );
}
