export const PERSONA_RISK_CATEGORIES = [
  "accessibility",
  "performance",
  "formComplexity",
  "copyAmbiguity",
  "privacyFriction",
  "mobileResponsiveness",
  "errorRecovery"
] as const;

export type PersonaRiskCategory = (typeof PERSONA_RISK_CATEGORIES)[number];

export type PersonaRiskCategoryScores = Record<PersonaRiskCategory, number>;

export type PersonaDimensions = {
  patience: number;
  languageConfidence: number;
  privacySensitivity: number;
  mobileReliance: number;
  visualAccessibilityNeed: number;
  keyboardReliance: number;
  errorRecoveryConfidence: number;
  technicalConfidence: number;
  attentionToDetail: number;
  speedPressure: number;
};

export type PersonaToggles = {
  prefersKeyboardNavigation: boolean;
  prefersMobileViewport: boolean;
  needsPlainLanguage: boolean;
  needsHighContrast: boolean;
  needsLargeText: boolean;
  privacyGuarded: boolean;
  lowPatience: boolean;
  likelyToMakeTypos: boolean;
  likelyToRecoverFromErrors: boolean;
  exploresAdvancedControls: boolean;
  adversarialInputs: boolean;
};

export type PersonaBehaviorProfile = {
  key: string;
  name: string;
  description: string;
  dimensions: PersonaDimensions;
  toggles: PersonaToggles;
  benchmarkWeights: PersonaRiskCategoryScores;
  defaultBehaviorPrompt: string;
};

export type BehaviorViewport = {
  type: "desktop" | "mobile";
  width: number;
  height: number;
};

export type BehaviorPolicy = {
  maxSteps: number;
  retryLikelihood: number;
  scrollLikelihood: number;
  typoLikelihood: number;
  hesitationLikelihood: number;
  refusalLikelihood: number;
  waitBetweenActionsMs: number;
  viewport: BehaviorViewport;
  inputMode: "pointer" | "keyboard" | "touch";
  readingStyle: "scan" | "careful" | "plain-language";
  warnings: string[];
  instructions: string;
};

export type PageAuditSummary = {
  url?: string;
  title?: string;
  interactiveElementCount?: number;
  formFieldCount?: number;
  requiredFieldCount?: number;
  missingLabelCount?: number;
  duplicateLabelCount?: number;
  ambiguousButtonCount?: number;
  jargonTermCount?: number;
  longCopyBlockCount?: number;
  colorContrastIssueCount?: number;
  smallTextCount?: number;
  smallTapTargetCount?: number;
  focusOrderIssueCount?: number;
  keyboardTrapCount?: number;
  autocompleteIssueCount?: number;
  mobileRiskScore?: number;
  performanceRiskScore?: number;
  layoutShiftRiskScore?: number;
  loadTimeMs?: number;
  totalBlockingTimeMs?: number;
  cookieBannerPresent?: boolean;
  privacyPromptCount?: number;
  permissionPromptCount?: number;
  thirdPartyTrackerCount?: number;
  thirdPartyLoginCount?: number;
  passwordFieldCount?: number;
  hasInlineValidation?: boolean;
  errorMessageCount?: number;
  hasRecoveryPath?: boolean;
  captchaPresent?: boolean;
  destructiveActionCount?: number;
  horizontalOverflow?: boolean;
  modalCount?: number;
};

export type PersonaBehaviorRiskScore = {
  overallRiskScore: number;
  categoryScores: PersonaRiskCategoryScores;
  topRiskFactors: string[];
  explanation: string;
};
