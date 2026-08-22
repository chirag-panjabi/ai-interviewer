import { BACKEND_URL } from "@/lib/config";
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
  transcript: { type: "Assistant" | "User"; content: string; createdAt: string }[];
  status: string;
}

const TRACK_LABELS: Record<string, string> = {
  FULLSTACK_GENERAL: "🌐 Full-Stack General",
  BACKEND: "⚙️ Backend Engineering",
  FRONTEND: "🎨 Frontend Engineering",
  SYSTEM_DESIGN: "🏛️ System Design",
  DSA: "🧮 DSA & Algorithms",
  BEHAVIORAL: "🤝 Behavioral & Leadership",
  DEVOPS_CLOUD: "☁️ DevOps & Cloud",
  ML_AI: "🤖 ML & AI Engineering",
};

const LEVEL_LABELS: Record<string, string> = {
  JUNIOR: "🌱 Junior (0-2y)",
  MID: "🔧 Mid-Level (2-5y)",
  SENIOR: "🏗️ Senior (5+y)",
};

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
  const [copied, setCopied] = useState(false);

  // Transcript Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "Assistant" | "User">("all");

  useEffect(() => {
    let intervalId: any = null;

    const fetchResult = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/result/${interviewId}`);
        const data = response.data;
        setResult(data);

        if (data.status === "COMPLETED" || data.status === "Done") {
          setLoading(false);
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Error fetching results:", err);
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
          bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
          label: "Strong Hire",
        };
      case "Hire":
        return {
          bg: "bg-teal-500/15 border-teal-500/30 text-teal-400",
          label: "Hire",
        };
      case "Lean Hire":
        return {
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
          label: "Lean Hire",
        };
      default:
        return {
          bg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
          label: rec || "Evaluation Complete",
        };
    }
  };

  const recBadge = getRecommendationBadge(evalData?.recommendation);

  // Filtered transcript messages
  const filteredTranscript = result.transcript.filter((m) => {
    const matchesRole = roleFilter === "all" || m.type === roleFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesRole && matchesSearch;
  });

  const modelDisplayName = evalData?.evalModel || "Gemini AI";
  const trackLabel = result.track ? (TRACK_LABELS[result.track] || result.track) : null;
  const levelLabel = result.experienceLevel ? (LEVEL_LABELS[result.experienceLevel] || result.experienceLevel) : null;
  const isBehavioral = result.track === "BEHAVIORAL";
  const isDSA = result.track === "DSA";

  const cat1Title = isBehavioral ? "Situation Framing" : isDSA ? "Algorithmic Correctness" : "Technical Accuracy";
  const cat2Title = isBehavioral ? "Action Quality" : isDSA ? "Optimization Ability" : "Problem Solving";
  const cat3Title = isBehavioral ? "Impact Articulation" : isDSA ? "Communication" : "Communication";
  const cat4Title = isBehavioral ? "Leadership Signals" : isDSA ? "Complexity Analysis" : "Engineering Depth";

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0 rounded-full"
            data-no-print
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl whitespace-nowrap">
              Interview Evaluation
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Powered by <span className="font-semibold text-foreground/80">{modelDisplayName}</span> standardized evaluation rubric.
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
                className="gap-1.5 rounded-lg text-xs"
                title="Copy shareable link"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Share2 className="size-3.5" />}
                <span>{copied ? "Copied" : "Share"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintPdf}
                className="gap-1.5 rounded-lg text-xs"
                title="Save as PDF / Print scorecard"
              >
                <Download className="size-3.5" />
                <span>Export PDF</span>
              </Button>
            </>
          )}

          <Button variant="default" size="sm" onClick={() => navigate("/")} className="rounded-lg text-xs font-medium">
            New interview
          </Button>
        </div>
      </header>

      {!ready ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card/40 py-28 text-center backdrop-blur">
          <div className="grid size-14 place-items-center rounded-2xl bg-secondary/80 text-violet-400">
            <Loader2 className="size-7 animate-spin" />
          </div>
          <div>
            <p className="text-base font-semibold">Analyzing interview transcript…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Evaluating candidate performance, rubric competencies, and engineering depth.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Executive Summary Card */}
          <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 to-card/40 p-7 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-violet-500/15 text-violet-400">
                  <Award className="size-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">Overall Assessment</h2>
                    {evalData?.recommendation && (
                      <span className={cn("rounded-full border px-3 py-0.5 text-xs font-semibold", recBadge.bg)}>
                        {recBadge.label}
                      </span>
                    )}
                    {trackLabel && (
                      <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
                        {trackLabel}
                      </span>
                    )}
                    {levelLabel && (
                      <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
                        {levelLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Automated candidate technical scorecard</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 self-start sm:self-auto">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">
                  {evalData?.overallScore ?? result.score}
                </span>
                <span className="text-sm font-medium text-muted-foreground">/ 10</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-border/50 bg-secondary/30 p-4">
              <p className="text-sm leading-relaxed text-foreground/90">
                {evalData?.summary || result.feedback}
              </p>
            </div>
          </section>

          {/* 4 Category Score Cards */}
          {evalData?.categories && (
            <section className="grid gap-4 sm:grid-cols-2">
              {/* Category 1 */}
              <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-blue-500/15 text-blue-400">
                      <Code2 className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold">{cat1Title}</h3>
                  </div>
                  <span className="text-base font-bold text-foreground">
                    {evalData.categories.technicalAccuracy.score}
                    <span className="text-xs font-normal text-muted-foreground">/10</span>
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {evalData.categories.technicalAccuracy.feedback}
                </p>
              </div>

              {/* Category 2 */}
              <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-amber-500/15 text-amber-400">
                      <Brain className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold">{cat2Title}</h3>
                  </div>
                  <span className="text-base font-bold text-foreground">
                    {evalData.categories.problemSolving.score}
                    <span className="text-xs font-normal text-muted-foreground">/10</span>
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {evalData.categories.problemSolving.feedback}
                </p>
              </div>

              {/* Category 3 */}
              <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <MessageSquare className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold">{cat3Title}</h3>
                  </div>
                  <span className="text-base font-bold text-foreground">
                    {evalData.categories.communication.score}
                    <span className="text-xs font-normal text-muted-foreground">/10</span>
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {evalData.categories.communication.feedback}
                </p>
              </div>

              {/* Category 4 */}
              <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-purple-500/15 text-purple-400">
                      <Layers className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold">{cat4Title}</h3>
                  </div>
                  <span className="text-base font-bold text-foreground">
                    {evalData.categories.depth.score}
                    <span className="text-xs font-normal text-muted-foreground">/10</span>
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {evalData.categories.depth.feedback}
                </p>
              </div>
            </section>
          )}

          {/* Strengths & Improvements */}
          {evalData && (
            <section className="grid gap-6 sm:grid-cols-2">
              {/* Strengths */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  Key Strengths
                </div>
                <ul className="mt-3 space-y-2">
                  {evalData.strengths.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                  <AlertTriangle className="size-4" />
                  Areas for Improvement
                </div>
                <ul className="mt-3 space-y-2">
                  {evalData.improvements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Transcript Evidence Quotes */}
          {evalData?.evidence && evalData.evidence.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Quote className="size-4 text-violet-400" />
                Transcript Evidence & Observations
              </div>
              <div className="mt-4 space-y-3">
                {evalData.evidence.map((ev, idx) => (
                  <div key={idx} className="rounded-lg border border-border/40 bg-secondary/30 p-3.5">
                    <p className="text-xs font-medium italic text-foreground/90">
                      "{ev.quote}"
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-violet-300">Observation: </span>
                      {ev.assessment}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Full Chronological Transcript with Search & Role Filter */}
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Conversation Transcript
                </h2>
                <p className="text-xs text-muted-foreground/80">
                  Showing {filteredTranscript.length} of {result.transcript.length} messages
                </p>
              </div>

              {/* Transcript Controls (Hidden in Print) */}
              <div className="flex flex-wrap items-center gap-2" data-no-print>
                {/* Search Bar */}
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-44 rounded-lg pl-8 text-xs bg-card/50"
                  />
                </div>

                {/* Role Filter Tabs */}
                <div className="flex rounded-lg border border-border/60 bg-card/50 p-0.5 text-xs">
                  <button
                    onClick={() => setRoleFilter("all")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      roleFilter === "all"
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setRoleFilter("Assistant")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      roleFilter === "Assistant"
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Alex
                  </button>
                  <button
                    onClick={() => setRoleFilter("User")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      roleFilter === "User"
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    You
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {filteredTranscript.length === 0 && (
                <div className="rounded-xl border border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
                  {result.transcript.length === 0
                    ? "No conversation messages recorded."
                    : "No messages match your search filter."}
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
                        "grid size-8 shrink-0 place-items-center rounded-full text-white shadow-sm",
                        isAi
                          ? "bg-gradient-to-br from-violet-400 to-indigo-600"
                          : "bg-gradient-to-br from-emerald-300 to-teal-600"
                      )}
                    >
                      {isAi ? <Bot className="size-4" /> : <User className="size-4" />}
                    </div>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        isAi
                          ? "rounded-tl-sm border border-border/50 bg-card text-foreground"
                          : "rounded-tr-sm bg-primary text-primary-foreground"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
