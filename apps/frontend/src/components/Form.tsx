import { useState, useRef, useEffect, useCallback } from "react";
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
  CheckCircle2,
  Circle,
  Sparkles,
  Key,
  RefreshCw,
  Star,
  Code,
  FolderGit2,
  Plus,
  Check,
  AlertCircle,
  User,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ApiKeyModal } from "./ApiKeyModal";
import { getCustomApiKey, hasCustomApiKey, maskApiKey } from "../lib/apiKeyStorage";

const LOADING_STEPS = [
  "Fetching GitHub profile & public repositories...",
  "Analyzing project architecture & README files...",
  "Calibrating Principal Engineer interview persona...",
  "Preparing live audio interview room...",
];

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

function getLanguageColor(language: string | null): string {
  if (!language) return "bg-zinc-400";
  const map: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-amber-400",
    Python: "bg-emerald-500",
    Go: "bg-cyan-500",
    Rust: "bg-orange-500",
    Java: "bg-red-500",
    "C++": "bg-pink-500",
    C: "bg-purple-500",
    Ruby: "bg-rose-500",
    PHP: "bg-indigo-500",
    Swift: "bg-orange-600",
    Kotlin: "bg-purple-600",
  };
  return map[language] || "bg-primary";
}

export function Form() {
  const [github, setGithub] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Repository Picker State
  const [profilePreview, setProfilePreview] = useState<ProfilePreview | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>("__ALL__");
  const [isCustomRepoMode, setIsCustomRepoMode] = useState(false);
  const [customRepoInput, setCustomRepoInput] = useState("");

  // BYOK State
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customKeyActive, setCustomKeyActive] = useState(() => hasCustomApiKey());

  const navigate = useNavigate();
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const apiIdRef = useRef<string | null>(null);
  const minTimeElapsedRef = useRef(false);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, []);

  function validateInput(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError("Please enter your GitHub username or repository URL");
      return false;
    }

    const isGithubUrl = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)?\/?.*$/i.test(trimmed);
    const isUsernameOrRepo = /^[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)?$/.test(trimmed);

    if (!isGithubUrl && !isUsernameOrRepo) {
      setValidationError("Please enter a valid GitHub username (e.g. 'torvalds') or URL");
      return false;
    }

    setValidationError(null);
    return true;
  }

  const triggerPreviewFetch = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      setProfilePreview(null);
      return;
    }

    // Check if input looks complete
    const isGithubUrl = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_.-]+/i.test(trimmed);
    const isUsername = /^[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)?$/.test(trimmed);
    if (!isGithubUrl && !isUsername) return;

    // Detect if input has a specific repo
    let detectedRepo: string | null = null;
    const cleanNoProto = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^github\.com\//i, "");
    const parts = cleanNoProto.split("/").filter(Boolean);
    if (parts.length >= 2 && !["tab", "repositories", "stars"].includes(parts[1]!)) {
      detectedRepo = parts[1]!.replace(/\.git$/i, "");
    }

    setFetchingPreview(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/github-preview`, {
        github: trimmed,
      });

      const data: ProfilePreview = response.data;
      setProfilePreview(data);

      if (detectedRepo) {
        setSelectedRepo(detectedRepo);
        setIsCustomRepoMode(false);
      } else if (!selectedRepo || selectedRepo === "__ALL__") {
        setSelectedRepo("__ALL__");
      }
    } catch (err: any) {
      console.warn("[Form] Could not fetch profile preview:", err?.message);
    } finally {
      setFetchingPreview(false);
    }
  }, [selectedRepo]);

  function handleGithubChange(val: string) {
    setGithub(val);
    if (validationError) setValidationError(null);

    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);

    const trimmed = val.trim();
    if (trimmed.length >= 3) {
      previewDebounceRef.current = setTimeout(() => {
        triggerPreviewFetch(trimmed);
      }, 700);
    } else {
      setProfilePreview(null);
    }
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

    // Determine final selected repo
    let finalSelectedRepo: string | null = null;
    if (isCustomRepoMode) {
      finalSelectedRepo = customRepoInput.trim() || null;
    } else if (selectedRepo && selectedRepo !== "__ALL__") {
      finalSelectedRepo = selectedRepo;
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
      const customKey = getCustomApiKey();
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/pre-interview`,
        {
          github: github.trim(),
          selectedRepo: finalSelectedRepo,
        },
        {
          headers: customKey ? { "x-gemini-api-key": customKey } : {},
        }
      );
      tryNavigate(response.data.id);
    } catch (e: any) {
      timersRef.current.forEach(clearTimeout);
      const status = e?.response?.status;
      const errorMsg = e?.response?.data?.message || "Something went wrong starting your interview. Please try again.";

      if (status === 429) {
        toast.error("Hosted demo limit reached (15/day). Please add your free Gemini API key to continue!");
        setIsApiKeyModalOpen(true);
      } else {
        toast.error(errorMsg);
      }

      setLoading(false);
      setCurrentStep(0);
    }
  }

  return (
    <main className="flex min-h-screen w-screen items-center justify-center overflow-y-auto px-6 py-12">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        {/* Top Header Actions (Badge & BYOK Trigger) */}
        <div className="mb-6 flex w-full items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Mic className="size-3.5 text-primary" />
            Voice-based technical screening
          </span>

          <button
            type="button"
            onClick={() => setIsApiKeyModalOpen(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur transition-all cursor-pointer",
              customKeyActive
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            <Key className={cn("size-3", customKeyActive ? "text-emerald-400" : "text-primary")} />
            {customKeyActive ? (
              <span>
                BYOK Active{" "}
                <span className="font-mono text-[10px] opacity-75">
                  ({maskApiKey(getCustomApiKey())})
                </span>
              </span>
            ) : (
              <span>
                Gemini Key{" "}
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </span>
            )}
          </button>
        </div>

        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          AI Technical Interviewer
        </h1>
        <p className="mt-4 max-w-md text-balance text-base text-muted-foreground">
          Enter your GitHub profile to start a live, voice-driven screening interview with Alex. Discuss real architecture, trade-offs, and receive an instant scorecard.
        </p>

        {/* Primary Input Container */}
        <div className="mt-8 w-full space-y-4">
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
              placeholder="https://github.com/username or username/repo"
              onChange={(e) => handleGithubChange(e.target.value)}
              onBlur={() => triggerPreviewFetch(github)}
              onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
              disabled={loading}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm font-mono"
            />
            {github.trim() && (
              <button
                type="button"
                onClick={() => triggerPreviewFetch(github)}
                disabled={fetchingPreview || loading}
                aria-label="Scan GitHub repositories"
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                {fetchingPreview ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
              </button>
            )}
            <Button
              disabled={loading}
              onClick={onSubmit}
              size="lg"
              className="shrink-0 gap-2 rounded-lg cursor-pointer"
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
            <p className="text-left text-xs font-medium text-destructive">
              {validationError}
            </p>
          )}

          {/* Quick Demos */}
          {!profilePreview && !loading && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono text-[10px] uppercase">Quick Demos:</span>
              <button
                type="button"
                onClick={() => {
                  setGithub("torvalds");
                  handleGithubChange("torvalds");
                  triggerPreviewFetch("torvalds");
                }}
                className="rounded border border-border/70 bg-card/40 px-2 py-0.5 text-[10px] font-mono hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                torvalds
              </button>
              <button
                type="button"
                onClick={() => {
                  setGithub("shadcn");
                  handleGithubChange("shadcn");
                  triggerPreviewFetch("shadcn");
                }}
                className="rounded border border-border/70 bg-card/40 px-2 py-0.5 text-[10px] font-mono hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                shadcn
              </button>
            </div>
          )}

          {/* Candidate Profile Preview & Scraper Fallbacks Banner */}
          {profilePreview && (
            <div className="rounded-xl border border-border/70 bg-card/50 p-4 text-left backdrop-blur animate-in fade-in duration-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {profilePreview.avatarUrl ? (
                    <img
                      src={profilePreview.avatarUrl}
                      alt={profilePreview.username}
                      className="size-10 rounded-full border border-border object-cover shrink-0"
                    />
                  ) : (
                    <div className="grid size-10 place-items-center rounded-full border border-border bg-muted/30 text-muted-foreground shrink-0">
                      <User className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {profilePreview.name || profilePreview.username}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        @{profilePreview.username}
                      </span>
                    </div>
                    {profilePreview.bio && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {profilePreview.bio}
                      </p>
                    )}
                  </div>
                </div>
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
                  {profilePreview.publicReposCount} public repos
                </span>
              </div>

              {/* Scraper / Rate-limit Alert Warning */}
              {profilePreview.rateLimited && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                  <AlertCircle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-medium text-amber-200">GitHub API Rate Limit Reached</p>
                    <p className="text-[11px] text-amber-300/80 leading-snug">
                      GitHub limits unauthenticated queries to 60/hr. You can still select "General Portfolio" or type your repository name manually below to proceed.
                    </p>
                  </div>
                </div>
              )}

              {/* Repository Card Picker */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <span className="text-xs font-semibold text-foreground/90 block">
                  Select Project Focus for Interview:
                </span>

                {/* Option 1: General Profile Portfolio (All Repos) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRepo("__ALL__");
                    setIsCustomRepoMode(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                    !isCustomRepoMode && selectedRepo === "__ALL__"
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                      : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid size-7 place-items-center rounded-md border border-border/60 bg-muted/30 text-primary shrink-0">
                      <FolderGit2 className="size-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        General Profile Portfolio
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Discuss broad architecture and let Alex choose topics across all repositories
                      </span>
                    </div>
                  </div>
                  {!isCustomRepoMode && selectedRepo === "__ALL__" && (
                    <Check className="size-3.5 text-primary stroke-[3] shrink-0" />
                  )}
                </button>

                {/* Option 2..N: Top Public Repositories Cards Grid */}
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
                            "flex items-start justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                              : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80"
                          )}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold font-mono text-foreground block truncate">
                                {r.name}
                              </span>
                              {r.stars > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium shrink-0">
                                  <Star className="size-2.5 fill-amber-400" />
                                  {r.stars}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              {r.language && (
                                <span className="flex items-center gap-1">
                                  <span className={cn("size-1.5 rounded-full shrink-0", getLanguageColor(r.language))} />
                                  <span className="font-medium text-foreground/80">{r.language}</span>
                                </span>
                              )}
                              <span className="truncate">
                                {r.description || "No description provided"}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="size-3.5 text-primary stroke-[3] shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Option 3: Custom Repository Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomRepoMode(true);
                    setSelectedRepo(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                    isCustomRepoMode
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                      : "border-border/60 bg-background/50 hover:border-border hover:bg-background/80"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid size-7 place-items-center rounded-md border border-border/60 bg-muted/30 text-primary shrink-0">
                      <Plus className="size-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Specify Another Repository
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Target a specific repo name not listed in top projects
                      </span>
                    </div>
                  </div>
                  {isCustomRepoMode && (
                    <Check className="size-3.5 text-primary stroke-[3] shrink-0" />
                  )}
                </button>

                {/* Custom Repo Input Field */}
                {isCustomRepoMode && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/50 bg-card/80 p-2 animate-in fade-in duration-150">
                    <Code className="size-3.5 text-muted-foreground pl-1 shrink-0" />
                    <Input
                      value={customRepoInput}
                      placeholder="e.g. ai-interviewer or my-distributed-cache"
                      onChange={(e) => setCustomRepoInput(e.target.value)}
                      disabled={loading}
                      className="h-7 border-0 bg-transparent text-xs font-mono focus-visible:ring-0 p-0"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
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

      {/* BYOK Custom Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyChange={(hasKey) => setCustomKeyActive(hasKey)}
      />
    </main>
  );
}
