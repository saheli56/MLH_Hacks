"use client";

import { ArrowRight, Loader2 } from "lucide-react";

interface RunButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function RunButton({ onClick, disabled, loading }: RunButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-medium text-sm transition-all duration-200 ${
        disabled || loading
          ? "bg-surface text-text-muted border border-border cursor-not-allowed"
          : "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-[0.98]"
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Agent is running...
        </>
      ) : (
        <>
          Run Agent
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}
