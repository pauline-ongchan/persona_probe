import {
  PERSONA_RISK_CATEGORIES,
  type BehaviorPolicy,
  type PageAuditSummary,
  type PersonaBehaviorProfile,
  type PersonaBehaviorRiskScore,
  type PersonaRiskCategoryScores
} from "@/lib/personas/types";

type ScorePersonaBehaviorRiskInput = {
  persona: PersonaBehaviorProfile;
  behaviorPolicy: BehaviorPolicy;
  pageAudit?: PageAuditSummary;
  taskGoal?: string;
};

type RiskFactor = {
  score: number;
  label: string;
};

export function scorePersonaBehaviorRisk({
  persona,
  behaviorPolicy,
  pageAudit,
  taskGoal = ""
}: ScorePersonaBehaviorRiskInput): PersonaBehaviorRiskScore {
  const audit = pageAudit ?? {};
  const taskSignals = getTaskSignals(taskGoal);
  const categoryScores: PersonaRiskCategoryScores = {
    accessibility: scoreAccessibility(persona, audit),
    performance: scorePerformance(persona, audit),
    formComplexity: scoreFormComplexity(persona, behaviorPolicy, audit, taskSignals.formTask),
    copyAmbiguity: scoreCopyAmbiguity(persona, audit),
    privacyFriction: scorePrivacyFriction(persona, behaviorPolicy, audit, taskSignals.sensitiveDataTask),
    mobileResponsiveness: scoreMobileResponsiveness(persona, behaviorPolicy, audit),
    errorRecovery: scoreErrorRecovery(persona, behaviorPolicy, audit, taskSignals.destructiveTask)
  };
  const overallRiskScore = getWeightedOverallScore(categoryScores, persona.benchmarkWeights);
  const topRiskFactors = getTopRiskFactors(persona, behaviorPolicy, audit, categoryScores);
  const strongestCategories = getStrongestCategories(categoryScores)
    .map((category) => `${category} ${categoryScores[category]}`)
    .join(", ");

  return {
    overallRiskScore,
    categoryScores,
    topRiskFactors,
    explanation: `Overall risk is ${overallRiskScore}/100 for ${persona.name}. Strongest heuristic categories: ${strongestCategories}. Scores combine persona dimensions, sampled behavior policy, task signals, and available page audit signals.`
  };
}

function scoreAccessibility(persona: PersonaBehaviorProfile, audit: PageAuditSummary) {
  const dimensions = persona.dimensions;
  const raw =
    normalizedCount(audit.missingLabelCount, 8) * 32 +
    normalizedCount(audit.colorContrastIssueCount, 8) * 20 +
    normalizedCount(audit.focusOrderIssueCount, 6) * 18 +
    normalizedCount(audit.keyboardTrapCount, 2) * 15 +
    normalizedCount(audit.smallTextCount, 8) * 8 +
    normalizedCount(audit.autocompleteIssueCount, 6) * 7;
  const sensitivity = Math.max(dimensions.visualAccessibilityNeed, dimensions.keyboardReliance);

  return roundScore(raw * (0.75 + sensitivity * 0.75));
}

function scorePerformance(persona: PersonaBehaviorProfile, audit: PageAuditSummary) {
  const dimensions = persona.dimensions;
  const loadRisk = normalizedCount(audit.loadTimeMs, 5000);
  const blockingRisk = normalizedCount(audit.totalBlockingTimeMs, 700);
  const raw =
    valueOrZero(audit.performanceRiskScore) * 58 +
    valueOrZero(audit.layoutShiftRiskScore) * 18 +
    loadRisk * 16 +
    blockingRisk * 8;
  const impatience = Math.max(1 - dimensions.patience, dimensions.speedPressure);

  return roundScore(raw * (0.75 + impatience * 0.55 + dimensions.mobileReliance * 0.2));
}

