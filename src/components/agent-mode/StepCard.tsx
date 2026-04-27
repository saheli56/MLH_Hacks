"use client";

import { motion } from "framer-motion";
import { Check, X, Loader2, Circle, Clock } from "lucide-react";
import type { StepState } from "@/lib/types";
import { STEP_DESCRIPTIONS } from "@/lib/types";

interface StepCardProps {
  step: StepState;
  isActive: boolean;
  onClick: () => void;
}

export function StepCard({ step, isActive, onClick }: StepCardProps) {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <motion.button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
        isActive
          ? "bg-accent/8 border-accent/25"
          : step.status === "complete"
            ? "bg-surface/50 border-border/50 hover:bg-surface hover:border-border"
            : step.status === "error"
              ? "bg-error/5 border-error/20"
              : "bg-transparent border-transparent hover:bg-surface/30"
      }`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: step.step * 0.05 }}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5 flex-shrink-0">
          {step.status === "pending" && (
            <Circle className="w-4 h-4 text-text-muted/40" />
          )}
          {step.status === "running" && (
            <Loader2 className="w-4 h-4 text-accent animate-spin" />
          )}
          {step.status === "complete" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check className="w-4 h-4 text-success" />
            </motion.div>
          )}
          {step.status === "error" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <X className="w-4 h-4 text-error" />
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted/60 tabular-nums">
              {String(step.step).padStart(2, "0")}
            </span>
            <span
              className={`text-sm font-medium truncate ${
                step.status === "running"
                  ? "text-accent"
                  : step.status === "complete"
                    ? "text-text-primary"
                    : step.status === "error"
                      ? "text-error"
                      : "text-text-muted"
              }`}
            >
              {step.name}
            </span>
          </div>

          {step.status === "pending" && (
            <p className="text-xs text-text-muted/50 mt-0.5">
              {STEP_DESCRIPTIONS[step.step]}
            </p>
          )}

          {step.status === "running" && (
            <p className="text-xs text-accent/70 mt-0.5">
              {STEP_DESCRIPTIONS[step.step]}
            </p>
          )}

          {step.summary && (step.status === "complete" || step.status === "error") && (
            <p className={`text-xs mt-0.5 truncate ${
              step.status === "error" ? "text-error/70" : "text-text-muted"
            }`}>
              {step.summary}
            </p>
          )}
        </div>

        {/* Duration */}
        {step.duration > 0 && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted/60 flex-shrink-0 mt-0.5">
            <Clock className="w-3 h-3" />
            {formatDuration(step.duration)}
          </div>
        )}
      </div>
    </motion.button>
  );
}
