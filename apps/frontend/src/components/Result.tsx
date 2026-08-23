/* Hallmark · genre: modern-minimal · macrostructure: Split-Dossier · theme: custom-carbon · states: default · hover · focus · active · disabled · loading */

import { BACKEND_URL } from "@/lib/config";
import { getCustomApiKey } from "@/lib/apiKeyStorage";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Bot,
  Loader2,
  User,
  CheckCircle2,
  AlertTriangle,
  Award,
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
  Clock,
  ShieldCheck,
  Plus,
  X,
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
  recommendation: "Strong Hire" | "Hire" | "Lean Hire" | "No Hire";
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
  FULLSTACK_GENERAL: "Full-Stack General",
  BACKEND: "Backend Engineering",
  FRONTEND: "Frontend Engineering",
  SYSTEM_DESIGN: "System Design",
  DSA: "DSA & Algorithms",
  BEHAVIORAL: "Behavioral & Leadership",
  DEVOPS_CLOUD: "DevOps & Cloud",
  ML_AI: "ML & AI Engineering",
};

const LEVEL_LABELS: Record<string, string> = {
  JUNIOR: "Junior · 0–2y",
  MID: "Mid-Level · 2–5y",
  SENIOR: "Senior · 5+y",
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

  // Filtered transcript messages with safe array fallback
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

  const categoriesConfig = [
    {
      key: "technicalAccuracy" as const,
      title: isBehavioral ? "Situation Framing" : isDSA ? "Algorithmic Correctness" : "Technical Accuracy",
      icon: Code2,
      score: evalData?.categories?.technicalAccuracy?.score ?? 0,
      feedback: evalData?.categories?.technicalAccuracy?.feedback ?? "",
    },
    {
      key: "problemSolving" as const,
      title: isBehavioral ? "Action Quality" : isDSA ? "Optimization Ability" : "Problem Solving",
      icon: Brain,
      score: evalData?.categories?.problemSolving?.score ?? 0,
      feedback: evalData?.categories?.problemSolving?.feedback ?? "",
    },
    {
      key: "communication" as const,
      title: isBehavioral ? "Impact Articulation" : isDSA ? "Communication" : "Communication",
      icon: MessageSquare,
      score: evalData?.categories?.communication?.score ?? 0,
      feedback: evalData?.categories?.communication?.feedback ?? "",
    },
    {
      key: "depth" as const,
      title: isBehavioral ? "Leadership Signals" : isDSA ? "Complexity Analysis" : "Engineering Depth",
      icon: Layers,
      score: evalData?.categories?.depth?.score ?? 0,
      feedback: evalData?.categories?.depth?.feedback ?? "",
    },
  ];

  return (
    <main className="min-h-screen w-full max-w-full px-4 py-8 sm:px-6 md:py-12 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-6xl">
        {/* Top Header Navigation & Action Rail */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
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
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                  EVALUATION REPORT
                </span>
                <span className="rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground tabular-nums">
                  SESSION #{interviewId ? interviewId.slice(-8) : "REF"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Evaluated via <span className="font-medium text-foreground">{modelDisplayName}</span> standardized engineering rubric.
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
          /* ASYMMETRIC 2-COLUMN SPLIT DOSSIER */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
            {/* LEFT RAIL: Candidate Summary & Rubric Competencies (5 Cols) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
              {/* Primary Scorecard Header Card */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Overall Assessment
                    </span>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {evalData?.recommendation && (
                        <span className={cn("rounded-lg border px-2.5 py-0.5 text-xs font-semibold", recBadge.bg)}>
                          {recBadge.label}
                        </span>
                      )}
                      {trackLabel && (
                        <span className="rounded-lg border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {trackLabel}
                        </span>
                      )}
                      {levelLabel && (
                        <span className="rounded-lg border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {levelLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Big Tabular Score */}
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-4xl font-extrabold font-mono tabular-nums tracking-tight text-foreground">
                        {evalData?.overallScore ?? result.score}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground">/10</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">COMPOSITE SCORE</span>
                  </div>
                </div>

                {/* Rubric Category Breakdown Bars */}
                {evalData?.categories && (
                  <div className="mt-6 space-y-3.5 border-t border-border/40 pt-5">
                    <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                      Rubric Breakdown
                    </span>
                    <div className="space-y-3">
                      {categoriesConfig.map((cat) => {
                        const Icon = cat.icon;
                        const pct = Math.min(100, Math.max(0, cat.score * 10));
                        return (
                          <div key={cat.key} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 text-foreground font-medium">
                                <Icon className="size-3.5 text-primary" />
                                {cat.title}
                              </span>
                              <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                                {cat.score}
                                <span className="text-[10px] font-normal text-muted-foreground">/10</span>
                              </span>
                            </div>
                            {/* Visual Progress Bar */}
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Strengths & Focus Areas Card */}
              {evalData && (
                <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm space-y-5">
                  {/* Strengths */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="size-4" />
                      Key Observed Strengths
                    </div>
                    <ul className="space-y-2">
                      {evalData.strengths.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="space-y-2.5 border-t border-border/40 pt-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <AlertTriangle className="size-4" />
                      Target Growth Areas
                    </div>
                    <ul className="space-y-2">
                      {evalData.improvements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT MAIN DECK: Summary, Deep Rubric Feedback, Evidence & Transcript (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Executive Summary Box */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground">
                    <FileText className="size-3.5 text-primary" />
                    Executive Evaluation Summary
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {evalData?.summary || result.feedback}
                </p>
              </div>

              {/* Detailed Competency Feedback Grid */}
              {evalData?.categories && (
                <div className="space-y-3">
                  <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                    Competency Notes & Diagnostics
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoriesConfig.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <div
                          key={cat.key}
                          className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2"
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
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {cat.feedback}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transcript Evidence Quotes */}
              {evalData?.evidence && evalData.evidence.length > 0 && (
                <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Quote className="size-3.5 text-primary" />
                    Transcript Evidence & Direct Quotes
                  </div>
                  <div className="space-y-2.5">
                    {evalData.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-border/50 bg-background/50 p-3.5 space-y-1.5"
                      >
                        <p className="text-xs italic text-foreground font-mono">
                          "{ev.quote}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/90">Observation: </span>
                          {ev.assessment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Conversation Transcript */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      Full Audio Transcript
                    </span>
                    <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                      {filteredTranscript.length} of {result.transcript.length} turns displayed
                    </p>
                  </div>

                  {/* Transcript Controls */}
                  <div className="flex flex-wrap items-center gap-2.5" data-no-print>
                    {/* Responsive Search Input */}
                    <div className="relative flex items-center group">
                      <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-foreground" />
                      <Input
                        aria-label="Search interview transcript by keyword"
                        placeholder="Search transcript..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 w-48 sm:w-56 focus-within:w-60 rounded-lg pl-8 pr-7 text-xs bg-background/70 border-border/70 placeholder:text-muted-foreground transition-all duration-200 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/60"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search input"
                          className="absolute right-2 size-4 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-150 cursor-pointer"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>

                    {/* Unified Segmented Speaker Rail */}
                    <div
                      role="tablist"
                      aria-label="Filter transcript by speaker"
                      className="flex h-8 items-center rounded-lg border border-border/70 bg-background/70 p-0.5 text-xs shadow-none"
                    >
                      <button
                        role="tab"
                        aria-selected={roleFilter === "all"}
                        onClick={() => setRoleFilter("all")}
                        className={cn(
                          "h-7 rounded-md px-3 text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center justify-center",
                          roleFilter === "all"
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
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
                          "h-7 rounded-md px-3 text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center justify-center",
                          roleFilter === "Assistant"
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
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
                          "h-7 rounded-md px-3 text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center justify-center",
                          roleFilter === "User"
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Candidate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
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
                          "flex gap-3",
                          isAi ? "justify-start" : "flex-row-reverse"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs",
                            isAi
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border/80 bg-muted/40 text-foreground"
                          )}
                        >
                          {isAi ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
                        </div>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed space-y-1",
                            isAi
                              ? "border border-border/60 bg-background/60 text-foreground"
                              : "bg-primary text-primary-foreground font-normal"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-70">
                            <span className="font-semibold">{isAi ? "Alex (Interviewer)" : "Candidate"}</span>
                            {m.turnIndex !== undefined && (
                              <span className="font-mono tabular-nums">Turn #{m.turnIndex}</span>
                            )}
                          </div>
                          <p>{m.content}</p>
                          {m.wasInterrupted && (
                            <div className="pt-1">
                              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                Interrupted by candidate
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Colophon */}
      <footer className="mt-12 text-center text-xs text-muted-foreground/70 pb-4">
        <span>AI Technical Interviewer · Standardized Engineering Evaluation Dossier</span>
      </footer>
    </main>
  );
}

