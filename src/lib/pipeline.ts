import type {
  PipelineEvent,
  PipelineResult,
  SkillProfile,
  CodeContext,
  RankedIssue,
  ClaimComment,
  CursorPrompt,
} from "./types";
import {
  fetchGitHubData,
  searchMatchingIssues,
  fetchRepoContents,
  fetchFileContent,
  guessRelevantFile,
} from "./github";
import {
  callGeminiStreaming,
  extractJSON,
  REASONING_MODEL,
  LITE_MODEL,
  FALLBACK_MODEL,
} from "./gemini";
import {
  buildSkillExtractionPrompt,
  buildFitScoringPrompt,
  buildCommentDraftPrompt,
  buildCursorPromptGeneration,
} from "./prompts";

// ── Types ─────────────────────────────────────────────────

type EventEmitter = (event: PipelineEvent) => void;

function makeEvent(
  type: PipelineEvent["type"],
  step: number,
  stepName: string,
  data: string,
  duration?: number
): PipelineEvent {
  return { type, step, stepName, data, duration, timestamp: Date.now() };
}

// ── Pipeline ──────────────────────────────────────────────

export async function runPipeline(
  username: string,
  interest: string,
  emit: EventEmitter,
  customGithubToken?: string,
  customGeminiKey?: string
): Promise<PipelineResult> {
  const result: PipelineResult = {
    githubData: null,
    skillProfile: null,
    candidateIssues: [],
    codeContexts: [],
    rankedIssues: [],
    claimComments: [],
    cursorPrompts: [],
  };

  // ── STEP 1: GitHub Profile Reader ─────────────────────
  let stepStart = Date.now();
  emit(makeEvent("step_start", 1, "GitHub Profile Reader", "Fetching GitHub profile, repos, and recent activity..."));

  try {
    result.githubData = await fetchGitHubData(username, customGithubToken);
    const repoCount = result.githubData.repos.length;
    const langs = [...new Set(result.githubData.repos.map((r) => r.language).filter(Boolean))];
    const duration = Date.now() - stepStart;

    emit(
      makeEvent(
        "step_complete",
        1,
        "GitHub Profile Reader",
        JSON.stringify({
          summary: `Found ${repoCount} repos across ${langs.length} languages: ${langs.slice(0, 5).join(", ")}`,
          profile: result.githubData.profile.login,
          repos: repoCount,
          languages: langs.slice(0, 5),
        }),
        duration
      )
    );
  } catch (err) {
    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_error",
        1,
        "GitHub Profile Reader",
        `Failed to fetch GitHub data: ${err instanceof Error ? err.message : "Unknown error"}`,
        duration
      )
    );
    emit(makeEvent("pipeline_complete", 0, "", JSON.stringify(result)));
    return result;
  }

  // ── STEP 2: Skill Extractor ───────────────────────────
  stepStart = Date.now();
  emit(makeEvent("step_start", 2, "Skill Extractor", "Analyzing GitHub profile to extract skill profile..."));

  try {
    const prompt = buildSkillExtractionPrompt(result.githubData);
    const rawResponse = await callGeminiStreaming(REASONING_MODEL, FALLBACK_MODEL, prompt, (chunk) => {
      emit(makeEvent("step_log", 2, "Skill Extractor", chunk));
    }, customGeminiKey);

    result.skillProfile = extractJSON<SkillProfile>(rawResponse);
    const duration = Date.now() - stepStart;

    emit(
      makeEvent(
        "step_complete",
        2,
        "Skill Extractor",
        JSON.stringify({
          summary: `${result.skillProfile.experienceLevel} developer — ${result.skillProfile.primaryLanguages.slice(0, 3).join(", ")}`,
          skillProfile: result.skillProfile,
        }),
        duration
      )
    );
  } catch (err) {
    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_error",
        2,
        "Skill Extractor",
        `Failed to extract skills: ${err instanceof Error ? err.message : "Unknown error"}`,
        duration
      )
    );
    // Use fallback skill profile
    result.skillProfile = {
      primaryLanguages: [...new Set(result.githubData.repos.map((r) => r.language).filter(Boolean))] as string[],
      frameworks: [],
      experienceLevel: "intermediate",
      projectTypes: [],
      preferredDomains: [],
      summary: `Developer with ${result.githubData.repos.length} public repositories.`,
    };
  }

  // ── STEP 3: Issue Hunter ──────────────────────────────
  stepStart = Date.now();
  emit(makeEvent("step_start", 3, "Issue Hunter", `Searching for open issues matching ${result.skillProfile.primaryLanguages.slice(0, 2).join(", ")} + "${interest}"...`));

  try {
    result.candidateIssues = await searchMatchingIssues(
      result.skillProfile.primaryLanguages,
      interest,
      customGithubToken
    );
    const duration = Date.now() - stepStart;

    emit(
      makeEvent(
        "step_complete",
        3,
        "Issue Hunter",
        JSON.stringify({
          summary: `Found ${result.candidateIssues.length} matching issues across ${new Set(result.candidateIssues.map((c) => c.repoFullName)).size} repos`,
          count: result.candidateIssues.length,
          repos: [...new Set(result.candidateIssues.map((c) => c.repoFullName))].slice(0, 5),
        }),
        duration
      )
    );
  } catch (err) {
    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_error",
        3,
        "Issue Hunter",
        `Failed to search issues: ${err instanceof Error ? err.message : "Unknown error"}`,
        duration
      )
    );
    emit(makeEvent("pipeline_complete", 0, "", JSON.stringify(result)));
    return result;
  }

  if (result.candidateIssues.length === 0) {
    emit(
      makeEvent(
        "step_error",
        3,
        "Issue Hunter",
        "No matching issues found. Try a different interest area.",
        Date.now() - stepStart
      )
    );
    emit(makeEvent("pipeline_complete", 0, "", JSON.stringify(result)));
    return result;
  }

  // ── STEP 4: Code Reader ───────────────────────────────
  stepStart = Date.now();
  emit(makeEvent("step_start", 4, "Code Reader", `Fetching code from ${result.candidateIssues.length} repositories...`));

  try {
    const codePromises = result.candidateIssues.map(async (candidate) => {
      try {
        const contents = await fetchRepoContents(
          candidate.repoOwner,
          candidate.repoName,
          "",
          customGithubToken
        );
        const repoStructure = contents.map((c) => `${c.type === "dir" ? "📁" : "📄"} ${c.path}`);

        const relevantPath = guessRelevantFile(
          candidate.issue.title,
          candidate.issue.body,
          contents
        );

        let fileContent = "";
        let actualPath = relevantPath || "README.md";
        let truncated = false;

        if (relevantPath) {
          try {
            fileContent = await fetchFileContent(
              candidate.repoOwner,
              candidate.repoName,
              relevantPath,
              customGithubToken
            );
            // Truncate to 300 lines
            const lines = fileContent.split("\n");
            if (lines.length > 300) {
              fileContent = lines.slice(0, 300).join("\n") + "\n\n... (truncated)";
              truncated = true;
            }
          } catch {
            fileContent = "(Could not fetch file content)";
          }
        }

        return {
          candidate,
          repoStructure,
          relevantFilePath: actualPath,
          relevantFileContent: fileContent,
          truncated,
        } as CodeContext;
      } catch {
        return {
          candidate,
          repoStructure: [],
          relevantFilePath: "unknown",
          relevantFileContent: "(Could not access repository)",
          truncated: false,
        } as CodeContext;
      }
    });

    result.codeContexts = await Promise.all(codePromises);
    const duration = Date.now() - stepStart;

    const successCount = result.codeContexts.filter(
      (c) => c.relevantFileContent !== "(Could not access repository)"
    ).length;

    emit(
      makeEvent(
        "step_complete",
        4,
        "Code Reader",
        JSON.stringify({
          summary: `Fetched code from ${successCount}/${result.codeContexts.length} repos`,
          files: result.codeContexts.map((c) => `${c.candidate.repoFullName}/${c.relevantFilePath}`).slice(0, 5),
        }),
        duration
      )
    );
  } catch (err) {
    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_error",
        4,
        "Code Reader",
        `Failed to fetch code: ${err instanceof Error ? err.message : "Unknown error"}`,
        duration
      )
    );
  }

  // ── STEP 5: Fit Scorer ────────────────────────────────
  stepStart = Date.now();
  emit(makeEvent("step_start", 5, "Fit Scorer", "Analyzing issue-skill fit for each candidate..."));

  try {
    const prompt = buildFitScoringPrompt(result.skillProfile, result.codeContexts);
    const rawResponse = await callGeminiStreaming(REASONING_MODEL, FALLBACK_MODEL, prompt, (chunk) => {
      emit(makeEvent("step_log", 5, "Fit Scorer", chunk));
    }, customGeminiKey);

    const scores = extractJSON<Array<{
      issueIndex: number;
      fitScore: number;
      reasoning: string;
      complexityLevel: "low" | "medium" | "high";
      estimatedTime: string;
      whyItFits: string;
    }>>(rawResponse);

    result.rankedIssues = scores
      .filter((s) => s.issueIndex < result.codeContexts.length)
      .map((s) => ({
        candidate: result.codeContexts[s.issueIndex].candidate,
        codeContext: result.codeContexts[s.issueIndex],
        fitScore: s.fitScore,
        reasoning: s.reasoning,
        complexityLevel: s.complexityLevel,
        estimatedTime: s.estimatedTime,
        whyItFits: s.whyItFits,
      }))
      .sort((a, b) => b.fitScore - a.fitScore);

    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_complete",
        5,
        "Fit Scorer",
        JSON.stringify({
          summary: `Ranked ${result.rankedIssues.length} issues. Top fit: ${result.rankedIssues[0]?.fitScore || 0}/10`,
          topIssues: result.rankedIssues.slice(0, 3).map((ri) => ({
            repo: ri.candidate.repoFullName,
            score: ri.fitScore,
            title: ri.candidate.issue.title.substring(0, 60),
          })),
        }),
        duration
      )
    );
  } catch (err) {
    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_error",
        5,
        "Fit Scorer",
        `Failed to score issues: ${err instanceof Error ? err.message : "Unknown error"}`,
        duration
      )
    );
    emit(makeEvent("pipeline_complete", 0, "", JSON.stringify(result)));
    return result;
  }

  if (result.rankedIssues.length === 0) {
    emit(makeEvent("pipeline_complete", 0, "", JSON.stringify(result)));
    return result;
  }

  // ── STEP 6: Comment Drafter ───────────────────────────
  stepStart = Date.now();
  emit(makeEvent("step_start", 6, "Comment Drafter", `Drafting claim comments for ${result.rankedIssues.length} issues...`));

  try {
    const prompt = buildCommentDraftPrompt(
      result.githubData,
      result.skillProfile,
      result.rankedIssues
    );
    const rawResponse = await callGeminiStreaming(LITE_MODEL, FALLBACK_MODEL, prompt, (chunk) => {
      emit(makeEvent("step_log", 6, "Comment Drafter", chunk));
    }, customGeminiKey);

    const comments = extractJSON<Array<{
      issueIndex: number;
      comment: string;
    }>>(rawResponse);

    result.claimComments = comments
      .filter((c) => c.issueIndex < result.rankedIssues.length)
      .map((c) => ({
        rankedIssue: result.rankedIssues[c.issueIndex],
        comment: c.comment,
      }));

    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_complete",
        6,
        "Comment Drafter",
        JSON.stringify({
          summary: `Drafted ${result.claimComments.length} professional claim comments`,
          count: result.claimComments.length,
        }),
        duration
      )
    );
  } catch (err) {
    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_error",
        6,
        "Comment Drafter",
        `Failed to draft comments: ${err instanceof Error ? err.message : "Unknown error"}`,
        duration
      )
    );
  }

  // ── STEP 7: Cursor Prompt Generator ───────────────────
  stepStart = Date.now();
  emit(makeEvent("step_start", 7, "Cursor Prompt Generator", `Generating Cursor prompts for ${result.rankedIssues.length} issues...`));

  try {
    const prompt = buildCursorPromptGeneration(result.rankedIssues);
    const rawResponse = await callGeminiStreaming(LITE_MODEL, FALLBACK_MODEL, prompt, (chunk) => {
      emit(makeEvent("step_log", 7, "Cursor Prompt Generator", chunk));
    }, customGeminiKey);

    const prompts = extractJSON<Array<{
      issueIndex?: number;
      prompt: string;
      issueNumber?: number;
      title?: string;
    }>>(rawResponse);

    result.cursorPrompts = prompts
      .map((p) => {
        let rankedIssue = typeof p.issueIndex === "number"
          ? result.rankedIssues[p.issueIndex]
          : undefined;

        if (!rankedIssue && typeof p.issueIndex === "number") {
          const altIndex = p.issueIndex - 1;
          if (altIndex >= 0 && altIndex < result.rankedIssues.length) {
            rankedIssue = result.rankedIssues[altIndex];
          }
        }

        if (!rankedIssue && typeof p.issueNumber === "number") {
          rankedIssue = result.rankedIssues.find(
            (ri) => ri.candidate.issue.number === p.issueNumber
          );
        }

        if (!rankedIssue && typeof p.title === "string") {
          rankedIssue = result.rankedIssues.find(
            (ri) => ri.candidate.issue.title === p.title
          );
        }

        if (!rankedIssue) return null;
        return { rankedIssue, prompt: p.prompt };
      })
      .filter((item): item is { rankedIssue: RankedIssue; prompt: string } => Boolean(item));

    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_complete",
        7,
        "Cursor Prompt Generator",
        JSON.stringify({
          summary: `Generated ${result.cursorPrompts.length} ready-to-use Cursor prompts`,
          count: result.cursorPrompts.length,
        }),
        duration
      )
    );
  } catch (err) {
    const duration = Date.now() - stepStart;
    emit(
      makeEvent(
        "step_error",
        7,
        "Cursor Prompt Generator",
        `Failed to generate prompts: ${err instanceof Error ? err.message : "Unknown error"}`,
        duration
      )
    );
  }

  // ── Complete ──────────────────────────────────────────
  emit(makeEvent("pipeline_complete", 0, "", JSON.stringify(result)));
  return result;
}
