import { getStatusAfterCallback } from "./fixAttemptStatus";
import type { FixAttemptCallbackPayload } from "./types";

export type FixAttemptCallbackUpdate = {
  status: string;
  prUrl?: string | null;
  errorMessage?: string | null;
  githubWorkflowRunId?: string;
};

export function buildFixAttemptCallbackUpdate(
  currentStatus: string,
  payload: FixAttemptCallbackPayload
): FixAttemptCallbackUpdate {
  const update: FixAttemptCallbackUpdate = {
    status: getStatusAfterCallback(currentStatus, payload.status)
  };

  if (payload.githubWorkflowRunId) {
    update.githubWorkflowRunId = payload.githubWorkflowRunId;
  }

  if (payload.status === "PR_OPENED") {
    update.prUrl = payload.prUrl;
    update.errorMessage = null;
  }

  if (payload.status === "FAILED") {
    update.errorMessage = payload.errorMessage || "Autofix workflow reported failure.";
  }

  return update;
}
