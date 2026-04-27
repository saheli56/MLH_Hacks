export function generateClaimCommentFromIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  title: string,
  body: string | null,
  contributorName?: string
) {
  const who = contributorName || "I'm a contributor familiar with this area";
  const briefBody = (body || "").trim().replace(/\s+/g, " ").slice(0, 300);

  return `Hi — ${who}. I read the issue **${title}** and I believe I can help. Based on the description${briefBody ? `: "${briefBody}"` : ""}, my high-level approach would be to:

- Investigate the relevant files and reproduce the problem locally.
- Implement a focused change to address the root cause and add a small test where applicable.
- Open a clean PR referencing this issue and include tests and documentation updates.

Would you be able to assign this issue to me or point me to any maintainers I should ping? Thanks!`;
}

export function generatePRTemplate(
  owner: string,
  repo: string,
  issueNumber: number,
  title: string
) {
  const prTitle = `Fix: ${title}`;
  const prBody = `## Summary\n\nThis PR addresses ${title} (closes #${issueNumber}).\n\n## Changes\n\n- Brief description of the changes made.\n- Any notable decisions or trade-offs.\n\n## Testing\n\n- Steps taken to verify the fix locally\n- Tests added / updated\n\n## Related\n\nCloses #${issueNumber}`;

  return { prTitle, prBody };
}
