"use client";

import { ModeToggle } from "./ModeToggle";
import type { ViewMode } from "@/lib/types";
import { GitHubIcon } from "./GitHubIcon";
import { History, ArrowLeft, ArrowRight } from "lucide-react";

interface HeaderProps {
  mode: ViewMode;
  onModeToggle: (mode: ViewMode) => void;
  showToggle?: boolean;
  onHistoryOpen: () => void;
  onBack?: () => void;
  onForward?: () => void;
}

export function Header({ mode, onModeToggle, showToggle = false, onHistoryOpen, onBack, onForward }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 glass-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: navigation + logo */}
        <div className="flex items-center gap-2.5">
          {/* Back / Forward controls */}
          <div className="flex items-center gap-2 mr-2">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/3 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {onForward && (
              <button
                onClick={onForward}
                aria-label="Forward"
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/3 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <GitHubIcon className="w-4 h-4 text-accent" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-text-primary">
            OpenAgent
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* History Button */}
          <button
            onClick={onHistoryOpen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-text-muted hover:text-text-primary"
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>

          {/* Mode Toggle */}
          {showToggle && (
            <ModeToggle mode={mode} onToggle={onModeToggle} />
          )}
        </div>
      </div>
    </header>
  );
}
