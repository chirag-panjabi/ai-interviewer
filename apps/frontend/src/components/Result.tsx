/* Hallmark · genre: modern-minimal · macrostructure: Executive-Dossier · theme: custom-carbon · states: default · hover · focus · active · disabled · loading */

import { BACKEND_URL } from "@/lib/config";
import { getCustomApiKey } from "@/lib/apiKeyStorage";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Brain,
  MessageSquare,
  Layers,
  Quote,
  ArrowLeft,
  Share2,
  Download,
  Search,
  Check,
  Radio,
  FileText,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CategoryScore {
  score: number;
  feedback: string;
}

interface EvidenceItem {
  quote: string;
  assessment: string;
}

interface EvaluationData {
  overallScore: number;
  recommendation: "Strong Hire" | "Hire" | "Lean Hire" | "Lean No Hire" | "No Hire";
  summary: string;
  categories: {
    technicalAccuracy: CategoryScore;
    problemSolving: CategoryScore;
    communication: CategoryScore;
    depth: CategoryScore;
  };
  strengths: string[];
  improvements: string[];
  evidence: EvidenceItem[];
  evalModel?: string;
}

interface ResultData {
  id?: string;
  score: number;
  feedback: string;
  evaluationData?: EvaluationData;
  experienceLevel?: "JUNIOR" | "MID" | "SENIOR";
  track?: string;
  transcript: {
    type: "Assistant" | "User";
    content: string;
    turnIndex?: number;
    wasInterrupted?: boolean;
    createdAt: string;
  }[];
  status: string;
}

const TRACK_LABELS: Record<string, string> = {
  FULL_MOCK_SCREEN: "Full Mock Screen (End-to-End)",
  FULLSTACK_GENERAL: "Full-Stack",
  BACKEND: "Backend Engineering",
  FRONTEND: "Frontend Engineering",
  SYSTEM_DESIGN: "System Design",
  DSA: "DSA & Algorithms",
  BEHAVIORAL: "Behavioral & Leadership",
  DEVOPS_CLOUD: "DevOps & Cloud",
  ML_AI: "ML & AI Systems",
};

const LEVEL_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MID: "Mid-Level",
  SENIOR: "Senior / Lead",
};

