"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  ChevronDown,
  Clock,
  Star,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { ClaimComment } from "./ClaimComment";
import { CursorPrompt } from "./CursorPrompt";
import { Button } from "@/components/ui/button";
import type { RankedIssue } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAPIKeys } from "@/contexts/APIKeyContext";

interface IssueCardProps {
  rankedIssue: RankedIssue;
  claimComment?: string;
  cursorPrompt?: string;
  index: number;
}

function FitScoreRing({ score }: { score: number }) {
  const percentage = (score / 10) * 100;
  const color =
    score >= 7 ? "#10b981" : score >= 5 ? "#f59e0b" : "#ef4444"; // Updated green to emerald
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <motion.circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

export function IssueCard({
  rankedIssue,
  claimComment,
  cursorPrompt,
  index,
}: IssueCardProps) {
  const [expandedSection, setExpandedSection] = useState<
    "comment" | "prompt" | "maintainers" | "triage" | null
  >(null);

  const { candidate } = rankedIssue;
  const langColor = "#9ca3af"; // muted neutral dot for languages

  const complexityConfig = {
    low: { label: "Low", variant: "default" as const },
    medium: { label: "Medium", variant: "secondary" as const },
    high: { label: "High", variant: "destructive" as const },
  };
  const complexity = complexityConfig[rankedIssue.complexityLevel];

  const toggleSection = (section: "comment" | "prompt") => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // Maintainers state
  const [maintainers, setMaintainers] = useState<any[] | null>(null);
  const [loadingMaintainers, setLoadingMaintainers] = useState(false);

  const { apiKeys } = useAPIKeys();

  // Triage state
  const [triageData, setTriageData] = useState<any | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<string | null>(null);

  const fetchMaintainers = async () => {
    if (maintainers !== null) return; // already fetched or empty
    setLoadingMaintainers(true);
    try {
      const res = await fetch(`/api/github/maintainers?owner=${candidate.repoOwner}&repo=${candidate.repoName}`);
      if (!res.ok) throw new Error("Failed to fetch maintainers");
      const data = await res.json();
      setMaintainers(Array.isArray(data) ? data : []);
    } catch (e) {
      setMaintainers([]);
    } finally {
      setLoadingMaintainers(false);
    }
  };

  const handleTriage = async () => {
    // toggle off if already present
    if (triageData) {
      setTriageData(null);
      setExpandedSection(null);
      return;
    }

    setTriageLoading(true);
    try {
      const res = await fetch(`/api/github/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          owner: candidate.repoOwner,
          repo: candidate.repoName,
          issueNumber: candidate.issue.number,
          title: candidate.issue.title,
          body: candidate.issue.body,
          githubToken: apiKeys.GITHUB_TOKEN,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Triage generation failed");
      setTriageData(data);
      setExpandedSection("triage");
    } catch (e) {
      setTriageData({ error: e instanceof Error ? e.message : String(e) });
      setExpandedSection("triage");
    } finally {
      setTriageLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!triageData || !triageData.comment) return;
    if (!apiKeys.GITHUB_TOKEN) {
      setPostStatus("GitHub token required to post a comment.");
      return;
    }

    setPostingComment(true);
    setPostStatus(null);
    try {
      const res = await fetch(`/api/github/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "applyComment",
          owner: candidate.repoOwner,
          repo: candidate.repoName,
          issueNumber: candidate.issue.number,
          comment: triageData.comment,
          githubToken: apiKeys.GITHUB_TOKEN,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to post comment");
      setTriageData((prev: any) => ({ ...prev, posted: true, postResult: data.result }));
      setPostStatus("Comment posted successfully.");
    } catch (e) {
      setTriageData((prev: any) => ({ ...prev, postError: e instanceof Error ? e.message : String(e) }));
      setPostStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="overflow-hidden border transition-all duration-200 hover:shadow-lg">
        {/* Header */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <FitScoreRing score={rankedIssue.fitScore} />

            <div className="flex-1 min-w-0">
              {/* Repo Name */}
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-muted-foreground/40" />
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {candidate.repoFullName}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Star className="w-3 h-3" />
                  {candidate.repoStars.toLocaleString()}
                </div>
              </div>

              {/* Issue Title */}
              <a
                href={candidate.issue.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 group"
              >
                <span className="line-clamp-2">{candidate.issue.title}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>

              {/* Labels */}
              {candidate.issue.labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {candidate.issue.labels.slice(0, 4).map((label) => (
                    <Badge
                      key={label.name}
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Why It Fits */}
            <div className="mt-4 p-3 rounded-lg bg-background/50 border">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Why it fits you
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {rankedIssue.whyItFits}
            </p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {rankedIssue.estimatedTime}
            </div>
            <Badge variant={complexity.variant} className="text-[10px]">
              {complexity.label} complexity
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {candidate.issue.comments} comments
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <GitBranch className="w-3 h-3" />
              #{candidate.issue.number}
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleTriage}>
                {triageLoading ? "Generating…" : triageData ? "Hide Triage" : "Auto-Triage"}
              </Button>
            </div>
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="border-t">
          {/* Claim Comment Toggle */}
          {claimComment && (
            <Collapsible
              open={expandedSection === "comment"}
              onOpenChange={() => toggleSection("comment")}
            >
              <CollapsibleTrigger asChild>
                <button
                  className="w-full flex items-center justify-between px-5 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Claim Comment
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      expandedSection === "comment" ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-4">
                  <ClaimComment comment={claimComment} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Maintainers Toggle */}
          <Collapsible
            open={expandedSection === "maintainers"}
            onOpenChange={() => {
              setExpandedSection((prev) => (prev === "maintainers" ? null : "maintainers"));
              // fetch when opening
              if (expandedSection !== "maintainers") fetchMaintainers();
            }}
          >
            <CollapsibleTrigger asChild>
              <button
                className={`w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/50 transition-colors text-foreground`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <GitBranch className="w-3.5 h-3.5" />
                  Maintainers
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedSection === "maintainers" ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-4">
                {loadingMaintainers && (
                  <div className="text-sm text-muted-foreground">Loading maintainers…</div>
                )}

                {!loadingMaintainers && maintainers && maintainers.length === 0 && (
                  <div className="text-sm text-muted-foreground">No maintainers found.</div>
                )}

                {!loadingMaintainers && maintainers && maintainers.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {maintainers.map((m) => (
                      <a key={m.login} href={m.html_url || `https://github.com/${m.login}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                        <img src={m.avatar_url} alt={m.login} className="w-8 h-8 rounded-md border" />
                        <div className="text-sm">
                          <div className="font-medium text-foreground">{m.login}</div>
                          {m.contributions ? (
                            <div className="text-xs text-muted-foreground">{m.contributions} contributions</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">{m.source}</div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          {/* Auto-Triage Toggle */}
          <Collapsible
            open={expandedSection === "triage"}
            onOpenChange={() => setExpandedSection((prev) => (prev === "triage" ? null : "triage"))}
            className={"border-t"}
          >
            <CollapsibleTrigger asChild>
              <button
                className={`w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/50 transition-colors text-foreground`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Auto-Triage
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedSection === "triage" ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-4">
                {triageLoading && <div className="text-sm text-muted-foreground">Generating suggestions…</div>}

                {!triageLoading && triageData && (
                  <div className="space-y-3">
                    {triageData.error && (
                      <div className="text-sm text-destructive">
                        {triageData.error}
                        {triageData.fallback && " (Using fallback template generation.)"}
                      </div>
                    )}

                    {triageData.comment && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Suggested comment</p>
                        <ClaimComment comment={triageData.comment} />
                      </div>
                    )}

                    {triageData.prTemplate?.body && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">PR Template</p>
                        <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-sm">{triageData.prTemplate.body}</pre>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                      <Button onClick={handlePostComment} disabled={postingComment || !triageData.comment}>
                        {postingComment ? "Posting…" : "Post Comment"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const targetUrl = triageData?.prUrl || (triageData?.prTemplate?.title && triageData?.prTemplate?.body
                            ? `https://github.com/${candidate.repoFullName}/compare?expand=1&title=${encodeURIComponent(triageData.prTemplate.title)}&body=${encodeURIComponent(triageData.prTemplate.body)}`
                            : "");
                          if (targetUrl) {
                            window.open(targetUrl, "_blank", "noopener,noreferrer");
                          }
                        }}
                        disabled={!triageData?.prUrl && !(triageData?.prTemplate?.title && triageData?.prTemplate?.body)}
                      >
                        Open PR Draft
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(triageData.prTemplate?.body || "");
                            setCopyStatus("PR template copied to clipboard.");
                          } catch (copyError) {
                            setCopyStatus("Unable to copy PR template.");
                          }
                        }}
                        disabled={!triageData?.prTemplate?.body}
                      >
                        Copy PR Template
                      </Button>
                    </div>
                    {copyStatus && <div className="text-xs text-muted-foreground">{copyStatus}</div>}
                    {postStatus && <div className={`text-xs ${postStatus.includes("success") ? "text-emerald-500" : "text-destructive"}`}>{postStatus}</div>}
                    </div>
                  </div>
                )}

                {!triageLoading && !triageData && (
                  <div className="text-sm text-muted-foreground">Click Auto-Triage to generate suggestions.</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          {/* Cursor Prompt Toggle */}
          {cursorPrompt && (
            <Collapsible
              open={expandedSection === "prompt"}
              onOpenChange={() => toggleSection("prompt")}
              className={claimComment ? "border-t" : ""}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/50 transition-colors ${
                    expandedSection === "prompt"
                      ? "text-foreground"
                      : "text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9zM3.5 3a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-9z"/>
                      <path d="M5 6.5l2.5 2L5 10.5M8.5 10.5H11"/>
                    </svg>
                    Cursor Prompt
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      expandedSection === "prompt" ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-4">
                  <CursorPrompt prompt={cursorPrompt} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
