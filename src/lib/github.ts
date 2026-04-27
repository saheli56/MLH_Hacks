import type {
  GitHubProfile,
  GitHubRepo,
  GitHubEvent,
  GitHubData,
  GitHubIssueSearchItem,
  CandidateIssue,
} from "./types";

// ── Config ────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com";
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

function getHeaders(customToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OpenAgent/1.0",
  };
  const token = customToken || process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ── Retry Wrapper ─────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES,
  delay = INITIAL_DELAY,
  customToken?: string
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: getHeaders(customToken) });

      // Rate limit handling
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining) {
        console.log(
          `[GitHub] ${url.replace(GITHUB_API, "")} — rate limit remaining: ${remaining}`
        );
      }

      if (res.status === 403 && remaining === "0") {
        const resetTime = res.headers.get("x-ratelimit-reset");
        const waitMs = resetTime
          ? Math.max(0, parseInt(resetTime) * 1000 - Date.now())
          : delay;
        console.warn(
          `[GitHub] Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s...`
        );
        if (attempt < retries) {
          await sleep(Math.min(waitMs, 10000));
          continue;
        }
      }

      if (res.status === 404) {
        throw new Error(`Not found: ${url}`);
      }

      if (!res.ok && attempt < retries) {
        console.warn(
          `[GitHub] ${res.status} on ${url}, retrying in ${delay}ms...`
        );
        await sleep(delay);
        delay *= 2;
        continue;
      }

      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
      }

      return res;
    } catch (err) {
      if (attempt < retries && !(err instanceof Error && err.message.startsWith("Not found"))) {
        console.warn(
          `[GitHub] Fetch error, retrying in ${delay}ms...`,
          err
        );
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Profile Data ──────────────────────────────────────────

export async function fetchProfile(
  username: string,
  customToken?: string
): Promise<GitHubProfile> {
  const res = await fetchWithRetry(`${GITHUB_API}/users/${username}`, MAX_RETRIES, INITIAL_DELAY, customToken);
  return res.json();
}

export async function fetchRepos(username: string, customToken?: string): Promise<GitHubRepo[]> {
  const res = await fetchWithRetry(
    `${GITHUB_API}/users/${username}/repos?sort=updated&per_page=20&type=owner`,
    MAX_RETRIES,
    INITIAL_DELAY,
    customToken
  );
  return res.json();
}

export async function fetchEvents(
  username: string,
  customToken?: string
): Promise<GitHubEvent[]> {
  const res = await fetchWithRetry(
    `${GITHUB_API}/users/${username}/events/public?per_page=30`,
    MAX_RETRIES,
    INITIAL_DELAY,
    customToken
  );
  return res.json();
}

/** Fetch all GitHub data for a user in parallel */
export async function fetchGitHubData(
  username: string,
  customToken?: string
): Promise<GitHubData> {
  const [profile, repos, events] = await Promise.all([
    fetchProfile(username, customToken),
    fetchRepos(username, customToken),
    fetchEvents(username, customToken),
  ]);
  return { profile, repos, events };
}

// ── Issue Search ──────────────────────────────────────────

interface IssueSearchResponse {
  total_count: number;
  items: GitHubIssueSearchItem[];
}

export async function searchIssues(
  query: string,
  customToken?: string
): Promise<GitHubIssueSearchItem[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `${GITHUB_API}/search/issues?q=${encodedQuery}&sort=updated&order=desc&per_page=10`;
  const res = await fetchWithRetry(url, MAX_RETRIES, INITIAL_DELAY, customToken);
  const data: IssueSearchResponse = await res.json();
  return data.items || [];
}

/** Search for matching issues using multiple queries in parallel */
export async function searchMatchingIssues(
  primaryLangs: string[],
  interest: string,
  customToken?: string
): Promise<CandidateIssue[]> {
  const lang = primaryLangs[0] || "javascript";
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const queries = [
    `label:"good first issue" language:${lang} state:open`,
    `label:"help wanted" language:${lang} state:open`,
    `label:"good first issue" ${interest} state:open`,
    `label:"help wanted" ${interest} state:open`,
    `${interest} state:open`,
  ].filter(Boolean);

  const results = await Promise.all(queries.map((q) => searchIssues(q, customToken)));
  const allIssues = results.flat();

  // Deduplicate by issue id
  const seen = new Set<number>();
  const unique: GitHubIssueSearchItem[] = [];
  for (const issue of allIssues) {
    if (!seen.has(issue.id)) {
      seen.add(issue.id);
      unique.push(issue);
    }
  }

  // Convert to CandidateIssue with repo info
  const candidates: CandidateIssue[] = [];
  const repoCounts = new Map<string, number>();

  for (const issue of unique) {
    const repoUrl = issue.repository_url;
    const parts = repoUrl.replace(`${GITHUB_API}/repos/`, "").split("/");
    const repoOwner = parts[0];
    const repoName = parts[1];
    const repoFullName = `${repoOwner}/${repoName}`;

    // Limit to 2 issues per repository
    const count = repoCounts.get(repoFullName) || 0;
    if (count >= 2) continue;
    repoCounts.set(repoFullName, count + 1);

    candidates.push({
      issue,
      repoOwner,
      repoName,
      repoFullName,
      repoStars: 0,
      repoLanguage: null,
      repoDescription: null,
      repoLastPushed: "",
    });

    if (candidates.length >= 10) break;
  }

  // Enrich with repo metadata (parallel, we already limited to 10)
  const enriched = await Promise.all(
    candidates.map(async (c) => {
      try {
        const res = await fetchWithRetry(
          `${GITHUB_API}/repos/${c.repoFullName}`,
          MAX_RETRIES,
          INITIAL_DELAY,
          customToken
        );
        const repo = await res.json();
        return {
          ...c,
          repoStars: repo.stargazers_count || 0,
          repoLanguage: repo.language || null,
          repoDescription: repo.description || null,
          repoLastPushed: repo.pushed_at || "",
        };
      } catch {
        return c;
      }
    })
  );

  const filtered = enriched.filter((c) => {
    if (c.repoStars < 50) return false;
    if (c.repoLastPushed) {
      const pushed = new Date(c.repoLastPushed);
      if (pushed < sixMonthsAgo) return false;
    }
    return true;
  });

  return (filtered.length > 0 ? filtered : enriched).slice(0, 10);
}

// ── Code Fetching ─────────────────────────────────────────

interface RepoContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
}

export async function fetchRepoContents(
  owner: string,
  repo: string,
  path = "",
  customToken?: string
): Promise<RepoContentItem[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetchWithRetry(url, MAX_RETRIES, INITIAL_DELAY, customToken);
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((item: RepoContentItem) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size,
    }));
  }
  return [];
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  customToken?: string
): Promise<string> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetchWithRetry(url, MAX_RETRIES, INITIAL_DELAY, customToken);
  const data = await res.json();
  if (data.content && data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content || "";
}

