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
