import type { FailureCategory, OracleType, RunMode, TestCaseStatus } from "@prisma/client";
import { withSentrySpan } from "@/lib/sentry/withSentrySpan";

export type SelfHealPlan = {
  version: 1;
  generatedBy: "trace-self-healing-agent";
  sourceRunId: string;
  fixes: {
    removeBillingEmailTrap: boolean;
    removeOptionalPhoneField: boolean;
    removePermissionsModal: boolean;
    newsletterDefaultChecked: boolean;
    useExplicitAccountEmailCopy: boolean;
    useExplicitSaveButton: boolean;
    keepSaveVisibleOnMobile: boolean;
    useSpecificErrorMessages: boolean;
  };
  reasons: string[];
};

type TestCaseForSelfHeal = {
  id: string;
  status: TestCaseStatus;
  failureCategory: FailureCategory | null;
  failureReason: string | null;
  actionTrace: string;
  persona: {
    key: string;
    name: string;
  };
};

export async function generateSelfHealPlan({
  runId,
  mode,
  oracleType,
  testCases
}: {
  runId: string;
  mode: RunMode;
  oracleType: OracleType;
  testCases: TestCaseForSelfHeal[];
}) {
  return withSentrySpan(
    "self_healing.agent.generate_plan",
    {
      "run.id": runId,
      "run.mode": mode,
      "oracle.type": oracleType,
      "test_case.count": testCases.length
    },
    async () => {
      const failed = testCases.filter(
        (testCase) =>
          (testCase.status === "FAIL" || testCase.status === "ERROR") &&
          testCase.failureCategory !== "INFRA_FAILURE"
      );

      const reasons = new Set<string>();
      const traceText = failed.map((testCase) => `${testCase.persona.key}\n${testCase.failureReason || ""}\n${testCase.actionTrace}`).join("\n").toLowerCase();
      const failedPersonaKeys = new Set(failed.map((testCase) => testCase.persona.key));

      const removeBillingEmailTrap =
        traceText.includes("billing email") ||
        failedPersonaKeys.has("impatient") ||
        failedPersonaKeys.has("esl");
      if (removeBillingEmailTrap) {
        reasons.add("Failed traces show personas choosing Billing email instead of Account email.");
      }

      const removePermissionsModal =
        traceText.includes("permission") ||
        traceText.includes("tracking") ||
        failedPersonaKeys.has("privacy-sensitive");
      if (removePermissionsModal) {
        reasons.add("The privacy/permissions modal and tracking defaults add nonessential decisions before the task.");
      }

      const keepSaveVisibleOnMobile =
        traceText.includes("below the mobile fold") ||
        traceText.includes("visible touch target") ||
        failedPersonaKeys.has("mobile-first");
      if (keepSaveVisibleOnMobile) {
        reasons.add("Mobile-first traces show the save action was not an obvious visible touch target.");
      }

      const useSpecificErrorMessages =
        traceText.includes("invalid") ||
        traceText.includes("vague") ||
        traceText.includes("couldn't save") ||
        failedPersonaKeys.has("adversarial");
      if (useSpecificErrorMessages) {
        reasons.add("Vague validation made recovery unclear after wrong or invalid input.");
      }

      const plan: SelfHealPlan = {
        version: 1,
        generatedBy: "trace-self-healing-agent",
        sourceRunId: runId,
        fixes: {
          removeBillingEmailTrap,
          removeOptionalPhoneField: true,
          removePermissionsModal,
          newsletterDefaultChecked: false,
          useExplicitAccountEmailCopy: true,
          useExplicitSaveButton: true,
          keepSaveVisibleOnMobile,
          useSpecificErrorMessages
        },
        reasons: Array.from(reasons)
      };

      if (!plan.reasons.length) {
        plan.reasons.push("The run failed without an infra cause, so the agent simplified the path to the oracle.");
      }

      return plan;
    }
  );
}

export function encodeSelfHealPlan(plan: SelfHealPlan) {
  return Buffer.from(JSON.stringify(plan), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
