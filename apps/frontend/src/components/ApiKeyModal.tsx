import React, { useState, useEffect } from "react";
import {
  Key,
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  Sparkles,
  X,
  Server,
  AlertCircle,
} from "lucide-react";
import {
  getCustomApiKey,
  setCustomApiKey,
  removeCustomApiKey,
  maskApiKey,
  validateApiKeyFormat,
} from "../lib/apiKeyStorage";
import { toast } from "sonner";

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

  useEffect(() => {
    if (isOpen) {
      const current = getCustomApiKey();
      setExistingKey(current);
      setApiKeyInput(current || "");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSave() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      removeCustomApiKey();
      setExistingKey(null);
      toast.info("Switched to Hosted Demo tier");
      onKeyChange?.(false);
      onClose();
      return;
    }

    const { isValid, error: validationError } = validateApiKeyFormat(trimmed);
    if (!isValid) {
      setError(validationError || "Invalid Gemini API key format.");
      return;
    }

    setCustomApiKey(trimmed);
    setExistingKey(trimmed);
    toast.success("Gemini API Key saved! Unlimited practice mode enabled.");
    onKeyChange?.(true);
    onClose();
  }

  function handleRemove() {
    removeCustomApiKey();
    setExistingKey(null);
    setApiKeyInput("");
    setError(null);
    toast.info("Custom key removed. Reverted to Hosted Cloud Demo tier.");
    onKeyChange?.(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Key className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Runtime & Model Settings</h3>
              <p className="text-xs text-muted-foreground">Manage Gemini API quota & access tier</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Current Tier Status Banner */}
        <div className="mt-4 rounded-xl border border-border/50 bg-background/50 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {existingKey ? (
                <div className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Sparkles className="size-3.5" />
                </div>
              ) : (
                <div className="grid size-7 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Server className="size-3.5" />
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-foreground">
                  {existingKey ? "Custom API Key Active (BYOK)" : "Hosted Cloud Demo Active"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {existingKey
                    ? `Using key: ${maskApiKey(existingKey)} (Unlimited Practice)`
                    : "Zero setup required (Recruiter 1-click evaluation)"}
                </div>
              </div>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                existingKey
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              }`}
            >
              {existingKey ? "Unlimited" : "Demo Tier"}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Google Gemini API Key (Optional)
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="AIzaSy..."
                className={`w-full rounded-xl border ${
                  error ? "border-destructive/80" : "border-border/80"
                } bg-background/80 px-3.5 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="size-3" />
                {error}
              </p>
            )}
          </div>

          {/* Links & Info */}
          <div className="flex items-center justify-between text-[11px]">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Get free key from Google AI Studio
              <ExternalLink className="size-3" />
            </a>
            {existingKey && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 text-destructive hover:underline"
              >
                <Trash2 className="size-3" />
                Remove custom key
              </button>
            )}
          </div>

          {/* Privacy Note */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              Privacy & Zero-Persistence Guarantee
            </div>
            <p className="text-[10px] leading-relaxed">
              Your API key is stored <strong>only in your browser's localStorage</strong>. It is transmitted securely over TLS to power your live voice session and is <strong>never persisted to our database</strong> or logged to disk.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/40 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/80 bg-background/60 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <CheckCircle2 className="size-3.5" />
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
