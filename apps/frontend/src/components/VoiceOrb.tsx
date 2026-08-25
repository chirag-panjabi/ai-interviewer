/* Hallmark · genre: modern-minimal · macrostructure: Studio-Node · theme: custom-carbon · states: default · active · speaking · muted */

import { cn } from "../lib/utils";
import type { LucideIcon } from "lucide-react";

interface VoiceOrbProps {
  /** Normalized volume level, 0..1 */
  level: number;
  /** Whether this participant is the active/loud speaker right now */
  speaking: boolean;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  /** Accent style */
  accent?: "violet" | "emerald" | "primary";
}

export function VoiceOrb({
  level,
  speaking,
  label,
  sublabel,
  icon: Icon,
}: VoiceOrbProps) {
  const clamped = Math.min(1, Math.max(0, level));
  const eqWeights = [0.4, 0.7, 1.0, 0.85, 0.6, 0.9, 0.5];

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Precision Audio Node Housing */}
      <div className="relative grid h-44 w-44 place-items-center sm:h-52 sm:w-52">
        {/* Outer subtle concentric coordinate rules */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border border-border/40 transition-all duration-150",
            speaking ? "border-primary/40 scale-105" : "border-border/20 scale-100"
          )}
        />
        <div
          className={cn(
            "absolute h-36 w-36 sm:h-40 sm:w-40 rounded-full border transition-all duration-150",
            speaking
              ? "border-emerald-500/40 bg-emerald-500/5 scale-105"
              : "border-border/40 bg-card/40 scale-100"
          )}
        />

        {/* Core tactile center medallion */}
        <div
          className={cn(
            "relative grid size-24 sm:size-28 place-items-center rounded-full border transition-all duration-150 shadow-sm",
            speaking
              ? "border-primary bg-primary text-primary-foreground scale-105 shadow-md"
              : "border-border/80 bg-card text-foreground"
          )}
        >
          <Icon className="size-8 sm:size-9" strokeWidth={1.8} />

          {/* Active Speaking Ping Indicator */}
          {speaking && (
            <span className="absolute top-2 right-2 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
      </div>

      {/* 7-Band Equalizer Amplitude VU Bars */}
      <div className="flex h-7 items-end gap-1 px-3 py-1 rounded-full border border-border/40 bg-background/50 backdrop-blur">
        {eqWeights.map((weight, i) => {
          const heightPx = Math.max(3, clamped * weight * 20);
          return (
            <span
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-75",
                speaking ? "bg-emerald-400" : "bg-muted-foreground/30"
              )}
              style={{
                height: `${heightPx}px`,
                opacity: speaking ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>

      {/* Speaker Label & Sublabel */}
      <div className="text-center space-y-0.5">
        <p className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
          {label}
        </p>
        <p className="text-[11px] font-mono text-muted-foreground">
          {speaking ? "Speaking..." : sublabel}
        </p>
      </div>
    </div>
  );
}

