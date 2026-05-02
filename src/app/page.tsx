"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/shared/Header";
import { GithubInput } from "@/components/input/GithubInput";
import { RepoInput } from "@/components/input/RepoInput";
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
import { ArrowRight, Zap, Target, Terminal as TerminalIcon, GitFork, XCircle, AlertTriangle } from "lucide-react";
import { GitHubIcon } from "@/components/shared/GitHubIcon";
import { HistorySidebar } from "@/components/shared/HistorySidebar";
import RepoFitBanner from "@/components/shared/RepoFitBanner"; // Importing the new RepoFitBanner component

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
  const [repoUrl, setRepoUrl] = useState("");
  const [interest, setInterest] = useState("");
  const [mode, setMode] = useState<ViewMode>("agent");
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [steps, setSteps] = useState<StepState[]>(createInitialSteps());
  const [result, setResult] = useState<PipelineResult>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [pipelineHaltMessage, setPipelineHaltMessage] = useState<string | null>(null);
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

  const isValidRepoUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return true;
    return (
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/.*)?$/.test(trimmed) ||
      /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)
    );
  }, []);

  const handleRun = useCallback(async (overrides?: { url: string; interest: string; repo?: string }) => {
    const url = overrides ? overrides.url : githubUrl;
    const repo = overrides ? overrides.repo || "" : repoUrl;
    const intr = overrides ? overrides.interest : interest;
    
    if (!isValidUrl(url) || !isValidRepoUrl(repo)) return;

    setIsRunning(true);
    setShowResults(true);
    setIsComplete(false);
    setError(null);
    setPipelineHaltMessage(null);
    setSteps(createInitialSteps());
    setResult(initialResult);
    
    if (overrides) {
      setGithubUrl(overrides.url);
      setRepoUrl(overrides.repo || "");
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
          repoUrl: repo.trim(),
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
  }, [githubUrl, interest, repoUrl, isValidUrl, isValidRepoUrl]);

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
        // Clear any previous pipeline halt message on new step
        setPipelineHaltMessage(null);
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
        setPipelineHaltMessage(`${event.stepName || "Step"}: ${event.data}`);
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

  const handleRelaxRepo = () => {
    // Re-run without a repository constraint to broaden matches
    handleRun({ url: githubUrl, interest, repo: "" });
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
        onSelect={(url, intr, repo) => handleRun({ url, interest: intr, repo })}
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
                    Paste your GitHub profile and an optional repository. Tell us what interests you.
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
                  <RepoInput value={repoUrl} onChange={setRepoUrl} />
                  <InterestInput value={interest} onChange={setInterest} />
                  <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <RunButton
                      onClick={() => handleRun()}
                      disabled={!isValidUrl(githubUrl) || !isValidRepoUrl(repoUrl)}
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

                    {/* Show results below trace when complete (render even if no ranked issues so we can show fit messages) */}
                    {isComplete && (
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
                        <ResultsView result={result} repoUrl={repoUrl} interest={interest} onRelaxRepo={handleRelaxRepo} haltMessage={pipelineHaltMessage} />
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
                      <ResultsView result={result} repoUrl={repoUrl} interest={interest} onRelaxRepo={handleRelaxRepo} haltMessage={pipelineHaltMessage} />
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

function ResultsView({ result, repoUrl, interest, onRelaxRepo, haltMessage }: { result: PipelineResult; repoUrl?: string; interest?: string; onRelaxRepo?: () => void; haltMessage?: string | null }) {
  const parseRepoFullName = (raw: string | undefined) => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/);
    if (m) return `${m[1]}/${m[2]}`.toLowerCase();
    const d = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (d) return `${d[1]}/${d[2]}`.toLowerCase();
    return null;
  };

  const target = parseRepoFullName(repoUrl);
  const repoMatches = target
    ? result.rankedIssues.filter((ri) => ri.candidate.repoFullName && ri.candidate.repoFullName.toLowerCase() === target)
    : [];
  const topRepoScore = repoMatches.length > 0 ? Math.max(...repoMatches.map((r) => r.fitScore || 0)) : 0;
  const repoIsPoorFit = !!target && (repoMatches.length === 0 || topRepoScore < 4);
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
      {haltMessage && (
        <RepoFitBanner
          variant="error"
          title="We stopped here"
          message={haltMessage}
          actionLabel="Search across other repos"
          onAction={() => onRelaxRepo && onRelaxRepo()}
        />
      )}

      {repoIsPoorFit && (
        <RepoFitBanner
          variant="warning"
          title="This repository may not be a good fit"
          message={`We couldn't find strong matches between your skills/interest and issues in`}
          actionLabel="Search across other repos"
          onAction={() => onRelaxRepo && onRelaxRepo()}
          repoName={target}
          showCopy
        />
      )}
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
