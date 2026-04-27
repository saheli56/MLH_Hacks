import type { GitHubData, CandidateIssue, CodeContext, SkillProfile, RankedIssue } from "./types";

// ── Step 2: Skill Extraction ──────────────────────────────

export function buildSkillExtractionPrompt(data: GitHubData): string {
  const repoSummaries = data.repos
    .filter((r) => !r.fork)
    .map(
      (r) =>
        `- ${r.name}: ${r.description || "No description"} | Language: ${r.language || "Unknown"} | Stars: ${r.stargazers_count} | Topics: ${r.topics?.join(", ") || "none"} | Size: ${r.size}KB | Updated: ${r.updated_at}`
    )
    .join("\n");

  const eventSummary = data.events
    .slice(0, 15)
    .map(
      (e) =>
        `- ${e.type} on ${e.repo.name} at ${e.created_at}`
    )
    .join("\n");

  const languageCounts: Record<string, number> = {};
  for (const repo of data.repos) {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  }
  const languageBreakdown = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `${lang}: ${count} repos`)
    .join(", ");

  return `You are analyzing a GitHub developer profile to extract their skill profile.

## Developer Profile
- Username: ${data.profile.login}
- Name: ${data.profile.name || "Unknown"}
- Bio: ${data.profile.bio || "None"}
- Public Repos: ${data.profile.public_repos}
- Followers: ${data.profile.followers}
- Account Created: ${data.profile.created_at}
- Location: ${data.profile.location || "Unknown"}

## Language Distribution
${languageBreakdown}

## Repositories (non-forked)
${repoSummaries}

## Recent Activity
${eventSummary}

## Task
Analyze this developer's GitHub profile and extract a structured skill profile. Consider:
1. Primary programming languages (ranked by proficiency based on repo count, size, and recency)
2. Frameworks and tools they use (infer from repo names, descriptions, and topics)
3. Experience level: "beginner" (< 1 year activity or mostly forks/small projects), "intermediate" (1-3 years, some substantial projects), "advanced" (3+ years, complex projects, many stars/followers)
4. Types of projects they build (web apps, CLI tools, libraries, ML models, etc.)
5. Preferred domains (web development, data science, DevOps, etc.)
6. A brief 2-3 sentence summary of the developer

Return ONLY valid JSON in this exact format:
{
  "primaryLanguages": ["lang1", "lang2", "lang3"],
  "frameworks": ["framework1", "framework2"],
  "experienceLevel": "beginner" | "intermediate" | "advanced",
  "projectTypes": ["type1", "type2"],
  "preferredDomains": ["domain1", "domain2"],
  "summary": "Brief developer summary"
}`;
}

// ── Step 5: Fit Scoring ───────────────────────────────────

export function buildFitScoringPrompt(
  profile: SkillProfile,
  contexts: CodeContext[]
): string {
  const issueDescriptions = contexts
    .map(
      (ctx, i) => `
### Issue ${i + 1}: ${ctx.candidate.repoFullName}#${ctx.candidate.issue.number}
- **Title:** ${ctx.candidate.issue.title}
- **Body:** ${(ctx.candidate.issue.body || "No description").substring(0, 500)}
- **Labels:** ${ctx.candidate.issue.labels.map((l) => l.name).join(", ")}
- **Repo Language:** ${ctx.candidate.repoLanguage || "Unknown"}
- **Repo Stars:** ${ctx.candidate.repoStars}
- **Relevant File:** ${ctx.relevantFilePath}
- **Code (truncated):**
\`\`\`
${ctx.relevantFileContent.substring(0, 1500)}
\`\`\`
- **Repo Structure:** ${ctx.repoStructure.slice(0, 20).join(", ")}
`
    )
    .join("\n---\n");

  return `You are an expert at matching developers to open source issues based on their skills.

## Developer Skill Profile
- **Primary Languages:** ${profile.primaryLanguages.join(", ")}
- **Frameworks:** ${profile.frameworks.join(", ")}
- **Experience Level:** ${profile.experienceLevel}
- **Project Types:** ${profile.projectTypes.join(", ")}
- **Preferred Domains:** ${profile.preferredDomains.join(", ")}
- **Summary:** ${profile.summary}

## Candidate Issues
${issueDescriptions}

## Task
Score each issue on how well it fits this developer. Consider:
1. Does the issue's language match the developer's primary languages?
2. Does the complexity match their experience level?
3. Does the domain match their interests?
4. Is the code readable and approachable for their skill level?
5. Can they realistically complete this?

Return the TOP 5 best-fit issues (or fewer if less than 5 are a good match), ranked by fit score.

Return ONLY valid JSON as an array:
[
  {
    "issueIndex": 0,
    "fitScore": 8.5,
    "reasoning": "Detailed reasoning for the score",
    "complexityLevel": "low" | "medium" | "high",
    "estimatedTime": "2-4 hours",
    "whyItFits": "2-3 sentence explanation of why this is a good match for this specific developer"
  }
]

issueIndex is 0-based, matching the issue numbers above (Issue 1 = index 0).`;
}

// ── Step 6: Comment Drafting ──────────────────────────────

