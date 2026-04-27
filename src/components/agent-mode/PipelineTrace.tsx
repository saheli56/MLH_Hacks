"use client";

import { useState } from "react";
import { StepCard } from "./StepCard";
import { LiveLog } from "./LiveLog";
import type { StepState } from "@/lib/types";

interface PipelineTraceProps {
  steps: StepState[];
}

export function PipelineTrace({ steps }: PipelineTraceProps) {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Auto-select the currently running step
  const runningStep = steps.find((s) => s.status === "running");
  const activeStepIndex = selectedStep ?? runningStep?.step ?? null;
  const activeStep = activeStepIndex ? steps.find((s) => s.step === activeStepIndex) || null : null;

  return (
    <div className="flex gap-0 h-[calc(100vh-12rem)] min-h-[500px] rounded-xl border border-border overflow-hidden bg-surface/30">
      {/* Step List — Left Panel */}
      <div className="w-[320px] flex-shrink-0 border-r border-border/50 flex flex-col">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Pipeline Steps
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {steps.map((step) => (
            <div key={step.step} className="relative">
              {/* Connector Line */}
              {step.step < 7 && (
                <div className="absolute left-[22px] top-[36px] w-[1px] h-[8px] bg-border/30" />
              )}
              <StepCard
                step={step}
                isActive={step.step === activeStepIndex}
                onClick={() => setSelectedStep(step.step)}
              />
            </div>
          ))}
        </div>

        {/* Total Time */}
        {steps.every((s) => s.status === "complete" || s.status === "error") && (
          <div className="px-4 py-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Total time</span>
              <span className="font-mono text-text-secondary">
                {(steps.reduce((sum, s) => sum + s.duration, 0) / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Log — Right Panel */}
      <div className="flex-1 bg-background/50">
        <LiveLog activeStep={activeStep} allSteps={steps} />
      </div>
    </div>
  );
}