/** Extract a relevant file path from issue text, or guess based on repo structure */
export function guessRelevantFile(
  issueTitle: string,
  issueBody: string | null,
  repoContents: RepoContentItem[]
): string | null {
  const text = `${issueTitle} ${issueBody || ""}`.toLowerCase();

  // Look for explicit file references
  const filePatterns = [
    /(?:file|path|in)\s+[`"]?([a-zA-Z0-9_/.-]+\.[a-zA-Z]+)[`"]?/gi,
    /([a-zA-Z0-9_/.-]+\.(ts|js|py|go|rs|java|rb|cpp|c|swift|kt))/gi,
  ];

  for (const pattern of filePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const path = match[1];
      const found = repoContents.find(
        (f) => f.path === path || f.name === path
      );
      if (found && found.type === "file") return found.path;
    }
  }

  // Prioritize source files based on keywords
  const sourceFiles = repoContents.filter(
    (f) =>
      f.type === "file" &&
      /\.(ts|js|py|go|rs|java|rb|cpp|c|swift|kt|tsx|jsx)$/i.test(f.name) &&
      !f.name.startsWith(".")
  );

  // Look for main/index files
  const mainFiles = sourceFiles.filter((f) =>
    /^(main|index|app|lib|mod|src)\./i.test(f.name)
  );
  if (mainFiles.length > 0) return mainFiles[0].path;

  // Look for files with keywords from issue title
  const keywords = issueTitle
    .toLowerCase()
    .split(/[\s\-_]+/)
    .filter((w) => w.length > 3);
  for (const file of sourceFiles) {
    const fileName = file.name.toLowerCase();
    if (keywords.some((kw) => fileName.includes(kw))) return file.path;
  }

  // Just return the first source file
  if (sourceFiles.length > 0) return sourceFiles[0].path;

  // Fallback: README
  const readme = repoContents.find((f) =>
    /readme/i.test(f.name)
  );
  if (readme) return readme.path;

  return null;
}