export function buildCommentDraftPrompt(
  githubData: GitHubData,
  profile: SkillProfile,
  rankedIssues: RankedIssue[]
): string {
  const issueList = rankedIssues
    .map(
      (ri, i) => `
### Issue ${i + 1}: ${ri.candidate.repoFullName}#${ri.candidate.issue.number}
- **Title:** ${ri.candidate.issue.title}
- **Fit Score:** ${ri.fitScore}/10
- **Why it fits:** ${ri.whyItFits}
- **Relevant file:** ${ri.codeContext.relevantFilePath}
`
    )
    .join("\n");

  return `You are helping a developer write professional GitHub comments to claim open source issues.

## Developer
- **Username:** ${githubData.profile.login}
- **Name:** ${githubData.profile.name || githubData.profile.login}
- **Languages:** ${profile.primaryLanguages.join(", ")}
- **Experience:** ${profile.experienceLevel}
- **Summary:** ${profile.summary}

## Issues to Claim
${issueList}

## Task
For each issue, write a professional GitHub comment that:
1. Briefly introduces the developer (1 sentence — mention relevant experience)
2. Shows understanding of the issue (1-2 sentences — paraphrase the problem)
3. Proposes a high-level approach (1-2 sentences)
4. Asks politely if they can be assigned

The comments must:
- Sound human and natural, NOT like AI-generated text
- Be specific to each issue (reference the actual code/feature)
- Be concise (4-6 sentences total)
- Be professional but friendly
- NOT use buzzwords or filler phrases

Return ONLY valid JSON as an array:
[
  {
    "issueIndex": 0,
    "comment": "The full comment text"
  }
]

issueIndex is 0-based, matching the issue numbers above.`;
}

export function buildSingleCommentDraftPrompt(
  owner: string,
  repo: string,
  issueNumber: number,
  issueTitle: string,
  issueBody: string | null
): string {
  return `You are writing a professional GitHub comment for a developer to claim an issue.

## Repository
- Owner: ${owner}
- Repo: ${repo}

## Issue
- Number: #${issueNumber}
- Title: ${issueTitle}
- Description: ${issueBody || "No description provided"}

## Task
Write one natural, concise, human-sounding comment that:
1. Introduces the developer briefly.
2. Demonstrates understanding of the issue.
3. Proposes a high-level approach.
4. Asks politely if the developer can be assigned.

The comment should be 4-6 sentences and not sound like AI-generated text.

Return ONLY valid JSON as an array:
[
  {
    "issueIndex": 0,
    "comment": "The full comment text"
  }
]
`;
}

export function buildSinglePRDraftPrompt(
  owner: string,
  repo: string,
  issueNumber: number,
  issueTitle: string,
  issueBody: string | null
): string {
  return `You are writing a GitHub pull request title and body for a fix.

## Repository
- Owner: ${owner}
- Repo: ${repo}

## Issue
- Number: #${issueNumber}
- Title: ${issueTitle}
- Description: ${issueBody || "No description provided"}

## Task
Generate a clear PR title and a professional PR body that includes:
- Summary of the change.
- What was changed.
- How it was tested.
- A reference to the issue.

Return ONLY valid JSON as an array:
[
  {
    "issueIndex": 0,
    "title": "PR title",
    "body": "PR body"
  }
]
`;
}

// ── Step 7: Cursor Prompt Generation ──────────────────────

export function buildCursorPromptGeneration(
  rankedIssues: RankedIssue[]
): string {
  const issueDetails = rankedIssues
    .map(
      (ri, i) => `
### Issue ${i + 1}: ${ri.candidate.repoFullName}#${ri.candidate.issue.number}
- **Title:** ${ri.candidate.issue.title}
- **Body:** ${(ri.candidate.issue.body || "No description").substring(0, 800)}
- **Labels:** ${ri.candidate.issue.labels.map((l) => l.name).join(", ")}
- **Repo:** ${ri.candidate.repoFullName} (${ri.candidate.repoLanguage || "Unknown"})
- **Relevant File:** ${ri.codeContext.relevantFilePath}
- **Code:**
\`\`\`
${ri.codeContext.relevantFileContent.substring(0, 1000)}
\`\`\`
- **Repo Structure:** ${ri.codeContext.repoStructure.slice(0, 20).join(", ")}
- **Complexity:** ${ri.complexityLevel}
- **Estimated Time:** ${ri.estimatedTime}
`
    )
    .join("\n---\n");

  return `You are generating ready-to-paste coding prompts for Cursor IDE or Claude Code.

## Issues
${issueDetails}

## Task
For each issue, generate a comprehensive prompt that a developer can paste directly into Cursor or Claude Code to start working on the fix/feature immediately.

Each prompt must include:
1. **Context**: Brief description of the repo and what it does
2. **The Issue**: Exact description of the bug/feature from the issue
3. **Relevant Code**: Reference the specific file and the problematic/relevant section
4. **Expected Behavior**: What the code should do after the fix
5. **Suggested Approach**: Step-by-step approach to implement the fix/feature
6. **Constraints**: Any important constraints (don't break existing tests, follow repo conventions, etc.)

The prompt must:
- Be immediately usable without modification
- Include enough context that the AI coding tool understands the full picture
- Be structured and clear
- Reference specific files and code sections
- NOT include meta-instructions like "paste this into Cursor"

Return ONLY valid JSON as an array:
[
  {
    "issueIndex": 0,
    "prompt": "The full cursor prompt"
  }
]

issueIndex is 0-based, matching the issue numbers above.`;
}
