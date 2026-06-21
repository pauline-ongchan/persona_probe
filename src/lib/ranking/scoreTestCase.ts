import type { OracleType, Persona } from "@prisma/client";

const COMPLEXITY_KEYWORDS = [
  "payment",
  "checkout",
  "upload",
  "permission",
  "delete",
  "invite",
  "settings",
  "account",
  "password",
  "date",
  "booking"
];

export function scoreTestCase({
  persona,
  taskGoal,
  oracleType,
  previousFailureBoost = 0
}: {
  persona: Pick<Persona, "riskWeight">;
  taskGoal: string;
  oracleType: OracleType;
  previousFailureBoost?: number;
}) {
  const priorityScore =
    persona.riskWeight * 0.35 +
    getTaskComplexityScore(taskGoal) * 0.25 +
    getOracleRiskScore(oracleType) * 0.15 +
    Math.random() * 0.1 +
    previousFailureBoost * 0.15;

  return Number(priorityScore.toFixed(3));
}

export function getTaskComplexityScore(taskGoal: string) {
  const normalized = taskGoal.toLowerCase();
  const keywordHits = COMPLEXITY_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length;
  const lengthScore = Math.min(taskGoal.length / 220, 1);
  const keywordScore = Math.min(keywordHits / 4, 1);

  return Number(Math.max(lengthScore, keywordScore).toFixed(2));
}

export function getOracleRiskScore(oracleType: OracleType) {
  if (oracleType === "LLM_JUDGE") return 1;
  if (oracleType === "SELECTOR_EXISTS") return 0.55;
  return 0.3;
}
