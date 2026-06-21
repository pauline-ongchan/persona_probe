import type { PersonaBehaviorProfile, PersonaRiskCategoryScores } from "@/lib/personas/types";

const balancedWeights: PersonaRiskCategoryScores = {
  accessibility: 1,
  performance: 1,
  formComplexity: 1,
  copyAmbiguity: 1,
  privacyFriction: 1,
  mobileResponsiveness: 1,
  errorRecovery: 1
};

export const defaultBehaviorProfiles: PersonaBehaviorProfile[] = [
  {
    key: "baseline-competent-user",
    name: "Baseline Competent User",
    description: "A typical confident user who reads enough context, retries reasonable mistakes, and uses standard desktop interactions.",
    dimensions: {
      patience: 0.72,
      languageConfidence: 0.86,
      privacySensitivity: 0.38,
      mobileReliance: 0.28,
      visualAccessibilityNeed: 0.18,
      keyboardReliance: 0.2,
      errorRecoveryConfidence: 0.78,
      technicalConfidence: 0.72,
      attentionToDetail: 0.76,
      speedPressure: 0.34
    },
    toggles: {
      prefersKeyboardNavigation: false,
      prefersMobileViewport: false,
      needsPlainLanguage: false,
      needsHighContrast: false,
      needsLargeText: false,
      privacyGuarded: false,
      lowPatience: false,
      likelyToMakeTypos: false,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: false,
      adversarialInputs: false
    },
    benchmarkWeights: balancedWeights,
    defaultBehaviorPrompt:
      "Behave like a competent mainstream user. Read visible labels, follow common web conventions, retry obvious mistakes once or twice, and complete the task without unusual edge-case probing."
  },
  {
    key: "rushed-low-patience-user",
    name: "Rushed Low-Patience User",
    description: "A time-pressured user who scans quickly, tries the first plausible path, and gives up when flows feel slow or unclear.",
    dimensions: {
      patience: 0.18,
      languageConfidence: 0.74,
      privacySensitivity: 0.42,
      mobileReliance: 0.42,
      visualAccessibilityNeed: 0.16,
      keyboardReliance: 0.1,
      errorRecoveryConfidence: 0.36,
      technicalConfidence: 0.58,
      attentionToDetail: 0.36,
      speedPressure: 0.92
    },
    toggles: {
      prefersKeyboardNavigation: false,
      prefersMobileViewport: false,
      needsPlainLanguage: false,
      needsHighContrast: false,
      needsLargeText: false,
      privacyGuarded: false,
      lowPatience: true,
      likelyToMakeTypos: true,
      likelyToRecoverFromErrors: false,
      exploresAdvancedControls: false,
      adversarialInputs: false
    },
    benchmarkWeights: {
      accessibility: 0.8,
      performance: 1.45,
      formComplexity: 1.25,
      copyAmbiguity: 1.2,
      privacyFriction: 0.85,
      mobileResponsiveness: 1.05,
      errorRecovery: 1.35
    },
    defaultBehaviorPrompt:
      "Behave like a rushed user with low patience. Scan instead of reading deeply, choose the first plausible control, avoid lengthy exploration, and abandon paths that require repeated retries."
  },
  {
    key: "esl-plain-language-user",
    name: "ESL / Plain-Language User",
    description: "A user who prefers literal labels and simple language, and is more likely to struggle with jargon or duplicate field names.",
    dimensions: {
      patience: 0.62,
      languageConfidence: 0.28,
      privacySensitivity: 0.44,
      mobileReliance: 0.38,
      visualAccessibilityNeed: 0.2,
      keyboardReliance: 0.14,
      errorRecoveryConfidence: 0.48,
      technicalConfidence: 0.42,
      attentionToDetail: 0.52,
      speedPressure: 0.4
    },
    toggles: {
      prefersKeyboardNavigation: false,
      prefersMobileViewport: false,
      needsPlainLanguage: true,
      needsHighContrast: false,
      needsLargeText: false,
      privacyGuarded: false,
      lowPatience: false,
      likelyToMakeTypos: true,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: false,
      adversarialInputs: false
    },
    benchmarkWeights: {
      accessibility: 0.95,
      performance: 0.85,
      formComplexity: 1.25,
      copyAmbiguity: 1.55,
      privacyFriction: 1,
      mobileResponsiveness: 0.95,
      errorRecovery: 1.15
    },
    defaultBehaviorPrompt:
      "Prefer direct, simple labels over dense helper text. Treat jargon, idioms, abbreviations, and duplicate-looking fields as confusing unless the page makes their meaning clear."
  },
  {
    key: "privacy-sensitive-user",
    name: "Privacy-Sensitive User",
    description: "A cautious user who refuses optional tracking, newsletter prompts, permissions, and unnecessary personal data requests.",
    dimensions: {
      patience: 0.58,
      languageConfidence: 0.78,
      privacySensitivity: 0.96,
      mobileReliance: 0.34,
      visualAccessibilityNeed: 0.16,
      keyboardReliance: 0.18,
      errorRecoveryConfidence: 0.62,
      technicalConfidence: 0.68,
      attentionToDetail: 0.8,
      speedPressure: 0.38
    },
    toggles: {
      prefersKeyboardNavigation: false,
      prefersMobileViewport: false,
      needsPlainLanguage: false,
      needsHighContrast: false,
      needsLargeText: false,
      privacyGuarded: true,
      lowPatience: false,
      likelyToMakeTypos: false,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: false,
      adversarialInputs: false
    },
    benchmarkWeights: {
      accessibility: 0.8,
      performance: 0.9,
      formComplexity: 1.1,
      copyAmbiguity: 1.1,
      privacyFriction: 1.75,
      mobileResponsiveness: 0.85,
      errorRecovery: 1
    },
    defaultBehaviorPrompt:
      "Protect personal data. Decline optional cookies, newsletters, account linking, browser permissions, and data collection prompts unless they are strictly required to finish the task."
  },
  {
    key: "mobile-first-user",
    name: "Mobile-First User",
    description: "A phone-first user who relies on visible touch targets, mobile layout affordances, and short scrolling sessions.",
    dimensions: {
      patience: 0.48,
      languageConfidence: 0.72,
      privacySensitivity: 0.42,
      mobileReliance: 0.95,
      visualAccessibilityNeed: 0.22,
      keyboardReliance: 0.06,
      errorRecoveryConfidence: 0.54,
      technicalConfidence: 0.58,
      attentionToDetail: 0.5,
      speedPressure: 0.62
    },
    toggles: {
      prefersKeyboardNavigation: false,
      prefersMobileViewport: true,
      needsPlainLanguage: false,
      needsHighContrast: false,
      needsLargeText: false,
      privacyGuarded: false,
      lowPatience: false,
      likelyToMakeTypos: true,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: false,
      adversarialInputs: false
    },
    benchmarkWeights: {
      accessibility: 1,
      performance: 1.25,
      formComplexity: 1.05,
      copyAmbiguity: 0.95,
      privacyFriction: 0.9,
      mobileResponsiveness: 1.8,
      errorRecovery: 1.1
    },
    defaultBehaviorPrompt:
      "Use a mobile phone mental model. Prefer obvious visible touch targets, avoid tiny controls, scroll only when there is a cue, and treat desktop-only layout patterns as friction."
  },
  {
    key: "keyboard-only-accessibility-user",
    name: "Keyboard-Only Accessibility User",
    description: "A user who navigates by keyboard and depends on predictable focus order, labels, and visible focus states.",
    dimensions: {
      patience: 0.66,
      languageConfidence: 0.76,
      privacySensitivity: 0.44,
      mobileReliance: 0.12,
      visualAccessibilityNeed: 0.64,
      keyboardReliance: 0.98,
      errorRecoveryConfidence: 0.54,
      technicalConfidence: 0.64,
      attentionToDetail: 0.74,
      speedPressure: 0.3
    },
    toggles: {
      prefersKeyboardNavigation: true,
      prefersMobileViewport: false,
      needsPlainLanguage: false,
      needsHighContrast: true,
      needsLargeText: false,
      privacyGuarded: false,
      lowPatience: false,
      likelyToMakeTypos: false,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: false,
      adversarialInputs: false
    },
    benchmarkWeights: {
      accessibility: 1.85,
      performance: 0.85,
      formComplexity: 1.15,
      copyAmbiguity: 1,
      privacyFriction: 0.85,
      mobileResponsiveness: 0.75,
      errorRecovery: 1.25
    },
    defaultBehaviorPrompt:
      "Navigate as a keyboard-only user. Prefer tab order, keyboard activation, clear labels, visible focus states, and recoverable controls over pointer-only interactions."
  },
  {
    key: "low-vision-user",
    name: "Low-Vision User",
    description: "A user who needs readable text, strong contrast, clear spatial grouping, and forgiving controls.",
    dimensions: {
      patience: 0.6,
      languageConfidence: 0.7,
      privacySensitivity: 0.42,
      mobileReliance: 0.3,
      visualAccessibilityNeed: 0.97,
      keyboardReliance: 0.48,
      errorRecoveryConfidence: 0.5,
      technicalConfidence: 0.5,
      attentionToDetail: 0.66,
      speedPressure: 0.28
    },
    toggles: {
      prefersKeyboardNavigation: false,
      prefersMobileViewport: false,
      needsPlainLanguage: false,
      needsHighContrast: true,
      needsLargeText: true,
      privacyGuarded: false,
      lowPatience: false,
      likelyToMakeTypos: true,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: false,
      adversarialInputs: false
    },
    benchmarkWeights: {
      accessibility: 1.9,
      performance: 0.9,
      formComplexity: 1.15,
      copyAmbiguity: 1.05,
      privacyFriction: 0.85,
      mobileResponsiveness: 1.05,
      errorRecovery: 1.2
    },
    defaultBehaviorPrompt:
      "Behave like a low-vision user. Prefer large readable text, strong contrast, visible labels, stable layouts, and controls that remain clear when scanning visually."
  },
  {
    key: "error-recovery-user",
    name: "Error-Recovery User",
    description: "A user who makes realistic mistakes and then tries to understand validation, undo paths, and recovery guidance.",
    dimensions: {
      patience: 0.52,
      languageConfidence: 0.66,
      privacySensitivity: 0.36,
      mobileReliance: 0.38,
      visualAccessibilityNeed: 0.22,
      keyboardReliance: 0.16,
      errorRecoveryConfidence: 0.34,
      technicalConfidence: 0.46,
      attentionToDetail: 0.42,
      speedPressure: 0.5
    },
    toggles: {
      prefersKeyboardNavigation: false,
      prefersMobileViewport: false,
      needsPlainLanguage: false,
      needsHighContrast: false,
      needsLargeText: false,
      privacyGuarded: false,
      lowPatience: false,
      likelyToMakeTypos: true,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: false,
      adversarialInputs: false
    },
    benchmarkWeights: {
      accessibility: 0.95,
      performance: 0.9,
      formComplexity: 1.35,
      copyAmbiguity: 1.15,
      privacyFriction: 0.85,
      mobileResponsiveness: 0.95,
      errorRecovery: 1.85
    },
    defaultBehaviorPrompt:
      "Make plausible input mistakes, then try to recover using validation messages, undo affordances, back navigation, and visible help. Penalize flows that hide what went wrong."
  },
  {
    key: "power-user",
    name: "Power User",
    description: "An experienced user who uses search, shortcuts, direct navigation, and advanced controls to finish efficiently.",
    dimensions: {
      patience: 0.58,
      languageConfidence: 0.94,
      privacySensitivity: 0.5,
      mobileReliance: 0.2,
      visualAccessibilityNeed: 0.12,
      keyboardReliance: 0.58,
      errorRecoveryConfidence: 0.9,
      technicalConfidence: 0.96,
      attentionToDetail: 0.84,
      speedPressure: 0.66
    },
    toggles: {
      prefersKeyboardNavigation: true,
      prefersMobileViewport: false,
      needsPlainLanguage: false,
      needsHighContrast: false,
      needsLargeText: false,
      privacyGuarded: false,
      lowPatience: false,
      likelyToMakeTypos: false,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: true,
      adversarialInputs: false
    },
    benchmarkWeights: {
      accessibility: 0.8,
      performance: 1.2,
      formComplexity: 0.85,
      copyAmbiguity: 0.75,
      privacyFriction: 0.85,
      mobileResponsiveness: 0.75,
      errorRecovery: 0.85
    },
    defaultBehaviorPrompt:
      "Behave like an expert user. Use search, shortcuts, direct field targeting, advanced controls, and efficient navigation while still following the visible task goal."
  },
  {
    key: "adversarial-edge-case-user",
    name: "Adversarial Edge-Case User",
    description: "A stress-test persona that probes invalid inputs, odd ordering, edge cases, and mid-flow changes.",
    dimensions: {
      patience: 0.56,
      languageConfidence: 0.82,
      privacySensitivity: 0.7,
      mobileReliance: 0.48,
      visualAccessibilityNeed: 0.24,
      keyboardReliance: 0.3,
      errorRecoveryConfidence: 0.78,
      technicalConfidence: 0.86,
      attentionToDetail: 0.62,
      speedPressure: 0.58
    },
    toggles: {
      prefersKeyboardNavigation: false,
      prefersMobileViewport: false,
      needsPlainLanguage: false,
      needsHighContrast: false,
      needsLargeText: false,
      privacyGuarded: true,
      lowPatience: false,
      likelyToMakeTypos: true,
      likelyToRecoverFromErrors: true,
      exploresAdvancedControls: true,
      adversarialInputs: true
    },
    benchmarkWeights: {
      accessibility: 1.05,
      performance: 1.05,
      formComplexity: 1.45,
      copyAmbiguity: 1.15,
      privacyFriction: 1.25,
      mobileResponsiveness: 1.05,
      errorRecovery: 1.55
    },
    defaultBehaviorPrompt:
      "Probe edge cases while staying within the task. Try one invalid value, change a choice mid-flow, test recovery affordances, and be skeptical of required personal-data prompts."
  }
];

export function getDefaultBehaviorProfile(key: string) {
  return defaultBehaviorProfiles.find((profile) => profile.key === key) ?? null;
}