function scoreFormComplexity(
  persona: PersonaBehaviorProfile,
  behaviorPolicy: BehaviorPolicy,
  audit: PageAuditSummary,
  formTask: boolean
) {
  const dimensions = persona.dimensions;
  const raw =
    normalizedCount(audit.formFieldCount, 14) * 24 +
    normalizedCount(audit.requiredFieldCount, 8) * 18 +
    normalizedCount(audit.duplicateLabelCount, 5) * 16 +
    normalizedCount(audit.ambiguousButtonCount, 5) * 12 +
    normalizedCount(audit.passwordFieldCount, 3) * 8 +
    normalizedCount(audit.captchaPresent ? 1 : 0, 1) * 8 +
    (audit.hasInlineValidation === false ? 10 : 0) +
    (formTask ? 4 : 0);
  const sensitivity =
    (1 - dimensions.languageConfidence) * 0.28 +
    (1 - dimensions.errorRecoveryConfidence) * 0.24 +
    behaviorPolicy.typoLikelihood * 0.24 +
    (1 - dimensions.attentionToDetail) * 0.2;

  return roundScore(raw * (0.9 + sensitivity));
}

function scoreCopyAmbiguity(persona: PersonaBehaviorProfile, audit: PageAuditSummary) {
  const dimensions = persona.dimensions;
  const raw =
    normalizedCount(audit.jargonTermCount, 10) * 34 +
    normalizedCount(audit.ambiguousButtonCount, 6) * 24 +
    normalizedCount(audit.duplicateLabelCount, 5) * 18 +
    normalizedCount(audit.longCopyBlockCount, 6) * 14 +
    normalizedCount(audit.modalCount, 5) * 10;
  const sensitivity = 1 - dimensions.languageConfidence;

  return roundScore(raw * (0.75 + sensitivity * 0.9));
}

function scorePrivacyFriction(
  persona: PersonaBehaviorProfile,
  behaviorPolicy: BehaviorPolicy,
  audit: PageAuditSummary,
  sensitiveDataTask: boolean
) {
  const dimensions = persona.dimensions;
  const raw =
    (audit.cookieBannerPresent ? 18 : 0) +
    normalizedCount(audit.privacyPromptCount, 4) * 24 +
    normalizedCount(audit.permissionPromptCount, 3) * 20 +
    normalizedCount(audit.thirdPartyTrackerCount, 8) * 12 +
    normalizedCount(audit.thirdPartyLoginCount, 3) * 10 +
    normalizedCount(audit.passwordFieldCount, 3) * 6 +
    (sensitiveDataTask ? 10 : 0);
  const sensitivity = Math.max(dimensions.privacySensitivity, behaviorPolicy.refusalLikelihood);

  return roundScore(raw * (0.75 + sensitivity * 0.8));
}

function scoreMobileResponsiveness(persona: PersonaBehaviorProfile, behaviorPolicy: BehaviorPolicy, audit: PageAuditSummary) {
  const dimensions = persona.dimensions;
  const raw =
    valueOrZero(audit.mobileRiskScore) * 46 +
    normalizedCount(audit.smallTapTargetCount, 8) * 22 +
    (audit.horizontalOverflow ? 16 : 0) +
    normalizedCount(audit.modalCount, 5) * 8 +
    normalizedCount(audit.layoutShiftRiskScore, 1) * 8;
  const mobileNeed = Math.max(dimensions.mobileReliance, behaviorPolicy.viewport.type === "mobile" ? 0.9 : 0);

  return roundScore(raw * (0.72 + mobileNeed * 0.78));
}

function scoreErrorRecovery(
  persona: PersonaBehaviorProfile,
  behaviorPolicy: BehaviorPolicy,
  audit: PageAuditSummary,
  destructiveTask: boolean
) {
  const dimensions = persona.dimensions;
  const raw =
    (audit.hasInlineValidation === false ? 22 : 0) +
    (audit.hasRecoveryPath === false ? 24 : 0) +
    normalizedCount(audit.errorMessageCount, 8) * 16 +
    normalizedCount(audit.destructiveActionCount, 3) * 12 +
    normalizedCount(audit.ambiguousButtonCount, 6) * 10 +
    normalizedCount(audit.formFieldCount, 16) * 8 +
    (destructiveTask ? 8 : 0);
  const recoveryNeed = Math.max(1 - dimensions.errorRecoveryConfidence, behaviorPolicy.typoLikelihood, behaviorPolicy.retryLikelihood);

  return roundScore(raw * (0.78 + recoveryNeed * 0.7));
}