// ── Username Extraction ───────────────────────────────────

export function extractUsername(githubUrl: string): string | null {
  // Handle direct username
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(githubUrl.trim())) {
    return githubUrl.trim();
  }

  // Handle URL
  const match = githubUrl.match(
    /github\.com\/([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)\/?$/
  );
  return match ? match[1] : null;
}

// ── Maintainers / Contributors Helpers ─────────────────────────

export async function fetchContributors(
  owner: string,
  repo: string,
  per_page = 10,
  customToken?: string
): Promise<any[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=${per_page}&anon=0`;
  const res = await fetchWithRetry(url, MAX_RETRIES, INITIAL_DELAY, customToken);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Try to determine repository maintainers with minimal calls.
 * 1) Attempt to read CODEOWNERS files (.github/CODEOWNERS, CODEOWNERS, docs/CODEOWNERS)
 * 2) Fall back to top contributors and repository owner
 */
export async function getRepositoryMaintainers(
  owner: string,
  repo: string,
  customToken?: string
): Promise<{ login: string; avatar_url?: string; html_url?: string; contributions?: number; source: string }[]> {
  // Try CODEOWNERS first (cheap if file exists in repo contents call)
  const codeownersPaths = [
    ".github/CODEOWNERS",
    "CODEOWNERS",
    "docs/CODEOWNERS",
  ];

  const maintainersSet = new Set<string>();
  const maintainers: { login: string; avatar_url?: string; html_url?: string; contributions?: number; source: string }[] = [];

  for (const p of codeownersPaths) {
    try {
      const content = await fetchFileContent(owner, repo, p, customToken);
      if (content) {
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          // CODEOWNERS lines often end with @username or @org/team
          const matches = Array.from(trimmed.matchAll(/@([a-zA-Z0-9-]+)/g));
          for (const m of matches) {
            const login = m[1];
            if (!maintainersSet.has(login)) {
              maintainersSet.add(login);
              maintainers.push({ login, source: "codeowners" });
            }
          }
        }
      }
    } catch (e) {
      // ignore missing file or fetch errors and continue
    }
    if (maintainers.length > 0) break;
  }

  // If no CODEOWNERS, use top contributors (one API call)
  if (maintainers.length === 0) {
    try {
      const contributors = await fetchContributors(owner, repo, 10, customToken);
      for (const c of contributors.slice(0, 6)) {
        if (!c || !c.login) continue;
        maintainers.push({
          login: c.login,
          avatar_url: c.avatar_url,
          html_url: c.html_url || `https://github.com/${c.login}`,
          contributions: c.contributions,
          source: "contributors",
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // Always ensure repo owner is present as a fallback
  try {
    const repoRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}`, MAX_RETRIES, INITIAL_DELAY, customToken);
    const repoData = await repoRes.json();
    const ownerLogin = repoData?.owner?.login;
    const ownerAvatar = repoData?.owner?.avatar_url;
    const ownerHtml = repoData?.owner?.html_url || `https://github.com/${ownerLogin}`;
    if (ownerLogin && !maintainers.some((m) => m.login === ownerLogin)) {
      maintainers.unshift({ login: ownerLogin, avatar_url: ownerAvatar, html_url: ownerHtml, source: "owner" });
    }
  } catch (e) {
    // ignore
  }

  // Trim duplicates and limit result
  const unique: Record<string, any> = {};
  for (const m of maintainers) {
    if (!unique[m.login]) unique[m.login] = m;
  }

  return Object.values(unique).slice(0, 8);
}

// ── Write Actions (comments / PR helpers) ─────────────────────────────────

export async function postIssueComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
  customToken?: string
) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...getHeaders(customToken), "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to post comment: ${res.status} ${res.statusText} ${text}`);
  }

  return res.json();
}

export function buildPRDraftUrl(owner: string, repo: string, title: string, body: string) {
  const base = `https://github.com/${owner}/${repo}/compare?expand=1`;
  return `${base}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
