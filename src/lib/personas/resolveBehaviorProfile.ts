import { defaultBehaviorProfiles, getDefaultBehaviorProfile } from "@/lib/personas/defaultBehaviorProfiles";
import type { PersonaBehaviorProfile, PersonaDimensions, PersonaToggles } from "@/lib/personas/types";

type PersonaLike = {
  key: string;
  name: string;
  description?: string | null;
  behaviorPrompt: string;
  riskWeight?: number | null;
};

const PROFILE_ALIASES: Record<string, string> = {
  impatient: "rushed-low-patience-user",
  "low-patience": "rushed-low-patience-user",
  rushed: "rushed-low-patience-user",
  esl: "esl-plain-language-user",
  "plain-language": "esl-plain-language-user",
  "mobile-first": "mobile-first-user",
  mobile: "mobile-first-user",
  "privacy-sensitive": "privacy-sensitive-user",
  privacy: "privacy-sensitive-user",
  "keyboard-only": "keyboard-only-accessibility-user",
  "keyboard-only-accessibility": "keyboard-only-accessibility-user",
  "low-vision": "low-vision-user",
  "error-recovery": "error-recovery-user",
  adversarial: "adversarial-edge-case-user",
  "adversarial-edge": "adversarial-edge-case-user",
  "edge-case": "adversarial-edge-case-user"
};

const NEUTRAL_WEIGHTS = {
  accessibility: 1,
  performance: 1,
  formComplexity: 1,
  copyAmbiguity: 1,
  privacyFriction: 1,
  mobileResponsiveness: 1,
  errorRecovery: 1
};

export function resolveBehaviorProfile(persona: PersonaLike): PersonaBehaviorProfile {
  const directProfile = getDefaultBehaviorProfile(persona.key);
  if (directProfile) return directProfile;

  const aliasProfile = getDefaultBehaviorProfile(PROFILE_ALIASES[persona.key]);
  if (aliasProfile) return aliasProfile;

  const normalized = getPersonaText(persona);
  const inferredProfile = defaultBehaviorProfiles.find((profile) => normalized.includes(profile.key));
  if (inferredProfile) return inferredProfile;

  return buildCustomBehaviorProfile(persona, normalized);
}

function buildCustomBehaviorProfile(persona: PersonaLike, normalized: string): PersonaBehaviorProfile {
  const riskWeight = clamp01(persona.riskWeight ?? 0.5);
  const dimensions: PersonaDimensions = {
    patience: includesAny(normalized, ["rushed", "impatient", "low patience", "gives up"]) ? 0.24 : 0.58,
    languageConfidence: includesAny(normalized, ["esl", "plain language", "jargon", "simple labels"]) ? 0.34 : 0.72,
    privacySensitivity: includesAny(normalized, ["privacy", "tracking", "cookie", "permission", "personal data"]) ? 0.9 : 0.42,
    mobileReliance: includesAny(normalized, ["mobile", "phone", "touch", "small screen"]) ? 0.9 : 0.28,
    visualAccessibilityNeed: includesAny(normalized, ["accessibility", "low vision", "contrast", "large text", "screen reader"])
      ? 0.82
      : 0.2,
    keyboardReliance: includesAny(normalized, ["keyboard", "tab order", "shortcuts"]) ? 0.88 : 0.18,
    errorRecoveryConfidence: includesAny(normalized, ["error", "recovery", "mistake", "invalid"]) ? 0.42 : 0.62,
    technicalConfidence: includesAny(normalized, ["power", "advanced", "technical", "shortcut"]) ? 0.88 : 0.58,
    attentionToDetail: includesAny(normalized, ["rushed", "scan", "quickly"]) ? 0.38 : 0.62,
    speedPressure: includesAny(normalized, ["rushed", "quickly", "fast", "time"]) ? 0.82 : 0.42
  };
  const toggles: PersonaToggles = {
    prefersKeyboardNavigation: dimensions.keyboardReliance > 0.65,
    prefersMobileViewport: dimensions.mobileReliance > 0.65,
    needsPlainLanguage: dimensions.languageConfidence < 0.45,
    needsHighContrast: dimensions.visualAccessibilityNeed > 0.65,
    needsLargeText: includesAny(normalized, ["large text", "low vision"]),
    privacyGuarded: dimensions.privacySensitivity > 0.7,
    lowPatience: dimensions.patience < 0.35,
    likelyToMakeTypos: includesAny(normalized, ["typo", "mistake", "rushed", "esl"]),
    likelyToRecoverFromErrors: !includesAny(normalized, ["gives up", "no retries"]),
    exploresAdvancedControls: includesAny(normalized, ["power", "advanced", "technical"]),
    adversarialInputs: includesAny(normalized, ["adversarial", "edge case", "invalid"])
  };

  return {
    key: persona.key,
    name: persona.name,
    description: persona.description || "Custom persona mapped into the benchmark-aware behavior system.",
    dimensions,
    toggles,
    benchmarkWeights: {
      accessibility: NEUTRAL_WEIGHTS.accessibility + dimensions.visualAccessibilityNeed * 0.5,
      performance: NEUTRAL_WEIGHTS.performance + Math.max(1 - dimensions.patience, dimensions.speedPressure) * 0.35,
      formComplexity: NEUTRAL_WEIGHTS.formComplexity + (1 - dimensions.languageConfidence) * 0.35 + riskWeight * 0.2,
      copyAmbiguity: NEUTRAL_WEIGHTS.copyAmbiguity + (1 - dimensions.languageConfidence) * 0.6,
      privacyFriction: NEUTRAL_WEIGHTS.privacyFriction + dimensions.privacySensitivity * 0.55,
      mobileResponsiveness: NEUTRAL_WEIGHTS.mobileResponsiveness + dimensions.mobileReliance * 0.55,
      errorRecovery: NEUTRAL_WEIGHTS.errorRecovery + (1 - dimensions.errorRecoveryConfidence) * 0.45
    },
    defaultBehaviorPrompt: persona.behaviorPrompt
  };
}

function getPersonaText(persona: PersonaLike) {
  return [persona.key, persona.name, persona.description, persona.behaviorPrompt].filter(Boolean).join(" ").toLowerCase();
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}
