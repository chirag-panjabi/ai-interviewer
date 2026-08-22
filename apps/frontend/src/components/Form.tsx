/* Hallmark · genre: modern-minimal · macrostructure: Workbench · theme: custom-carbon · states: default · hover · focus · active · disabled · loading */

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
  Code2,
  FolderGit2,
  Plus,
  RefreshCw,
  Key,
  Sliders,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiKeyModal } from "./ApiKeyModal";
import { getCustomApiKey, hasCustomApiKey, maskApiKey } from "@/lib/apiKeyStorage";

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
  rateLimited?: boolean;
  error?: string | null;
}

const EXPERIENCE_LEVELS: Array<{
  id: ExperienceLevel;
  label: string;
  sublabel: string;
  tag: string;
}> = [
  {
    id: "JUNIOR",
    label: "Junior",
    sublabel: "0–2 yrs exp",
    tag: "Entry",
  },
  {
    id: "MID",
    label: "Mid-Level",
    sublabel: "2–5 yrs exp",
    tag: "Standard",
  },
  {
    id: "SENIOR",
    label: "Senior / Lead",
    sublabel: "5+ yrs exp",
    tag: "Staff",
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
    description: "APIs, Frontend & Architecture",
    icon: Globe,
  },
  {
    id: "BACKEND",
    title: "Backend Engineering",
    description: "Concurrency, DBs & Caching",
    icon: Server,
  },
  {
    id: "FRONTEND",
    title: "Frontend Engineering",
    description: "Web Vitals & Performance",
    icon: Palette,
  },
  {
    id: "SYSTEM_DESIGN",
    title: "System Design",
    description: "High-Scale Topologies",
    icon: Layers,
  },
  {
    id: "DSA",
    title: "DSA & Algorithms",
    description: "Problem Solving & Big-O",
    icon: Binary,
  },
  {
    id: "BEHAVIORAL",
    title: "Behavioral & Culture",
    description: "STAR Method & Leadership",
    icon: Users,
  },
  {
    id: "DEVOPS_CLOUD",
    title: "DevOps & Cloud",
    description: "CI/CD, K8s & Infra as Code",
    icon: Cloud,
  },
  {
    id: "ML_AI",
    title: "ML & AI Engineering",
    description: "RAG, Models & Pipelines",
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

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customKeyActive, setCustomKeyActive] = useState(() => hasCustomApiKey());

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
    "Fetching GitHub architecture & repository context...",
    "Analyzing dependencies & technical topology...",
    `Calibrating ${selectedLevelObj?.label || "Mid-Level"} ${selectedTrackObj?.title || "Full-Stack"} persona...`,
    "Opening low-latency audio interview room...",
  ];

  useEffect(() => {
    axios.get(`${BACKEND_URL}/health`, { timeout: 10000 }).catch(() => {});

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlUser = searchParams.get("user") || searchParams.get("github") || searchParams.get("username");
      const urlTrack = searchParams.get("track");
      const urlLevel = searchParams.get("level") || searchParams.get("exp");

      if (urlTrack && TRACKS.some((t) => t.id === urlTrack)) {
        setTrack(urlTrack as InterviewTrack);
      }
      if (urlLevel && EXPERIENCE_LEVELS.some((l) => l.id === urlLevel.toUpperCase())) {
        setExperienceLevel(urlLevel.toUpperCase() as ExperienceLevel);
      }
      if (urlUser && urlUser.trim()) {
        const cleanUser = urlUser.trim();
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
        setIsGeneralDomainOnly(false);
        setIsCustomMode(false);
      } else if (!selectedRepo && !isGeneralDomainOnly && !isCustomMode && previewData.repos?.length > 0) {
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

    const TOTAL_ANIMATION_TIME = 3000;
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
      if (isGeneralDomainOnly) {
        finalSelectedRepo = null;
      } else if (isCustomMode && customRepoInput.trim()) {
        finalSelectedRepo = customRepoInput.trim();
      } else if (selectedRepo) {
        finalSelectedRepo = selectedRepo;
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/pre-interview`,
        {
          github: github.trim(),
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
      <div className="mx-auto w-full max-w-5xl">
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
              title="Configure custom Gemini API key for unlimited practice"
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

        <section className="mb-8 text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            AI Technical Interviewer
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Practice realistic, interactive voice screens calibrated to your seniority and tech stack.
            Alex adapts difficulty on the fly, drills deep on architecture, and generates an instant rubric scorecard.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-border/80 bg-card/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground">
                  <Sliders className="size-3.5 text-primary" />
                  Seniority Baseline
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Calibrates scenario depth
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {EXPERIENCE_LEVELS.map((lvl) => {
                  const isSelected = experienceLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      disabled={loading}
                      onClick={() => setExperienceLevel(lvl.id)}
                      className={cn(
                        "flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-foreground">
                          {lvl.label}
                        </span>
                        {isSelected && (
                          <Check className="size-3 text-primary stroke-[3]" />
                        )}
                      </div>
                      <span className="mt-1 text-[10px] text-muted-foreground">
                        {lvl.sublabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground">
                  <Layers className="size-3.5 text-primary" />
                  Interview Focus Track
                </span>
                <span className="text-[11px] text-muted-foreground">
                  8 Specialized Domains
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border",
                          isSelected
                            ? "border-primary/40 bg-primary/20 text-primary"
                            : "border-border/60 bg-muted/30 text-muted-foreground"
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {t.title}
                          </span>
                          {isSelected && (
                            <Check className="size-3 text-primary stroke-[3] shrink-0 ml-1" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                          {t.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-border/80 bg-card/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground">
                  <Github className="size-3.5 text-primary" />
                  GitHub Profile Context
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Username or repo
                </span>
              </div>

              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border bg-background/80 p-2 transition-all",
                  validationError
                    ? "border-destructive ring-1 ring-destructive/30"
                    : "border-border/80 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40"
                )}
              >
                <div className="pl-1.5 text-muted-foreground">
                  <Github className="size-4" />
                </div>
                <Input
                  value={github}
                  placeholder="github.com/username or repo link"
                  onChange={(e) => handleGithubChange(e.target.value)}
                  onBlur={() => triggerPreviewFetch(github)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
                  disabled={loading}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-xs font-mono"
                />
                {github.trim() && (
                  <button
                    type="button"
                    onClick={() => triggerPreviewFetch(github)}
                    disabled={fetchingPreview || loading}
                    title="Scan repositories"
                    className="p-1 rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors mr-0.5"
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
                <p className="mt-2 text-xs font-medium text-destructive">
                  {validationError}
                </p>
              )}

              {profilePreview && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {profilePreview.avatarUrl && (
                      <img
                        src={profilePreview.avatarUrl}
                        alt={profilePreview.username}
                        className="size-5 rounded-full border border-border shrink-0"
                      />
                    )}
                    <span className="font-semibold text-foreground truncate">
                      @{profilePreview.username}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
                    {profilePreview.publicReposCount} repos
                  </span>
                </div>
              )}

              {(() => {
                const parsed = parseInput(github);
                if (!parsed.isValid || !parsed.username) {
                  return (
                    <div className="mt-4 rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                      Enter a GitHub profile to inspect public repositories or target project architecture.
                    </div>
                  );
                }

                const hasRepos = Boolean(profilePreview?.repos && profilePreview.repos.length > 0);

                return (
                  <div className={cn("mt-4 space-y-2", fetchingPreview && "opacity-70")}>
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
                      <span className="flex items-center gap-1.5">
                        <FolderGit2 className="size-3 text-primary" />
                        Target Architecture Focus:
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setIsGeneralDomainOnly(true);
                        setIsCustomMode(false);
                        setSelectedRepo(null);
                      }}
                      className={cn(
                        "w-full flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                        isGeneralDomainOnly
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Globe className="size-3.5 mt-0.5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            General Domain Screen
                          </span>
                          {isGeneralDomainOnly && (
                            <Check className="size-3 text-primary stroke-[3]" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Skip project specifics; evaluate core track concepts directly
                        </p>
                      </div>
                    </button>

                    {hasRepos &&
                      profilePreview!.repos.slice(0, 4).map((r) => {
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
                              "w-full flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80",
                              loading && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Code2 className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-foreground font-mono truncate">
                                  {r.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {r.stars > 0 && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-amber-400 font-medium">
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
                                  <span className="font-medium text-foreground/80">
                                    {r.language}
                                  </span>
                                )}
                                <span className="truncate">
                                  {r.description || "Public repository"}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setIsCustomMode(true);
                        setIsGeneralDomainOnly(false);
                        setSelectedRepo(null);
                      }}
                      className={cn(
                        "w-full flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                        isCustomMode
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Plus className="size-3.5 mt-0.5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            Target Other Repository...
                          </span>
                          {isCustomMode && (
                            <Check className="size-3 text-primary stroke-[3]" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Specify any private or public repository name
                        </p>
                      </div>
                    </button>

                    {isCustomMode && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/50 bg-background/80 p-1.5">
                        <span className="pl-2 text-xs font-mono text-muted-foreground">
                          Repo:
                        </span>
                        <Input
                          value={customRepoInput}
                          placeholder="e.g. distributed-kv or ai-interviewer"
                          onChange={(e) => setCustomRepoInput(e.target.value)}
                          disabled={loading}
                          className="h-8 border-0 bg-transparent text-xs font-mono focus-visible:ring-0"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Ready to Calibrate Session
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono text-primary font-medium">
                  {selectedLevelObj?.label} · {selectedTrackObj?.title}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Target Project:{" "}
                <span className="font-mono text-foreground font-medium">
                  {isGeneralDomainOnly
                    ? "General Domain Screen"
                    : isCustomMode && customRepoInput
                    ? customRepoInput
                    : selectedRepo || (parseInput(github).username ? "Scanning..." : "None selected")}
                </span>
              </p>
            </div>

            <Button
              disabled={loading}
              onClick={onSubmit}
              size="lg"
              className="gap-2 rounded-xl font-semibold px-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Calibrating Room...
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  Start Live Voice Interview
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {loading && (
            <div className="mt-5 border-t border-border/40 pt-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                {loadingSteps.map((stepText, idx) => {
                  const isDone = currentStep > idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2.5 text-xs transition-colors duration-150",
                        isDone
                          ? "text-foreground font-medium"
                          : isCurrent
                          ? "text-primary font-medium"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="size-3.5 shrink-0 text-primary animate-spin" />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-muted-foreground/30" />
                      )}
                      <span>{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && (
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-3">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Zero credentials persisted to disk. Audio streaming encrypted over TLS.
              </span>
              <span className="hidden sm:inline-block">
                Microphone access prompted on entry.
              </span>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 text-center text-xs text-muted-foreground/70 pb-4">
        <span>AI Technical Interviewer · Built for High-Signal Engineering Evaluations</span>
      </footer>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyChange={(hasKey) => setCustomKeyActive(hasKey)}
      />
    </main>
  );
}
