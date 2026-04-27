"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { StepState } from "@/lib/types";
import { Terminal } from "lucide-react";

interface LiveLogProps {
  activeStep: StepState | null;
  allSteps: StepState[];
}

export function LiveLog({ activeStep, allSteps }: LiveLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeStep?.logs]);

  // Get the step to display — active running step, or last completed step
  const displayStep = activeStep || [...allSteps].reverse().find((s) => s.status === "complete" || s.status === "error");

  if (!displayStep || displayStep.logs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted/40">
        <div className="text-center">
          <Terminal className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Agent reasoning will appear here</p>
          <p className="text-xs mt-1 text-text-muted/30">Live output from each pipeline step</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
        <div className={`w-2 h-2 rounded-full ${
          displayStep.status === "running"
            ? "bg-accent animate-pulse-dot"
            : displayStep.status === "complete"
              ? "bg-success"
              : "bg-error"
        }`} />
        <span className="text-xs font-medium text-text-secondary">
          {displayStep.name}
        </span>
        <span className="text-[10px] text-text-muted/50 font-mono">
          Step {displayStep.step}/7
        </span>
      </div>

      {/* Log Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed"
      >
        {displayStep.logs.map((log, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.05 }}
            className="text-text-secondary/80"
          >
            {log}
          </motion.span>
        ))}
        {displayStep.status === "running" && (
          <span className="inline-block w-[6px] h-[15px] bg-accent ml-0.5 -mb-0.5 animate-cursor-blink" />
        )}
      </div>
    </div>
  );
}
