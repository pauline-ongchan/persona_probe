import {
  FIX_ATTEMPT_CALLBACK_STATUSES,
  type FixAttemptCallbackEvidence,
  type FixAttemptCallbackPayload,
  type FixAttemptCallbackStatus,
  type FixAttemptStatus
} from "./types";

const MAX_FIELD_LENGTH = 2000;
const MAX_EVIDENCE_FIELD_LENGTH = 1000;

export type ParseFixAttemptCallbackResult =
  | { ok: true; payload: FixAttemptCallbackPayload }
  | { ok: false; error: string };

export function parseFixAttemptCallbackPayload(input: unknown): ParseFixAttemptCallbackResult {
  if (!isRecord(input)) {
    return { ok: false, error: "Callback body must be a JSON object." };
  }

  const status = parseCallbackStatus(input.status);
  if (!status) {
    return {
      ok: false,
      error: `status must be one of: ${FIX_ATTEMPT_CALLBACK_STATUSES.join(", ")}.`
    };
  }

  const prUrl = parseOptionalUrl(input.prUrl);
  if (prUrl === null) {
    return { ok: false, error: "prUrl must be an http(s) URL when provided." };
  }

  if (status === "PR_OPENED" && !prUrl) {
    return { ok: false, error: "prUrl is required when status is PR_OPENED." };
  }

  const errorMessage = optionalTrimmedString(input.errorMessage, MAX_FIELD_LENGTH);
  const githubWorkflowRunId = optionalTrimmedString(input.githubWorkflowRunId, 200);
  const evidence = parseEvidence(input.evidence);

  return {
    ok: true,
    payload: {
      status,
      ...(prUrl ? { prUrl } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(githubWorkflowRunId ? { githubWorkflowRunId } : {}),
      ...(evidence ? { evidence } : {})
    }
  };
}

export function getStatusAfterContextFetch(currentStatus: string): FixAttemptStatus | string {
  return currentStatus === "PENDING" || currentStatus === "WORKFLOW_TRIGGERED" ? "CONTEXT_FETCHED" : currentStatus;
}

export function getStatusAfterCallback(
  currentStatus: string,
  callbackStatus: FixAttemptCallbackStatus
): FixAttemptStatus | string {
  if (callbackStatus === "CONTEXT_FETCHED") {
    return getStatusAfterContextFetch(currentStatus);
  }

  if (callbackStatus === "PR_OPENED") {
    return "PR_OPENED";
  }

  return "FAILED";
}

function parseCallbackStatus(value: unknown): FixAttemptCallbackStatus | null {
  return typeof value === "string" && FIX_ATTEMPT_CALLBACK_STATUSES.includes(value as FixAttemptCallbackStatus)
    ? (value as FixAttemptCallbackStatus)
    : null;
}

function parseOptionalUrl(value: unknown) {
  const stringValue = optionalTrimmedString(value, MAX_FIELD_LENGTH);
  if (!stringValue) return undefined;

  try {
    const parsed = new URL(stringValue);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function parseEvidence(value: unknown): FixAttemptCallbackEvidence | undefined {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value)
    .map(([key, entryValue]) => [key, optionalTrimmedString(entryValue, MAX_EVIDENCE_FIELD_LENGTH)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function optionalTrimmedString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
