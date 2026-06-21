import type { OracleType } from "@prisma/client";
import { withSentrySpan } from "@/lib/sentry/withSentrySpan";

type LocatorLike = {
  count: () => Promise<number>;
};

export type PageLike = {
  url: () => string;
  locator: (selector: string) => LocatorLike;
};

export type OracleInput = {
  type: OracleType;
  value: string;
  page: PageLike;
  finalTextSample: string;
};

export type OracleResult = {
  passed: boolean;
  score: number;
  failureReason: string | null;
};

export async function evaluateOracle(input: OracleInput): Promise<OracleResult> {
  return withSentrySpan(
    "oracle.evaluate",
    {
      "oracle.type": input.type,
      "oracle.value_length": input.value.length
    },
    async () => {
      const expected = input.value.trim();

      if (!expected) {
        return {
          passed: false,
          score: 0,
          failureReason: "Success criteria value is empty."
        };
      }

      if (input.type === "URL_CONTAINS") {
        const passed = input.page.url().toLowerCase().includes(expected.toLowerCase());
        return {
          passed,
          score: passed ? 1 : 0,
          failureReason: passed ? null : `Final URL did not contain "${expected}".`
        };
      }

      if (input.type === "TEXT_CONTAINS") {
        const passed = input.finalTextSample.toLowerCase().includes(expected.toLowerCase());
        return {
          passed,
          score: passed ? 1 : 0,
          failureReason: passed ? null : `Page text did not contain "${expected}".`
        };
      }

      if (input.type === "SELECTOR_EXISTS") {
        const count = await input.page.locator(expected).count();
        return {
          passed: count > 0,
          score: count > 0 ? 1 : 0,
          failureReason: count > 0 ? null : `Selector "${expected}" was not found.`
        };
      }

      return {
        passed: false,
        score: 0.2,
        failureReason: "LLM judge is stubbed for the MVP. Use URL, text, or selector criteria for deterministic runs."
      };
    }
  );
}
