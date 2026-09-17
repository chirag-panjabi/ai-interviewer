/* Hallmark · genre: modern-minimal · macrostructure: Slide-Over-Console · theme: custom-carbon */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Bot,
  User,
  Copy,
  Check,
  Search,
  X,
  Zap,
  ArrowDown,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  HelpCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export interface TranscriptTurn {
  id: string;
  speaker: "assistant" | "user";
  text: string;
  timestamp: number;
  turnIndex?: number;
  isStreaming?: boolean;
  wasInterrupted?: boolean;
}

interface LiveTranscriptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  turns: TranscriptTurn[];
  isMuted?: boolean;
  onToggleMute?: () => void;
  onEndInterview?: () => void;
}

export const LiveTranscriptDrawer = React.memo(function LiveTranscriptDrawer({
  isOpen,
  onClose,
  turns,
  isMuted,
  onToggleMute,
  onEndInterview,
}: LiveTranscriptDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Extract the latest non-empty question asked by Alex (Trap 1 Hardening)
  const latestAlexTurn = useMemo(() => {
    return [...turns]
      .reverse()
      .find((t) => t.speaker === "assistant" && t.text.trim().length > 0);
  }, [turns]);

  // Parse latest inquiry into context sentence and actionable question
  const parsedQuestion = useMemo(() => {
    if (!latestAlexTurn) return null;
    const text = latestAlexTurn.text.trim();
    // Match sentence split at period, question mark, or exclamation mark followed by space
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
    if (!sentences || sentences.length <= 1) {
      return { context: null, inquiry: text };
    }
    const context = sentences.slice(0, -1).join("").trim();
    const inquiry = sentences[sentences.length - 1]?.trim() || text;
    return { context, inquiry };
  }, [latestAlexTurn]);

  const handleCopyQuestion = () => {
    if (!latestAlexTurn) return;
    navigator.clipboard.writeText(latestAlexTurn.text.trim()).then(() => {
      setCopiedQuestion(true);
      setTimeout(() => setCopiedQuestion(false), 2000);
    });
  };

  // 2. Filter turns based on search query
  const filteredTurns = useMemo(() => {
    if (!searchQuery.trim()) return turns;
    const q = searchQuery.toLowerCase();
    return turns.filter((t) => t.text.toLowerCase().includes(q));
  }, [turns, searchQuery]);

  // 3. Auto-scroll to bottom on new turns if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [turns, autoScroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTurnTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex flex-col w-full sm:w-[440px] lg:w-[480px]",
        "bg-card/95 backdrop-blur-xl border-l border-border/70 shadow-2xl transition-transform duration-200 ease-out",
        "contain-content"
      )}
      aria-label="Live Dialogue Transcript"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 bg-background/50">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <MessageSquare className="size-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Live Transcript</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                {turns.length} {turns.length === 1 ? "turn" : "turns"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Real-time dialogue stream with Alex</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Mobile Emergency Quick Controls (Trap 4 Hardening) */}
          <div className="flex lg:hidden items-center gap-1 mr-2 border-r border-border/40 pr-2">
            {onToggleMute && (
              <Button
                variant={isMuted ? "destructive" : "ghost"}
                size="icon"
                onClick={onToggleMute}
                className="size-7 rounded-md"
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              </Button>
            )}
            {onEndInterview && (
              <Button
                variant="destructive"
                size="icon"
                onClick={onEndInterview}
                className="size-7 rounded-md"
                title="End Interview"
              >
                <PhoneOff className="size-3.5" />
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Pinned Latest Question Hero Card (Trap 1 Hardening) */}
      {parsedQuestion && (
        <div className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-4">
          <div className="rounded-xl border border-primary/20 bg-background/80 p-3.5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-primary uppercase">
                <HelpCircle className="size-3 text-primary animate-pulse" /> Latest Inquiry from Alex
              </span>
              <button
                type="button"
                onClick={handleCopyQuestion}
                className="flex items-center gap-1 rounded-md bg-muted/60 hover:bg-muted px-2 py-1 text-[11px] font-medium text-foreground transition-colors cursor-pointer"
                title="Copy question to clipboard"
              >
                {copiedQuestion ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-muted-foreground" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {parsedQuestion.context && (
              <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">
                {parsedQuestion.context}
              </p>
            )}
            <p className="text-xs font-semibold text-foreground leading-relaxed">
              "{parsedQuestion.inquiry}"
            </p>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="border-b border-border/40 px-4 py-2 bg-background/30">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dialogue history (e.g. QPS, Kafka)..."
            className="w-full rounded-lg border border-border/50 bg-card/60 py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Transcript Turns List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 text-left"
      >
        {filteredTurns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 space-y-2">
            <div className="size-9 rounded-full bg-muted/30 grid place-items-center text-muted-foreground">
              <MessageSquare className="size-4" />
            </div>
            <p className="text-xs font-medium text-foreground">
              {searchQuery ? "No matching messages found" : "Dialogue will appear here"}
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              {searchQuery
                ? `No turns contain "${searchQuery}". Try a different keyword.`
                : "Speak into your microphone or listen as Alex begins the interview."}
            </p>
          </div>
        ) : (
          filteredTurns.map((turn, idx) => {
            const isAlex = turn.speaker === "assistant";
            return (
              <div
                key={turn.id || `turn-${idx}`}
                className={cn(
                  "flex flex-col space-y-1.5 rounded-xl border p-3 text-xs leading-relaxed transition-colors",
                  isAlex
                    ? "border-sky-500/20 bg-sky-500/5 text-foreground"
                    : "border-border/60 bg-background/50 text-foreground"
                )}
              >
                {/* Bubble Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isAlex ? (
                      <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-sky-400">
                        <Bot className="size-3" /> Alex (Interviewer)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-400">
                        <User className="size-3" /> You (Candidate)
                      </span>
                    )}
                    {turn.wasInterrupted && (
                      <span className="flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-medium text-amber-300">
                        <Zap className="size-2.5" /> Interrupted
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground/70">
                    {formatTurnTime(turn.timestamp)}
                  </span>
                </div>

                {/* Bubble Body */}
                <div className="relative">
                  <p className="whitespace-pre-wrap font-sans text-xs">
                    {turn.text}
                    {turn.isStreaming && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-primary animate-pulse align-middle" />
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Auto-scroll recovery pill */}
      {!autoScroll && turns.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <Button
            size="sm"
            onClick={scrollToBottom}
            className="rounded-full shadow-lg gap-1.5 text-xs py-1 px-3 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            <ArrowDown className="size-3" /> Scroll to Latest
          </Button>
        </div>
      )}
    </aside>
  );
});
