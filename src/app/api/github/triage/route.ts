import { NextRequest } from "next/server";
import { postIssueComment, buildPRDraftUrl } from "@/lib/github";
import { callGemini, extractJSON, LITE_MODEL, FALLBACK_MODEL } from "@/lib/gemini";
import {
  buildSingleCommentDraftPrompt,
  buildSinglePRDraftPrompt,
} from "@/lib/prompts";
import {
  generateClaimCommentFromIssue,
  generatePRTemplate,
} from "@/lib/triage";

function isQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /quota|too many requests|429/i.test(message);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { action } = payload;

    if (action === "generate") {
      const { owner, repo, issueNumber, title, body } = payload;
      if (!owner || !repo || !issueNumber || !title) {
        return new Response(JSON.stringify({ error: "owner, repo, issueNumber, and title are required" }), { status: 400 });
      }

      const fallback = () => {
        const comment = generateClaimCommentFromIssue(owner, repo, issueNumber, title, body || null);
        const prTemplate = generatePRTemplate(owner, repo, issueNumber, title);
        const prUrl = buildPRDraftUrl(owner, repo, prTemplate.prTitle, prTemplate.prBody);
        return { comment, prTemplate: { title: prTemplate.prTitle, body: prTemplate.prBody }, prUrl, fallback: true };
      };

      try {
        const commentPrompt = buildSingleCommentDraftPrompt(
          owner,
          repo,
          Number(issueNumber),
          title,
          body || null
        );
        const rawComment = await callGemini(LITE_MODEL, FALLBACK_MODEL, commentPrompt);
        const commentJson = extractJSON<Array<{ issueIndex: number; comment: string }>>(
          rawComment
        );
        const comment = commentJson[0]?.comment?.trim();

        const prPrompt = buildSinglePRDraftPrompt(
          owner,
          repo,
          Number(issueNumber),
          title,
          body || null
        );
        const rawPr = await callGemini(LITE_MODEL, FALLBACK_MODEL, prPrompt);
        const prJson = extractJSON<Array<{ issueIndex: number; title: string; body: string }>>(
          rawPr
        );
        const prTemplate = prJson[0]
          ? { title: prJson[0].title.trim(), body: prJson[0].body.trim() }
          : { title: `Fix: ${title}`, body: `Closes #${issueNumber}.` };

        const prUrl = buildPRDraftUrl(owner, repo, prTemplate.title, prTemplate.body);

        return new Response(
          JSON.stringify({ comment, prTemplate, prUrl, fallback: false }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        if (isQuotaError(err)) {
          const response = fallback();
          return new Response(JSON.stringify({
            ...response,
            error: err instanceof Error ? err.message : String(err),
          }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        throw err;
      }
    }

    if (action === "applyComment") {
      const { owner, repo, issueNumber, comment } = payload;
      if (!owner || !repo || !issueNumber || !comment) {
        return new Response(JSON.stringify({ error: "owner, repo, issueNumber, and comment are required" }), { status: 400 });
      }

      if (!process.env.GITHUB_TOKEN) {
        return new Response(
          JSON.stringify({ error: "Server missing GITHUB_TOKEN" }),
          { status: 500 }
        );
      }

      const res = await postIssueComment(owner, repo, Number(issueNumber), comment);
      return new Response(JSON.stringify({ ok: true, result: res }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
