"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/shared/Header";
import { GithubInput } from "@/components/input/GithubInput";
import { InterestInput } from "@/components/input/InterestInput";
import { RunButton } from "@/components/input/RunButton";
import { PipelineTrace } from "@/components/agent-mode/PipelineTrace";
import { SkillProfile } from "@/components/user-mode/SkillProfile";
import { IssueCard } from "@/components/user-mode/IssueCard";
import { APIKeyModal } from "@/components/shared/APIKeyModal";
import { useAPIKeys } from "@/contexts/APIKeyContext";
import type {
  ViewMode,
  StepState,
  PipelineResult,
  PipelineEvent,
} from "@/lib/types";
import { STEP_NAMES } from "@/lib/types";
import { ArrowRight, Zap, Target, Terminal as TerminalIcon, GitFork } from "lucide-react";
import { GitHubIcon } from "@/components/shared/GitHubIcon";
import { HistorySidebar } from "@/components/shared/HistorySidebar";

// ── Initial State ─────────────────────────────────────────

function createInitialSteps(): StepState[] {
  return Array.from({ length: 7 }, (_, i) => ({
    step: i + 1,
    name: STEP_NAMES[i + 1],
    status: "pending",
    logs: [],
    summary: "",
    duration: 0,
  }));
}

const initialResult: PipelineResult = {
  githubData: null,
  skillProfile: null,
  candidateIssues: [],
  codeContexts: [],
  rankedIssues: [],
  claimComments: [],
  cursorPrompts: [],
};

// ── Page ──────────────────────────────────────────────────