function formatModelName(model?: string): string {
  if (!model || model === "fallback") return "Gemini AI";
  if (model === "gemini-flash-latest") return "Gemini Flash";
  if (model.startsWith("gemini-")) {
    return model
      .replace(/^gemini-/, "Gemini ")
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return model;
}

export function Result() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultData>({
    score: 0,
    feedback: "",
    transcript: [],
    status: "EVALUATING",
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Transcript Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "Assistant" | "User">("all");

  useEffect(() => {
    let intervalId: any = null;

    const fetchResult = async () => {
      if (!interviewId) {
        setFetchError("No interview ID provided in URL.");
        setLoading(false);
        return;
      }

      try {
        const customKey = getCustomApiKey();
        const response = await axios.get(`${BACKEND_URL}/api/v1/result/${interviewId}`, {
          headers: customKey ? { "x-gemini-api-key": customKey } : {},
        });
        const data = response.data;
        setResult(data);
        setFetchError(null);

        if (data.status === "COMPLETED" || data.status === "Done") {
          setLoading(false);
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err: any) {
        console.error("Error fetching results:", err);
        if (err?.response?.status === 404) {
          setFetchError("This interview session was not found or has expired.");
          setLoading(false);
          if (intervalId) clearInterval(intervalId);
        }
      }
    };

    fetchResult();
    intervalId = setInterval(fetchResult, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [interviewId]);

  const ready = result.status === "COMPLETED" || result.status === "Done";
  const evalData = result.evaluationData;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Scorecard link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const getRecommendationBadge = (rec?: string) => {
    switch (rec) {
      case "Strong Hire":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
          label: "Strong Hire",
        };
      case "Hire":
        return {
          bg: "bg-teal-500/10 border-teal-500/40 text-teal-400",
          label: "Hire",
        };
      case "Lean Hire":
        return {
          bg: "bg-amber-500/10 border-amber-500/40 text-amber-400",
          label: "Lean Hire",
        };
      case "Lean No Hire":
        return {
          bg: "bg-orange-500/10 border-orange-500/40 text-orange-400",
          label: "Lean No Hire",
        };
      case "No Hire":
        return {
          bg: "bg-rose-500/10 border-rose-500/40 text-rose-400",
          label: "No Hire",
        };
      default:
        return {
          bg: "bg-rose-500/10 border-rose-500/40 text-rose-400",
          label: rec || "Evaluation Complete",
        };
    }
  };

  const recBadge = getRecommendationBadge(evalData?.recommendation);

  const transcriptList = Array.isArray(result?.transcript) ? result.transcript : [];
  const filteredTranscript = transcriptList.filter((m) => {
    const matchesRole = roleFilter === "all" || m.type === roleFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      (m.content || "").toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesRole && matchesSearch;
  });

  const modelDisplayName = formatModelName(evalData?.evalModel);
  const trackLabel = result.track ? (TRACK_LABELS[result.track] || result.track) : null;
  const levelLabel = result.experienceLevel ? (LEVEL_LABELS[result.experienceLevel] || result.experienceLevel) : null;
  const isBehavioral = result.track === "BEHAVIORAL";
  const isDSA = result.track === "DSA";
  const isFullMock = result.track === "FULL_MOCK_SCREEN";

  const categoriesConfig = [
    {
      key: "technicalAccuracy" as const,
      title: isFullMock ? "Technical Systems" : isBehavioral ? "Situation Framing" : isDSA ? "Algorithmic Correctness" : "Technical Accuracy",
      icon: Code2,
      score: evalData?.categories?.technicalAccuracy?.score ?? 0,
      feedback: evalData?.categories?.technicalAccuracy?.feedback ?? "",
    },
    {
      key: "problemSolving" as const,
      title: isFullMock ? "Architectural Judgment" : isBehavioral ? "Action Quality" : isDSA ? "Optimization Ability" : "Problem Solving",
      icon: Brain,
      score: evalData?.categories?.problemSolving?.score ?? 0,
      feedback: evalData?.categories?.problemSolving?.feedback ?? "",
    },
    {
      key: "communication" as const,
      title: isFullMock ? "Storytelling & Articulation" : isBehavioral ? "Impact Articulation" : isDSA ? "Communication" : "Communication",
      icon: MessageSquare,
      score: evalData?.categories?.communication?.score ?? 0,
      feedback: evalData?.categories?.communication?.feedback ?? "",
    },
    {
      key: "depth" as const,
      title: isFullMock ? "Production & Leadership" : isBehavioral ? "Leadership Signals" : isDSA ? "Complexity Analysis" : "Engineering Depth",
      icon: Layers,
      score: evalData?.categories?.depth?.score ?? 0,
      feedback: evalData?.categories?.depth?.feedback ?? "",
    },
  ];

  return (
    <main className="min-h-screen w-full max-w-full px-4 py-8 sm:px-6 md:py-12 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Minimal Hallmark Top Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/")}
              className="size-8 shrink-0 rounded-lg border-border/70 hover:bg-card cursor-pointer"
              data-no-print
              aria-label="Back to home"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                  EVALUATION DOSSIER
                </span>
                {(levelLabel || trackLabel) && (
                  <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {levelLabel} · {trackLabel}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Evaluated via <span className="font-medium text-foreground">{modelDisplayName}</span> rubric
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto" data-no-print>
            {ready && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1.5 rounded-lg text-xs border-border/80 bg-card/60 hover:bg-card cursor-pointer"
                  title="Copy shareable link"
                >
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Share2 className="size-3.5" />}
                  <span>{copied ? "Copied" : "Share"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPdf}
                  className="gap-1.5 rounded-lg text-xs border-border/80 bg-card/60 hover:bg-card cursor-pointer"
                  title="Save as PDF / Print scorecard"
                >
                  <Download className="size-3.5" />
                  <span>Export PDF</span>
                </Button>
              </>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>New Interview</span>
            </Button>
          </div>
        </header>

        {fetchError ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/40 bg-card/40 py-20 text-center backdrop-blur">
            <div className="grid size-12 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <AlertTriangle className="size-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Interview Record Not Found</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">{fetchError}</p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline" size="sm" className="mt-2 rounded-lg">
              Return to Setup
            </Button>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-border/80 bg-card/40 py-28 text-center backdrop-blur">
            <div className="grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              <Loader2 className="size-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Synthesizing Scorecard & Rubric…</p>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                Analyzing audio transcript turns, technical topology, problem-solving paths, and communication clarity.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground">
              <Radio className="size-3 text-primary animate-pulse" />
              Live evaluator active
            </div>
          </div>
        ) : (
          /* UNIFIED MINIMAL DOSSIER CONTENT */
          <div className="space-y-6 text-left">
            
            {/* 1. Executive Assessment & Scorecard Card */}
            <div className="rounded-2xl border border-border/80 bg-card/60 p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Overall Outcome
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    {evalData?.recommendation && (
                      <span className={cn("rounded-lg border px-3 py-1 text-sm font-semibold", recBadge.bg)}>
                        {recBadge.label}
                      </span>
                    )}
                    {levelLabel && (
                      <span className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {levelLabel}
                      </span>
                    )}
                    {trackLabel && (
                      <span className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {trackLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 sm:text-right">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums tracking-tight text-foreground">
                    {evalData?.overallScore ?? result.score}
                  </span>
                  <span className="text-base font-mono text-muted-foreground">/ 10</span>
                </div>
              </div>

              <div className="border-t border-border/40 pt-4">
                <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-normal">
                  {evalData?.summary || result.feedback}
                </p>
              </div>
            </div>

            {/* 2. 4-Pillar Engineering Rubric (Unified Competency Grid) */}
            {evalData?.categories && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Engineering Competencies & Diagnostic Feedback
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoriesConfig.map((cat) => {
                    const Icon = cat.icon;
                    const pct = Math.min(100, Math.max(0, cat.score * 10));
                    return (
                      <div
                        key={cat.key}
                        className="rounded-xl border border-border/70 bg-card/50 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Icon className="size-3.5 text-primary" />
                            {cat.title}
                          </span>
                          <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                            {cat.score}
                            <span className="text-[10px] font-normal text-muted-foreground">/10</span>
                          </span>
                        </div>

                        {/* Visual Progress Line */}
                        <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              cat.score >= 8
                                ? "bg-emerald-500"
                                : cat.score >= 6
                                ? "bg-primary"
                                : "bg-amber-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                          {cat.feedback}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Strengths & Target Growth (Side-by-Side 2-Col Grid) */}
            {evalData && (evalData.strengths.length > 0 || evalData.improvements.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="size-4" />
                    Observed Strengths
                  </div>
                  <ul className="space-y-2">
                    {evalData.strengths.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                    <AlertTriangle className="size-4" />
                    Target Growth Opportunities
                  </div>
                  <ul className="space-y-2">
                    {evalData.improvements.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 4. Transcript Evidence Quotes (if available) */}
            {evalData?.evidence && evalData.evidence.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Quote className="size-4 text-primary" />
                  Key Evidence & Direct Transcript Quotes
                </div>
                <div className="space-y-2.5">
                  {evalData.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1"
                    >
                      <p className="text-xs italic text-foreground font-mono">
                        "{ev.quote}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground/90">Assessment: </span>
                        {ev.assessment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Full Audio Transcript */}
            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Full Audio Transcript
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {filteredTranscript.length} of {result.transcript.length} dialog turns
                  </span>
                </div>

                {/* Filter & Search Controls */}
                <div className="flex flex-wrap items-center gap-2" data-no-print>
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      aria-label="Search transcript"
                      placeholder="Filter transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-44 sm:w-52 rounded-lg pl-8 pr-7 text-xs bg-background/70 border-border/70"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        className="absolute right-2 size-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  <div
                    role="tablist"
                    aria-label="Filter transcript by speaker"
                    className="flex h-8 items-center rounded-lg border border-border/70 bg-background/70 p-0.5 text-xs"
                  >
                    <button
                      role="tab"
                      aria-selected={roleFilter === "all"}
                      onClick={() => setRoleFilter("all")}
                      className={cn(
                        "h-7 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer",
                        roleFilter === "all"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All
                    </button>
                    <button
                      role="tab"
                      aria-selected={roleFilter === "Assistant"}
                      onClick={() => setRoleFilter("Assistant")}
                      className={cn(
                        "h-7 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer",
                        roleFilter === "Assistant"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Alex
                    </button>
                    <button
                      role="tab"
                      aria-selected={roleFilter === "User"}
                      onClick={() => setRoleFilter("User")}
                      className={cn(
                        "h-7 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer",
                        roleFilter === "User"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Candidate
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean Dialog Stream */}
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {filteredTranscript.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
                    {result.transcript.length === 0
                      ? "No conversation turns recorded."
                      : "No dialog turns match your search filter."}
                  </div>
                )}

                {filteredTranscript.map((m, i) => {
                  const isAi = m.type === "Assistant";
                  return (
                    <div
                      key={i}
                      className={cn(
                        "p-3.5 rounded-xl border space-y-1 text-left transition-colors",
                        isAi
                          ? "border-border/60 bg-background/40"
                          : "border-primary/30 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className={cn("font-semibold", isAi ? "text-primary" : "text-foreground")}>
                          {isAi ? "Alex (Interviewer)" : "Candidate"}
                        </span>
                        {m.turnIndex !== undefined && (
                          <span className="text-muted-foreground text-[10px]">Turn #{m.turnIndex}</span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                        {m.content}
                      </p>
                      {m.wasInterrupted && (
                        <span className="inline-block rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 mt-1">
                          Interrupted by candidate
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Minimal Colophon Footer */}
        <footer className="mt-8 text-center text-xs text-muted-foreground/70 pb-4">
          <p>
            AI Technical Interviewer · Standardized Engineering Evaluation Dossier
          </p>
        </footer>
      </div>
    </main>
  );
}

