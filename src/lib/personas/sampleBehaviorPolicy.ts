import type { BehaviorPolicy, PageAuditSummary, PersonaBehaviorProfile, PersonaDimensions } from "@/lib/personas/types";

type SampleBehaviorPolicyInput = {
  persona: PersonaBehaviorProfile;
  seed: string | number;
  pageAudit?: PageAuditSummary;
};

const MOBILE_VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 430, height: 932 }
];

const DESKTOP_VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 960 }
];

export function sampleBehaviorPolicy({ persona, seed, pageAudit }: SampleBehaviorPolicyInput): BehaviorPolicy {
  const random = createSeededRandom(`${persona.key}:${seed}`);
  const dimensions = normalizeDimensions(persona.dimensions);
  const audit = pageAudit ?? {};
  const toggles = persona.toggles;
  const mobileViewport = dimensions.mobileReliance >= 0.65 || toggles.prefersMobileViewport;
  const viewport = mobileViewport
    ? { type: "mobile" as const, ...pickRandom(MOBILE_VIEWPORTS, random) }
    : { type: "desktop" as const, ...pickRandom(DESKTOP_VIEWPORTS, random) };
  const auditComplexity = clamp01(
    valueOrZero(audit.formFieldCount) / 18 +
      valueOrZero(audit.modalCount) / 8 +
      valueOrZero(audit.ambiguousButtonCount) / 8
  );

  const maxSteps = clampInteger(
    Math.round(
      6 +
        dimensions.patience * 12 +
        dimensions.technicalConfidence * 3 -
        dimensions.speedPressure * 4 -
        auditComplexity * 3 +
        jitter(random, -2.5, 2.5)
    ),
    3,
    28
  );
  const retryLikelihood = roundProbability(
    0.08 +
      dimensions.patience * 0.42 +
      dimensions.errorRecoveryConfidence * 0.28 -
      dimensions.speedPressure * 0.18 -
      auditComplexity * 0.08 +
      (toggles.lowPatience ? -0.14 : 0) +
      jitter(random, -0.08, 0.08)
  );
  const scrollLikelihood = roundProbability(
    0.26 +
      dimensions.patience * 0.2 +
      dimensions.mobileReliance * 0.18 -
      dimensions.speedPressure * 0.08 +
      valueOrZero(audit.mobileRiskScore) * 0.08 +
      jitter(random, -0.1, 0.12)
  );
  const typoLikelihood = roundProbability(
    0.02 +
      (1 - dimensions.attentionToDetail) * 0.12 +
      dimensions.speedPressure * 0.08 +
      (1 - dimensions.languageConfidence) * 0.06 +
      (toggles.likelyToMakeTypos ? 0.1 : 0) +
      jitter(random, -0.03, 0.05)
  );
  const refusalLikelihood = roundProbability(
    0.03 +
      dimensions.privacySensitivity * 0.42 +
      valueOrZero(audit.privacyPromptCount) * 0.05 +
      (audit.cookieBannerPresent ? 0.08 : 0) +
      (toggles.privacyGuarded ? 0.12 : 0) +
      jitter(random, -0.04, 0.04)
  );
  const hesitationLikelihood = roundProbability(
    0.08 +
      (1 - dimensions.languageConfidence) * 0.18 +
      dimensions.visualAccessibilityNeed * 0.1 +
      auditComplexity * 0.14 +
      valueOrZero(audit.jargonTermCount) * 0.01 +
      jitter(random, -0.05, 0.06)
  );
  const waitBetweenActionsMs = clampInteger(
    Math.round(
      300 +
        (1 - dimensions.speedPressure) * 800 +
        dimensions.visualAccessibilityNeed * 350 +
        (1 - dimensions.languageConfidence) * 280 +
        jitter(random, -120, 180)
    ),
    150,
    1800
  );
  const inputMode = toggles.prefersKeyboardNavigation || dimensions.keyboardReliance > 0.65 ? "keyboard" : mobileViewport ? "touch" : "pointer";
  const readingStyle =
    toggles.needsPlainLanguage || dimensions.languageConfidence < 0.45
      ? "plain-language"
      : dimensions.attentionToDetail > 0.72 || dimensions.visualAccessibilityNeed > 0.55
        ? "careful"
        : "scan";
  const warnings = buildWarnings(persona, audit);
  const instructions = buildInstructions({
    persona,
    policyValues: {
      maxSteps,
      retryLikelihood,
      scrollLikelihood,
      typoLikelihood,
      hesitationLikelihood,
      refusalLikelihood,
      waitBetweenActionsMs,
      viewport,
      inputMode,
      readingStyle,
      warnings
    }
  });

  return {
    maxSteps,
    retryLikelihood,
    scrollLikelihood,
    typoLikelihood,
    hesitationLikelihood,
    refusalLikelihood,
    waitBetweenActionsMs,
    viewport,
    inputMode,
    readingStyle,
    warnings,
    instructions
  };
}

