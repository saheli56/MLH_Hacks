// ── GitHub API Types ──────────────────────────────────────

export interface GitHubProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
  created_at: string;
  location: string | null;
  company: string | null;
  blog: string | null;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  size: number;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
}

export interface GitHubData {
  profile: GitHubProfile;
  repos: GitHubRepo[];
  events: GitHubEvent[];
}

// ── Skill Profile ─────────────────────────────────────────

export interface SkillProfile {
  primaryLanguages: string[];
  frameworks: string[];
  experienceLevel: "beginner" | "intermediate" | "advanced";
  projectTypes: string[];
  preferredDomains: string[];
  summary: string;
}

// ── Issues & Candidates ──────────────────────────────────

export interface GitHubIssueSearchItem {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  labels: { name: string; color: string }[];
  state: string;
  created_at: string;
  updated_at: string;
  comments: number;
  repository_url: string;
  user: { login: string; avatar_url: string } | null;
}

export interface CandidateIssue {
  issue: GitHubIssueSearchItem;
  repoOwner: string;
  repoName: string;
  repoFullName: string;
  repoStars: number;
  repoLanguage: string | null;
  repoDescription: string | null;
  repoLastPushed: string;
}

// ── Code Context ──────────────────────────────────────────

export interface CodeContext {
  candidate: CandidateIssue;
  repoStructure: string[];
  relevantFilePath: string;
  relevantFileContent: string;
  truncated: boolean;
}

// ── Ranked Issues ─────────────────────────────────────────

export interface RankedIssue {
  candidate: CandidateIssue;
  codeContext: CodeContext;
  fitScore: number;
  reasoning: string;
  complexityLevel: "low" | "medium" | "high";
  estimatedTime: string;
  whyItFits: string;
}

// ── Outputs ───────────────────────────────────────────────

export interface ClaimComment {
  rankedIssue: RankedIssue;
  comment: string;
}

export interface CursorPrompt {
  rankedIssue: RankedIssue;
  prompt: string;
}

// ── Pipeline Events (SSE) ─────────────────────────────────

export type PipelineEventType =
  | "step_start"
  | "step_log"
  | "step_complete"
  | "step_error"
  | "pipeline_complete";

export interface PipelineEvent {
  type: PipelineEventType;
  step: number;
  stepName: string;
  data: string;
  duration?: number;
  timestamp: number;
}

// ── Pipeline Result ───────────────────────────────────────

export interface PipelineResult {
  githubData: GitHubData | null;
  skillProfile: SkillProfile | null;
  candidateIssues: CandidateIssue[];
  codeContexts: CodeContext[];
  rankedIssues: RankedIssue[];
  claimComments: ClaimComment[];
  cursorPrompts: CursorPrompt[];
}

// ── Frontend State ────────────────────────────────────────

export type StepStatus = "pending" | "running" | "complete" | "error";

export interface StepState {
  step: number;
  name: string;
  status: StepStatus;
  logs: string[];
  summary: string;
  duration: number;
  error?: string;
}

export const STEP_NAMES: Record<number, string> = {
  1: "GitHub Profile Reader",
  2: "Skill Extractor",
  3: "Issue Hunter",
  4: "Code Reader",
  5: "Fit Scorer",
  6: "Comment Drafter",
  7: "Cursor Prompt Generator",
};

export const STEP_DESCRIPTIONS: Record<number, string> = {
  1: "Reading GitHub profile, repos, and activity",
  2: "Analyzing skills and experience level",
  3: "Searching for matching open issues",
  4: "Fetching relevant code from repositories",
  5: "Scoring issue fit based on your skills",
  6: "Drafting professional claim comments",
  7: "Generating ready-to-use Cursor prompts",
};

export type ViewMode = "user" | "agent";

export interface AgentState {
  mode: ViewMode;
  isRunning: boolean;
  isComplete: boolean;
  steps: StepState[];
  result: PipelineResult;
  githubUrl: string;
  interest: string;
  error: string | null;
}

// ── Language Colors (GitHub-style) ────────────────────────

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  R: "#198CE7",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Lua: "#000080",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
  Clojure: "#db5855",
  Erlang: "#B83998",
  Jupyter: "#DA5B0B",
};
