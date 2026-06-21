import type { TestCaseStatus } from "@prisma/client";

type TestCaseForAggregate = {
  status: TestCaseStatus;
  durationMs: number | null;
  priorityScore: number;
  failureReason: string | null;
  failureCategory: string | null;
  finalUrl: string | null;
  browserbaseSessionUrl: string | null;
  persona: {
    key: string;
    name: string;
  };
};

export function getRunAggregates(testCases: TestCaseForAggregate[]) {
  const total = testCases.length;
  const passed = testCases.filter((testCase) => testCase.status === "PASS").length;
  const failed = testCases.filter((testCase) => testCase.status === "FAIL").length;
  const errored = testCases.filter((testCase) => testCase.status === "ERROR").length;
  const personaRateDenominator = testCases.filter((testCase) => testCase.failureCategory !== "INFRA_FAILURE").length;
  const personaFailures = testCases.filter(
    (testCase) =>
      testCase.failureCategory !== "INFRA_FAILURE" && (testCase.status === "FAIL" || testCase.status === "ERROR")
  ).length;
  const completedDurations = testCases
    .map((testCase) => testCase.durationMs)
    .filter((duration): duration is number => typeof duration === "number");
  const averageDurationMs = completedDurations.length
    ? Math.round(completedDurations.reduce((sum, duration) => sum + duration, 0) / completedDurations.length)
    : 0;

  const personaMap = new Map<
    string,
    {
      key: string;
      name: string;
      total: number;
      failures: number;
      failureRate: number;
      riskScore: number;
    }
  >();

  for (const testCase of testCases) {
    const row =
      personaMap.get(testCase.persona.key) ??
      {
        key: testCase.persona.key,
        name: testCase.persona.name,
        total: 0,
        failures: 0,
        failureRate: 0,
        riskScore: 0
      };

    if (testCase.failureCategory === "INFRA_FAILURE") {
      personaMap.set(testCase.persona.key, row);
      continue;
    }
    row.total += 1;
    if (testCase.status === "FAIL" || testCase.status === "ERROR") {
      row.failures += 1;
    }
    row.failureRate = row.total ? row.failures / row.total : 0;
    row.riskScore = Number((row.failureRate * 0.7 + testCase.priorityScore * 0.3).toFixed(3));
    personaMap.set(testCase.persona.key, row);
  }

  return {
    total,
    passed,
    failed,
    errored,
    passRate: total ? passed / total : 0,
    failRate: total ? (failed + errored) / total : 0,
    personaFailureRate: personaRateDenominator ? personaFailures / personaRateDenominator : 0,
    infraFailures: testCases.filter((testCase) => testCase.failureCategory === "INFRA_FAILURE").length,
    averageDurationMs,
    personaRisks: Array.from(personaMap.values()).sort((a, b) => b.riskScore - a.riskScore),
    topFailures: testCases
      .filter((testCase) => testCase.status === "FAIL" || testCase.status === "ERROR")
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 6)
  };
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatDuration(ms: number | null | undefined) {
  if (!ms) return "n/a";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
