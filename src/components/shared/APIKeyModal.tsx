"use client";

import React, { useState, useEffect } from "react";
import { useAPIKeys } from "@/contexts/APIKeyContext";
import { X, AlertCircle, CheckCircle } from "lucide-react";

interface APIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function APIKeyModal({ isOpen, onClose }: APIKeyModalProps) {
  const { apiKeys, setAPIKeys, clearKeys } = useAPIKeys();
  const [githubToken, setGithubToken] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [serperKey, setSerperKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGithubToken(apiKeys.GITHUB_TOKEN || "");
    setGeminiKey(apiKeys.GEMINI_API_KEY || "");
    setSerperKey(apiKeys.SERPER_API_KEY || "");
  }, [apiKeys, isOpen]);

  const handleSave = () => {
    setAPIKeys({
      GITHUB_TOKEN: githubToken || undefined,
      GEMINI_API_KEY: geminiKey || undefined,
      SERPER_API_KEY: serperKey || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setGithubToken("");
    setGeminiKey("");
    setSerperKey("");
    clearKeys();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">API Keys</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="flex gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20 text-sm text-text-muted">
            <AlertCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p>
              API keys are stored locally in your browser. They are <strong>never</strong> sent to our servers.
            </p>
          </div>

          {/* GitHub Token Input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              GitHub Token
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxx..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-white/3 text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-xs text-text-muted mt-1">
              Get one from <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GitHub Settings</a>
            </p>
          </div>

          {/* Gemini API Key Input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-white/3 text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-xs text-text-muted mt-1">
              Get one from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google AI Studio</a>
            </p>
          </div>

          {/* Serper API Key Input (Optional) */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Serper API Key <span className="text-text-muted text-xs">(Optional)</span>
            </label>
            <input
              type="password"
              value={serperKey}
              onChange={(e) => setSerperKey(e.target.value)}
              placeholder="Your Serper key..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-white/3 text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-xs text-text-muted mt-1">
              Get one from <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Serper.dev</a>
            </p>
          </div>

          {/* Success Message */}
          {saved && (
            <div className="flex gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>API keys saved successfully!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-white/2 hover:bg-white/5 text-text-primary transition-colors text-sm font-medium"
          >
            Clear All
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground transition-colors text-sm font-medium"
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
}