function getWeightedOverallScore(categoryScores: PersonaRiskCategoryScores, benchmarkWeights: PersonaRiskCategoryScores) {
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const category of PERSONA_RISK_CATEGORIES) {
    const weight = Math.max(0.05, benchmarkWeights[category] ?? 1);
    weightedTotal += categoryScores[category] * weight;
    weightTotal += weight;
  }

  return roundScore(weightedTotal / weightTotal);
}

function getTopRiskFactors(
  persona: PersonaBehaviorProfile,
  behaviorPolicy: BehaviorPolicy,
  audit: PageAuditSummary,
  categoryScores: PersonaRiskCategoryScores
) {
  const factors: RiskFactor[] = [
    {
      score: categoryScores.accessibility,
      label: `Accessibility risk is elevated for ${persona.name} when labels, contrast, focus order, or keyboard support are weak.`
    },
    {
      score: categoryScores.performance,
      label: `Performance risk is amplified by patience and speed-pressure traits, especially when page speed or layout stability is poor.`
    },
    {
      score: categoryScores.formComplexity,
      label: `Form complexity risk rises with required fields, duplicate labels, ambiguous controls, and typo likelihood.`
    },
    {
      score: categoryScores.copyAmbiguity,
      label: `Copy ambiguity risk rises when jargon, long copy, duplicate labels, or unclear buttons compete with the task goal.`
    },
    {
      score: categoryScores.privacyFriction,
      label: `Privacy friction risk rises when prompts, trackers, permissions, or account-linking appear for a privacy-sensitive persona.`
    },
    {
      score: categoryScores.mobileResponsiveness,
      label: `Mobile responsiveness risk rises when mobile layout, tap targets, overflow, or modal behavior conflict with the sampled viewport.`
    },
    {
      score: categoryScores.errorRecovery,
      label: `Error recovery risk rises when validation, recovery paths, or destructive-action safeguards are missing.`
    }
  ];

  if (behaviorPolicy.warnings.length > 0) {
    factors.push({
      score: Math.max(...Object.values(categoryScores), 35),
      label: `Sampled policy warnings: ${behaviorPolicy.warnings.join(" ")}`
    });
  }

  if (audit.cookieBannerPresent && persona.dimensions.privacySensitivity > 0.7) {
    factors.push({
      score: categoryScores.privacyFriction + 5,
      label: "Cookie consent appears on a page tested by a privacy-sensitive persona."
    });
  }

  return factors
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((factor) => factor.label);
}

function getStrongestCategories(categoryScores: PersonaRiskCategoryScores) {
  return [...PERSONA_RISK_CATEGORIES].sort((left, right) => categoryScores[right] - categoryScores[left]).slice(0, 3);
}

function getTaskSignals(taskGoal: string) {
  const normalized = taskGoal.toLowerCase();

  return {
    formTask: /account|address|booking|checkout|email|form|payment|password|profile|settings|sign up|signup|upload/.test(normalized),
    sensitiveDataTask: /address|billing|card|cookie|location|payment|permission|phone|privacy|ssn|tracking/.test(normalized),
    destructiveTask: /cancel|delete|remove|reset|terminate|unsubscribe/.test(normalized)
  };
}

function normalizedCount(value: number | undefined, highWaterMark: number) {
  if (!Number.isFinite(value) || highWaterMark <= 0) return 0;
  return Math.max(0, Math.min(1, Number(value) / highWaterMark));
}

function valueOrZero(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function roundScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)));
}
