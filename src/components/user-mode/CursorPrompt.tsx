"use client";

import { CopyButton } from "../shared/CopyButton";
import { Terminal, Sparkles } from "lucide-react";

interface CursorPromptProps {
  prompt: string;
}

export function CursorPrompt({ prompt }: CursorPromptProps) {
  return (
    <div className="rounded-lg border border-accent/20 bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-accent/5 border-b border-accent/15">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent/15 flex items-center justify-center">
            <Terminal className="w-3 h-3 text-accent" />
          </div>
          <div>
            <span className="text-xs font-medium text-accent">
              Ready to paste into Cursor or Claude Code
            </span>
          </div>
        </div>
        <CopyButton text={prompt} label="Copy Prompt" variant="large" />
      </div>

      {/* Prompt Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        <pre className="code-block text-text-secondary whitespace-pre-wrap break-words">
          {prompt}
        </pre>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-surface/50 border-t border-border/30 flex items-center gap-2">
        <Sparkles className="w-3 h-3 text-accent/60" />
        <span className="text-[11px] text-text-muted">
          This prompt includes full repo context, the exact issue, relevant code, and a suggested approach
        </span>
      </div>
    </div>
  );
}