export default function HomePage() {
  const { apiKeys } = useAPIKeys();
  const [githubUrl, setGithubUrl] = useState("");
  const [interest, setInterest] = useState("");
  const [mode, setMode] = useState<ViewMode>("agent");
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [steps, setSteps] = useState<StepState[]>(createInitialSteps());
  const [result, setResult] = useState<PipelineResult>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAPIKeyModalOpen, setIsAPIKeyModalOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isValidUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return false;
    return (
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)\/?$/.test(trimmed) ||
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(trimmed)
    );
  }, []);

  const handleRun = useCallback(async (overrides?: { url: string; interest: string }) => {
    const url = overrides ? overrides.url : githubUrl;
    const intr = overrides ? overrides.interest : interest;
    
    if (!isValidUrl(url)) return;

    setIsRunning(true);
    setShowResults(true);
    setIsComplete(false);
    setError(null);
    setSteps(createInitialSteps());
    setResult(initialResult);
    
    if (overrides) {
      setGithubUrl(overrides.url);
      setInterest(overrides.interest);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          githubUrl: url.trim(), 
          interest: intr.trim(),
          githubToken: apiKeys.GITHUB_TOKEN,
          geminiKey: apiKeys.GEMINI_API_KEY,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event: PipelineEvent = JSON.parse(jsonStr);
            handleEvent(event);
          } catch {
            // Skip malformed events
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith("data: ")) {
        try {
          const event: PipelineEvent = JSON.parse(buffer.slice(6).trim());
          handleEvent(event);
        } catch {
          // Skip
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
      setIsComplete(true);
    }
  }, [githubUrl, interest, isValidUrl]);

  const handleEvent = useCallback((event: PipelineEvent) => {
    switch (event.type) {
      case "step_start":
        setSteps((prev) =>
          prev.map((s) =>
            s.step === event.step
              ? { ...s, status: "running" as const, logs: [] }
              : s
          )
        );
        break;

      case "step_log":
        setSteps((prev) =>
          prev.map((s) =>
            s.step === event.step
              ? { ...s, logs: [...s.logs, event.data] }
              : s
          )
        );
        break;

      case "step_complete":
        {
          let summary = "";
          try {
            const data = JSON.parse(event.data);
            summary = data.summary || "";
          } catch {
            summary = event.data.substring(0, 100);
          }
          setSteps((prev) =>
            prev.map((s) =>
              s.step === event.step
                ? {
                    ...s,
                    status: "complete" as const,
                    summary,
                    duration: event.duration || 0,
                  }
                : s
            )
          );
        }
        break;

      case "step_error":
        setSteps((prev) =>
          prev.map((s) =>
            s.step === event.step
              ? {
                  ...s,
                  status: "error" as const,
                  summary: event.data,
                  duration: event.duration || 0,
                  error: event.data,
                }
              : s
          )
        );
        break;

      case "pipeline_complete":
        try {
          const pipelineResult: PipelineResult = JSON.parse(event.data);
          setResult(pipelineResult);
        } catch {
          // Keep existing result
        }
        setIsComplete(true);
        break;
    }
  }, []);

  const hasStarted = isRunning || isComplete || showResults;
  const canGoToResults = result.githubData !== null && !showResults;

  const handleBackHome = () => {
    if (isRunning && abortRef.current) {
      abortRef.current.abort();
    }
    setIsRunning(false);
    setShowResults(false);
    setIsComplete(false);
    setError(null);
    setMode("agent");
  };

  const handleHome = () => {
    if (isRunning && abortRef.current) {
      abortRef.current.abort();
    }
    setIsRunning(false);
    setIsComplete(false);
    setShowResults(false);
    setError(null);
    setMode("agent");
  };

  const handleForwardToResults = () => {
    if (canGoToResults) {
      setShowResults(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        mode={mode}
        onModeToggle={setMode}
        showToggle={hasStarted}
        onHistoryOpen={() => setIsHistoryOpen(true)}
        onBack={handleBackHome}
        onForward={handleForwardToResults}
        onHome={handleHome}
        onSettingsOpen={() => setIsAPIKeyModalOpen(true)}
      />

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={(url, intr) => handleRun({ url, interest: intr })}
      />

      <APIKeyModal
        isOpen={isAPIKeyModalOpen}
        onClose={() => setIsAPIKeyModalOpen(false)}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            /* ── Input Screen ──────────────────────── */
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex items-center justify-center min-h-[calc(100vh-3.5rem)]"
            >
              <div className="w-full max-w-lg mx-auto px-6">
                {/* Hero */}
                <div className="text-center mb-10">
                  <motion.div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/8 border border-accent/15 text-accent text-xs font-medium mb-6"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Zap className="w-3 h-3" />
                    Autonomous Open Source Agent
                  </motion.div>

                  <motion.h1
                    className="text-3xl font-bold text-text-primary tracking-tight mb-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    Find your next
                    <br />
                    <span className="text-accent">open source contribution</span>
                  </motion.h1>

                  <motion.p
                    className="text-sm text-text-muted max-w-md mx-auto leading-relaxed"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Paste your GitHub profile. Tell us what interests you.
                    Our agent analyzes your skills, finds matching issues,
                    and generates everything you need to start contributing.
                  </motion.p>
                </div>

                {/* Form */}
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <GithubInput value={githubUrl} onChange={setGithubUrl} />
                  <InterestInput value={interest} onChange={setInterest} />

                  <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <RunButton
                      onClick={() => handleRun()}
                      disabled={!isValidUrl(githubUrl)}
                      loading={isRunning}
                    />
                    
                  </div>
                </motion.div>

                {/* Features */}
                <motion.div
                  className="mt-10 grid grid-cols-3 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {[
                    { icon: GitFork, label: "Profile Analysis" },
                    { icon: Target, label: "Issue Matching" },
                    { icon: TerminalIcon, label: "Cursor Prompts" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 py-3 rounded-lg text-center"
                    >
                      <Icon className="w-4 h-4 text-text-muted/60" />
                      <span className="text-[11px] text-text-muted/60">
                        {label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          ) : (
            /* ── Results Screen ────────────────────── */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto px-6 py-6"
            >
              
              {/* Error Banner */}
              {error && (
                <motion.div
                  className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {mode === "agent" ? (
                  /* ── Agent Mode ──────────────────── */
                  <motion.div
                    key="agent-mode"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PipelineTrace steps={steps} />

                    {/* Show results below trace when complete */}
                    {isComplete && result.rankedIssues.length > 0 && (
                      <motion.div
                        className="mt-8"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-text-primary">
                            Results
                          </h2>
                          <button
                            onClick={() => setMode("user")}
                            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                          >
                            View in User Mode
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        <ResultsView result={result} />
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  /* ── User Mode ───────────────────── */
                  <motion.div
                    key="user-mode"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isRunning && !result.skillProfile && (
                      <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-sm text-text-muted">
                            Agent is running...
                          </p>
                          <button
                            onClick={() => setMode("agent")}
                            className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
                          >
                            Watch in Agent Mode →
                          </button>
                        </div>
                      </div>
                    )}

                    {(isComplete || result.skillProfile) && (
                      <ResultsView result={result} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Results Sub-Component ─────────────────────────────────

function ResultsView({ result }: { result: PipelineResult }) {
  return (
    <div className="space-y-6">
      {/* Skill Profile */}
      {result.githubData && result.skillProfile && (
        <SkillProfile
          profile={result.githubData.profile}
          skills={result.skillProfile}
        />
      )}

      {/* Issue Cards */}
      {result.rankedIssues.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">
            Matched Issues ({result.rankedIssues.length})
          </h3>
          <div className="space-y-4">
            {result.rankedIssues.map((ri, i) => {
              const comment = result.claimComments.find(
                (c) =>
                  c.rankedIssue.candidate.issue.id ===
                  ri.candidate.issue.id
              );
              const prompt = result.cursorPrompts.find(
                (p) =>
                  p.rankedIssue.candidate.issue.id ===
                  ri.candidate.issue.id
              );

              return (
                <IssueCard
                  key={ri.candidate.issue.id}
                  rankedIssue={ri}
                  claimComment={comment?.comment}
                  cursorPrompt={prompt?.prompt}
                  index={i}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* No Results */}
      {result.rankedIssues.length === 0 && result.skillProfile && (
        <div className="text-center py-16">
          <p className="text-text-muted text-sm">
            No matching issues found. Try adjusting your contribution interest.
          </p>
        </div>
      )}
    </div>
  );
}
