import { useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  Loader2,
  Trash2,
  Check,
  Sparkles,
  Github,
  FolderGit2,
  Briefcase,
  Layers,
  FileCode,
  ArrowRight,
} from "lucide-react";
import { cn } from "../lib/utils";
import { BACKEND_URL } from "../lib/config";
import { getCustomApiKey } from "../lib/apiKeyStorage";
import type { ParsedResume } from "../types";
import { Button } from "./ui/button";

interface ResumeUploaderProps {
  resume: ParsedResume | null;
  onResumeParsed: (data: ParsedResume) => void;
  onClearResume: () => void;
  selectedProject: string | null;
  onSelectProject: (projectName: string | null) => void;
  onConnectGithub?: (username: string) => void;
  disabled?: boolean;
}

export function ResumeUploader({
  resume,
  onResumeParsed,
  onClearResume,
  selectedProject,
  onSelectProject,
  onConnectGithub,
  disabled = false,
}: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function processPdfFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF document (.pdf).");
      return;
    }

    // 10MB client check
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Please upload a PDF smaller than 10MB.");
      return;
    }

    setIsParsing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      const customKey = getCustomApiKey();
      const res = await axios.post<any>(
        `${BACKEND_URL}/api/v1/parse-resume`,
        { pdfBase64: base64Data },
        {
          headers: customKey ? { "x-gemini-api-key": customKey } : {},
          timeout: 45000,
        }
      );

      const parsedData: ParsedResume = res.data?.data || (res.data?.candidateName ? res.data : null);

      if (parsedData && parsedData.candidateName) {
        onResumeParsed(parsedData);
        toast.success(`Resume parsed for ${parsedData.candidateName || "Candidate"}!`);
      } else {
        throw new Error(res.data?.message || "Failed to extract structured data from resume.");
      }
    } catch (err: any) {
      console.error("[ResumeUploader] PDF parsing failed:", err);
      if (err?.response?.status === 429) {
        toast.error("Rate limit reached. Enter your Gemini API key in BYOK settings to continue.");
      } else {
        toast.error(
          err?.response?.data?.message || err?.message || "Could not parse resume. Try pasting plain text."
        );
      }
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function processPastedText() {
    if (!pastedText.trim() || pastedText.trim().length < 50) {
      toast.error("Please paste substantial resume text (at least 50 characters).");
      return;
    }

    setIsParsing(true);
    try {
      const customKey = getCustomApiKey();
      const res = await axios.post<any>(
        `${BACKEND_URL}/api/v1/parse-resume`,
        { text: pastedText.trim() },
        {
          headers: customKey ? { "x-gemini-api-key": customKey } : {},
          timeout: 45000,
        }
      );

      const parsedData: ParsedResume = res.data?.data || (res.data?.candidateName ? res.data : null);

      if (parsedData && parsedData.candidateName) {
        onResumeParsed(parsedData);
        toast.success(`Resume parsed for ${parsedData.candidateName || "Candidate"}!`);
      } else {
        throw new Error(res.data?.message || "Failed to extract structured data from resume text.");
      }
    } catch (err: any) {
      console.error("[ResumeUploader] Text parsing failed:", err);
      if (err?.response?.status === 429) {
        toast.error("Rate limit reached. Enter your Gemini API key in BYOK settings to continue.");
      } else {
        toast.error(err?.response?.data?.message || err?.message || "Could not parse resume text.");
      }
    } finally {
      setIsParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isParsing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) processPdfFile(file);
    }
  }

  // --- RENDER: PARSED STATE ---
  if (resume) {
    const hasGithub = Boolean(resume.links?.githubUsername);
    const projects = resume.projects || [];
    const workHistory = resume.workHistory || [];

    return (
      <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 animate-in fade-in duration-200">
        {/* Header with Candidate Name and Action */}
        <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/20 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {resume.candidateName || "Candidate Profile"}
                </span>
                <span className="rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  Parsed & Verified
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {resume.targetRole || "Software Engineer"}
                {resume.yearsOfExperience ? ` · ~${resume.yearsOfExperience} yrs exp` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearResume}
            disabled={disabled || isParsing}
            title="Remove and re-upload resume"
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            <span>Replace</span>
          </button>
        </div>

        {/* 1-Click GitHub Connect Callout if detected in resume */}
        {hasGithub && onConnectGithub && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Github className="size-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-emerald-300 block truncate">
                  Found GitHub @{resume.links.githubUsername} in resume
                </span>
                <span className="text-[11px] text-emerald-400/80 block">
                  Link your repositories to let Alex drill both your resume and live codebase.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onConnectGithub(resume.links.githubUsername!)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 transition-colors cursor-pointer shrink-0"
            >
              <span>Connect @{resume.links.githubUsername}</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* Skills Pills */}
        {resume.skills && resume.skills.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Extracted Core Stack & Competencies:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.slice(0, 12).map((skill, idx) => (
                <span
                  key={idx}
                  className="rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Work History Snippets */}
        {workHistory.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Work Experience:
            </span>
            <div className="space-y-1.5">
              {workHistory.slice(0, 2).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 text-xs"
                >
                  <Briefcase className="size-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">{item.role}</span>
                  <span className="text-muted-foreground">at {item.company}</span>
                  {item.duration && (
                    <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                      {item.duration}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flagship Project Selection (Probe Focus) */}
        {projects.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Flagship Project for Deep-Dive:
              </span>
              <span className="text-[10px] text-muted-foreground">
                Alex will grill architecture & metrics on this
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Default All-Projects option */}
              <button
                type="button"
                onClick={() => onSelectProject(null)}
                className={cn(
                  "flex items-start justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                  !selectedProject
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background/60 hover:border-border"
                )}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="size-3 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground block truncate">
                      All Resume Projects
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Allow interviewer to pick and pivot across all {projects.length} projects
                  </span>
                </div>
                {!selectedProject && <Check className="size-3.5 text-primary stroke-[3] shrink-0" />}
              </button>

              {/* Individual Project Cards */}
              {projects.map((p) => {
                const isSelected = selectedProject === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => onSelectProject(p.name)}
                    className={cn(
                      "flex items-start justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 bg-background/60 hover:border-border"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <FolderGit2 className="size-3 text-primary shrink-0" />
                        <span className="text-xs font-semibold font-mono text-foreground block truncate">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                        {p.techStack && p.techStack.length > 0 ? p.techStack.slice(0, 3).join(", ") : p.description || "Project"}
                      </span>
                      {p.metrics && (
                        <span className="inline-block text-[9px] text-emerald-400 font-mono mt-1 truncate max-w-full">
                          ⚡ {p.metrics}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="size-3.5 text-primary stroke-[3] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER: UPLOAD / PASTE FORM ---
  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-background/60 p-4 animate-in fade-in duration-200">
      {/* Tab Selector: Upload PDF vs Paste Text */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              inputMode === "upload"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            PDF Upload
          </button>
          <button
            type="button"
            onClick={() => setInputMode("paste")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              inputMode === "paste"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Paste Plain Text
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
          Parsed in-memory with Gemini Multimodal · No storage
        </span>
      </div>

      {/* Mode 1: PDF Dropzone */}
      {inputMode === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !isParsing) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-all",
            isDragging
              ? "border-primary bg-primary/10 ring-2 ring-primary/40"
              : "border-border/70 hover:border-border hover:bg-background/80",
            (disabled || isParsing) && "opacity-60 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={disabled || isParsing}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processPdfFile(e.target.files[0]);
              }
            }}
            className="hidden"
            id="resume-file-input"
          />

          {isParsing ? (
            <div className="flex flex-col items-center gap-2.5 py-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  Analyzing Resume Structure with Gemini...
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Extracting projects, metrics, work history, and GitHub links
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <UploadCloud className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Drop your resume PDF here, or{" "}
                  <label
                    htmlFor="resume-file-input"
                    className="text-primary hover:underline cursor-pointer"
                  >
                    browse files
                  </label>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  PDF format up to 10MB · Parsed securely in RAM
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Paste Raw Text */}
      {inputMode === "paste" && (
        <div className="space-y-3">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            disabled={disabled || isParsing}
            placeholder="Paste your resume contents here (experience, projects, skills, metrics)..."
            rows={6}
            className="w-full rounded-xl border border-border/80 bg-background/80 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {pastedText.length} characters
            </span>
            <Button
              type="button"
              size="sm"
              disabled={disabled || isParsing || pastedText.trim().length < 50}
              onClick={processPastedText}
              className="gap-1.5 text-xs font-semibold cursor-pointer"
            >
              {isParsing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Parsing Text...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Parse Resume Content
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
