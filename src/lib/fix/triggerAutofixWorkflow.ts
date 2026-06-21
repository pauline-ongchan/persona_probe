import { withSentrySpan } from "@/lib/sentry/withSentrySpan";

export async function triggerAutofixWorkflow({
  owner,
  repo,
  workflowFile,
  ref,
  fixContextUrl,
  fixAttemptId
}: {
  owner: string;
  repo: string;
  workflowFile: string;
  ref: string;
  fixContextUrl: string;
  fixAttemptId: string;
}) {
  return withSentrySpan(
    "fix.trigger_workflow",
    {
      fix_attempt_id: fixAttemptId,
      github_owner: owner,
      github_repo: repo
    },
    async () => {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw new Error("GITHUB_TOKEN is required to trigger autofix workflows.");
      }

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28"
          },
          body: JSON.stringify({
            ref,
            inputs: {
              fix_context_url: fixContextUrl,
              fix_attempt_id: fixAttemptId
            }
          })
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`GitHub workflow_dispatch failed (${response.status}): ${responseText}`);
      }
    }
  );
}
