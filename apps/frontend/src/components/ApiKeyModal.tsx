/* Hallmark · genre: modern-minimal · macrostructure: Security-Dialog · theme: custom-carbon · states: default · verifying · error · byok-active · demo-active */

import React, { useState, useEffect } from "react";
import {
  Key,
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  X,
  Server,
  AlertCircle,
  Loader2,
  Lock,
  Zap,
} from "lucide-react";
import {
  getCustomApiKey,
  setCustomApiKey,
  removeCustomApiKey,
  maskApiKey,
  verifyGeminiApiKey,
} from "../lib/apiKeyStorage";
import { toast } from "sonner";
import { cn } from "../lib/utils";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyChange?: (hasKey: boolean) => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeyChange }: ApiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [existingKey, setExistingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getCustomApiKey();
      setExistingKey(current);
      setApiKeyInput(current || "");
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isVerifying) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isVerifying, onClose]);

  if (!isOpen) return null;

  async function handleSave() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      removeCustomApiKey();
      setExistingKey(null);
      toast.info("Active tier: Hosted Cloud Demo");
      onKeyChange?.(false);
      onClose();
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { isValid, error: verificationError } = await verifyGeminiApiKey(trimmed);
      if (!isValid) {
        setError(verificationError || "Google Gemini API rejected this key.");
        setIsVerifying(false);
        return;
      }

      setCustomApiKey(trimmed);
      setExistingKey(trimmed);
      toast.success("Gemini API Key verified. Unlimited practice mode activated.");
      onKeyChange?.(true);
      onClose();
    } catch {
      setError("Could not reach Google verification endpoint. Check your network connection.");
    } finally {
      setIsVerifying(false);
    }
  }

  function handleRemove() {
    removeCustomApiKey();
    setExistingKey(null);
    setApiKeyInput("");
    setError(null);
    toast.info("Custom key cleared. Active tier: Hosted Cloud Demo.");
    onKeyChange?.(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-modal-title"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-2xl text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Rail */}
        <div className="flex items-start justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary shrink-0">
              <Key className="size-4" />
            </div>
            <div>
              <h2 id="api-modal-title" className="text-base font-semibold text-foreground">
                Gemini API Configuration
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage practice quota & bring-your-own-key (BYOK) settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors duration-150 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 2-Tier Segmented Comparison */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div
            className={cn(
              "rounded-xl border p-3 transition-colors duration-150 space-y-1.5",
              !existingKey
                ? "border-primary bg-primary/10"
                : "border-border/60 bg-background/50 opacity-60"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Server className="size-3.5 text-primary" />
                Hosted Demo
              </span>
              {!existingKey && (
                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono text-primary font-semibold">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Shared demo pool. 1-click evaluation without personal credentials.
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl border p-3 transition-colors duration-150 space-y-1.5",
              existingKey
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-border/60 bg-background/50"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className={cn("size-3.5", existingKey ? "text-emerald-400" : "text-muted-foreground")} />
                BYOK (Custom)
              </span>
              {existingKey ? (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 font-semibold">
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-mono text-muted-foreground">Unlimited</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Use your free Gemini key for unlimited high-frequency voice practice.
            </p>
          </div>
        </div>

        {/* Input Form Body */}
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="gemini-api-key-input" className="block text-xs font-semibold text-foreground mb-1.5">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                id="gemini-api-key-input"
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="AIzaSy..."
                className={cn(
                  "w-full rounded-xl border bg-background/80 px-3.5 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors duration-150 font-mono",
                  error
                    ? "border-destructive ring-1 ring-destructive/30"
                    : "border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/40"
                )}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive font-medium">
                <AlertCircle className="size-3 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Quick Helper Links */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-medium"
            >
              Get free key from Google AI Studio
              <ExternalLink className="size-3" />
            </a>
            {existingKey && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 text-destructive hover:underline text-[11px] font-medium cursor-pointer"
              >
                <Trash2 className="size-3" />
                Remove custom key
              </button>
            )}
          </div>

          {/* Security & Zero-Persistence Guarantee */}
          <div className="rounded-xl border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
              <Lock className="size-3 text-emerald-400" />
              <span>Zero-Persistence Guarantee</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Your API key is saved exclusively in your browser's <code className="text-foreground font-mono">localStorage</code>. It is never logged or stored on our servers.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/40 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/80 bg-background/60 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Verifying with Google…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                Save & Activate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

