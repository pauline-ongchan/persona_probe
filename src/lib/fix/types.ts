export type FixContext = {
  version: "1.0";
  testCase: {
    id: string;
    runId: string;
    persona: string;
    taskGoal: string;
    failureReason: string;
    failureCategory?: string;
    oracleType?: string;
    oracleExpected?: string;
    oracleActual?: string;
    finalUrl?: string;
  };
  target: {
    url: string;
    routeHint?: string;
    githubOwner: string;
    githubRepo: string;
    baseBranch: string;
    commitSha?: string;
  };
  sentry?: {
    issueId?: string;
    eventId?: string;
    traceId?: string;
    eventUrl?: string;
    stackTrace?: string;
    breadcrumbs?: unknown[];
    tags?: Record<string, string>;
  };
  browserbase?: {
    sessionId?: string;
    inspectorUrl?: string;
    replayUrl?: string;
    finalUrl?: string;
  };
  actionTrace: Array<{
    step: number;
    action: string;
    observation?: string;
    urlAfterAction?: string;
    oracleStatus?: string;
    personaRule?: string;
  }>;
  screenshots?: string[];
  instructions: string;
};

export const FIX_ATTEMPT_STATUSES = [
  "PENDING",
  "WORKFLOW_TRIGGERED",
  "CONTEXT_FETCHED",
  "PR_OPENED",
  "FAILED"
] as const;

export type FixAttemptStatus = (typeof FIX_ATTEMPT_STATUSES)[number];

export const FIX_ATTEMPT_CALLBACK_STATUSES = ["CONTEXT_FETCHED", "PR_OPENED", "FAILED"] as const;

export type FixAttemptCallbackStatus = (typeof FIX_ATTEMPT_CALLBACK_STATUSES)[number];

export type FixAttemptCallbackEvidence = {
  branch?: string;
  commitSha?: string;
  workflowRunUrl?: string;
  patchPath?: string;
  patchSummary?: string;
  [key: string]: string | undefined;
};

export type FixAttemptCallbackPayload = {
  status: FixAttemptCallbackStatus;
  prUrl?: string;
  errorMessage?: string;
  githubWorkflowRunId?: string;
  evidence?: FixAttemptCallbackEvidence;
};

export type FixContextCallback = {
  url: string;
  method: "POST";
  authHeader: "Authorization";
  bearerToken: string;
  statusValues: FixAttemptCallbackStatus[];
};

export type FixContextResponse = FixContext & {
  callback: FixContextCallback;
};