function buildWarnings(persona: PersonaBehaviorProfile, audit: PageAuditSummary) {
  const warnings: string[] = [];
  const dimensions = persona.dimensions;

  if (dimensions.visualAccessibilityNeed > 0.55 || persona.toggles.prefersKeyboardNavigation) {
    if (valueOrZero(audit.missingLabelCount) > 0) warnings.push("Missing labels may block accessible field selection.");
    if (valueOrZero(audit.focusOrderIssueCount) > 0) warnings.push("Focus-order issues may make keyboard navigation unreliable.");
    if (valueOrZero(audit.colorContrastIssueCount) > 0) warnings.push("Contrast issues may reduce confidence in visible controls.");
  }

  if (dimensions.languageConfidence < 0.45 || persona.toggles.needsPlainLanguage) {
    if (valueOrZero(audit.jargonTermCount) > 0) warnings.push("Jargon may cause misinterpretation.");
    if (valueOrZero(audit.duplicateLabelCount) > 0) warnings.push("Duplicate field labels may cause wrong-field entry.");
    if (valueOrZero(audit.ambiguousButtonCount) > 0) warnings.push("Ambiguous buttons may cause wrong-path selection.");
  }

  if (dimensions.privacySensitivity > 0.7 || persona.toggles.privacyGuarded) {
    if (audit.cookieBannerPresent) warnings.push("Cookie banners may trigger refusal or extra scrutiny.");
    if (valueOrZero(audit.privacyPromptCount) > 0) warnings.push("Privacy prompts may interrupt task completion.");
    if (valueOrZero(audit.permissionPromptCount) > 0) warnings.push("Permission prompts may be refused unless required.");
  }

  if (dimensions.mobileReliance > 0.65 || persona.toggles.prefersMobileViewport) {
    if (valueOrZero(audit.mobileRiskScore) > 0.35) warnings.push("Mobile layout risk may make controls hard to find or tap.");
    if (audit.horizontalOverflow) warnings.push("Horizontal overflow may hide mobile controls.");
    if (valueOrZero(audit.smallTapTargetCount) > 0) warnings.push("Small tap targets may cause missed or wrong taps.");
  }

  return warnings;
}

function buildInstructions({
  persona,
  policyValues
}: {
  persona: PersonaBehaviorProfile;
  policyValues: Omit<BehaviorPolicy, "instructions">;
}) {
  const dimensions = persona.dimensions;
  const lines = [
    `Persona: ${persona.name}.`,
    persona.defaultBehaviorPrompt,
    `Behavior policy: use at most ${policyValues.maxSteps} meaningful actions, wait about ${policyValues.waitBetweenActionsMs}ms between actions, and use ${policyValues.inputMode} interaction.`,
    `Viewport: ${policyValues.viewport.type} ${policyValues.viewport.width}x${policyValues.viewport.height}. Reading style: ${policyValues.readingStyle}.`,
    `Likelihoods: retry=${describeLikelihood(policyValues.retryLikelihood)}, scroll=${describeLikelihood(
      policyValues.scrollLikelihood
    )}, typo=${describeLikelihood(policyValues.typoLikelihood)}, hesitation=${describeLikelihood(
      policyValues.hesitationLikelihood
    )}, refusal=${describeLikelihood(policyValues.refusalLikelihood)}.`
  ];

  if (policyValues.viewport.type === "mobile") {
    lines.push("Use mobile expectations: favor visible touch targets, short labels, and controls that fit without horizontal panning.");
  }

  if (policyValues.inputMode === "keyboard") {
    lines.push("Use keyboard-first navigation. Prefer tab order, enter/space activation, and visible focus feedback.");
  }

  if (dimensions.visualAccessibilityNeed > 0.55 || persona.toggles.needsHighContrast || persona.toggles.needsLargeText) {
    lines.push("Accessibility attention: prefer clearly labeled controls, readable text, strong contrast, stable layout, and visible validation messages.");
  }

  if (dimensions.languageConfidence < 0.45 || persona.toggles.needsPlainLanguage) {
    lines.push("Plain-language attention: prefer simple labels and warn when jargon, abbreviations, duplicate fields, or ambiguous buttons could change the selected path.");
  }

  if (dimensions.privacySensitivity > 0.7 || persona.toggles.privacyGuarded) {
    lines.push("Privacy behavior: refuse optional tracking, newsletters, permissions, social sign-in, and unnecessary personal data requests.");
  }

  if (persona.toggles.likelyToMakeTypos || policyValues.typoLikelihood > 0.16) {
    lines.push("Input behavior: occasionally make plausible typing mistakes, then rely on the page to make correction and validation clear.");
  }

  if (persona.toggles.adversarialInputs) {
    lines.push("Edge-case behavior: try one invalid or unusual value, change one choice mid-flow, and check whether recovery remains understandable.");
  }

  if (policyValues.warnings.length > 0) {
    lines.push(`Page-audit warnings: ${policyValues.warnings.join(" ")}`);
  }

  return lines.join("\n");
}

function normalizeDimensions(dimensions: PersonaDimensions): PersonaDimensions {
  return {
    patience: clamp01(dimensions.patience),
    languageConfidence: clamp01(dimensions.languageConfidence),
    privacySensitivity: clamp01(dimensions.privacySensitivity),
    mobileReliance: clamp01(dimensions.mobileReliance),
    visualAccessibilityNeed: clamp01(dimensions.visualAccessibilityNeed),
    keyboardReliance: clamp01(dimensions.keyboardReliance),
    errorRecoveryConfidence: clamp01(dimensions.errorRecoveryConfidence),
    technicalConfidence: clamp01(dimensions.technicalConfidence),
    attentionToDetail: clamp01(dimensions.attentionToDetail),
    speedPressure: clamp01(dimensions.speedPressure)
  };
}

function pickRandom<T>(items: T[], random: () => number) {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function describeLikelihood(value: number) {
  if (value >= 0.72) return "high";
  if (value >= 0.38) return "medium";
  return "low";
}

function jitter(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function roundProbability(value: number) {
  return Number(clamp01(value).toFixed(2));
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampInteger(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function valueOrZero(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function createSeededRandom(seed: string) {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
