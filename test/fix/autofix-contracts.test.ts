import assert from "node:assert/strict";
import test from "node:test";
import { buildFixAttemptCallbackUpdate } from "../../src/lib/fix/fixAttemptCallbackUpdate";
import { buildFixContextResponse } from "../../src/lib/fix/fixContextResponse";
import {
  getStatusAfterCallback,
  getStatusAfterContextFetch,
  parseFixAttemptCallbackPayload
} from "../../src/lib/fix/fixAttemptStatus";
import { createFixContextToken, verifyFixContextToken } from "../../src/lib/fix/fixContextToken";
import { normalizePublicAppUrl } from "../../src/lib/fix/publicAppUrl";
import type { FixContext } from "../../src/lib/fix/types";

const sampleFixContext: FixContext = {
  version: "1.0",
  testCase: {
    id: "test-case-1",
    runId: "run-1",
    persona: "Careful Buyer (careful_buyer)",
    taskGoal: "Update account settings",
    failureReason: "Save button was hidden below the fold."
  },
  target: {
    url: "https://example.com/account",
    githubOwner: "owner",
    githubRepo: "repo",
    baseBranch: "main"
  },
  actionTrace: [
    {
      step: 1,
      action: "Click save",
      observation: "Button was not visible"
    }
  ],
  instructions: "Make the smallest safe fix."
};

test("fix-context tokens round-trip only with the configured secret", () => {
  process.env.FIX_CONTEXT_SECRET = "test-secret";

  const token = createFixContextToken("fix-attempt-1");

  assert.equal(verifyFixContextToken(token), "fix-attempt-1");

  process.env.FIX_CONTEXT_SECRET = "different-secret";
  assert.equal(verifyFixContextToken(token), null);
});

test("FixContext response includes an authenticated callback contract", () => {
  const response = buildFixContextResponse({
    appUrl: "https://flowproof.example.com/",
    fixAttemptId: "fix-attempt-1",
    fixContext: sampleFixContext,
    requestUrl: "https://ignored.example.com/api/fix-context/fix-attempt-1",
    token: "signed-token"
  });

  assert.equal(response.callback.url, "https://flowproof.example.com/api/fix-attempts/fix-attempt-1/callback");
  assert.equal(response.callback.method, "POST");
  assert.equal(response.callback.authHeader, "Authorization");
  assert.equal(response.callback.bearerToken, "signed-token");
  assert.deepEqual(response.callback.statusValues, ["CONTEXT_FETCHED", "PR_OPENED", "FAILED"]);
});

test("public app URL normalization accepts plain hosts and markdown links", () => {
  assert.equal(normalizePublicAppUrl("persona-probe-6f7d.vercel.app"), "https://persona-probe-6f7d.vercel.app");
  assert.equal(
    normalizePublicAppUrl("[persona-probe-6f7d.vercel.app](https://persona-probe-6f7d.vercel.app/)"),
    "https://persona-probe-6f7d.vercel.app"
  );
  assert.equal(
    normalizePublicAppUrl("https://[persona-probe-6f7d.vercel.app](https://persona-probe-6f7d.vercel.app/)"),
    "https://persona-probe-6f7d.vercel.app"
  );
  assert.equal(normalizePublicAppUrl("ftp://persona-probe.example.com"), null);
});

test("FixAttempt status transitions do not downgrade completed attempts", () => {
  assert.equal(getStatusAfterContextFetch("WORKFLOW_TRIGGERED"), "CONTEXT_FETCHED");
  assert.equal(getStatusAfterContextFetch("PR_OPENED"), "PR_OPENED");
  assert.equal(getStatusAfterCallback("CONTEXT_FETCHED", "PR_OPENED"), "PR_OPENED");
  assert.equal(getStatusAfterCallback("PR_OPENED", "CONTEXT_FETCHED"), "PR_OPENED");
  assert.equal(getStatusAfterCallback("WORKFLOW_TRIGGERED", "FAILED"), "FAILED");
});

test("callback payload validation requires PR URLs for PR_OPENED", () => {
  const missingPrUrl = parseFixAttemptCallbackPayload({ status: "PR_OPENED" });
  assert.equal(missingPrUrl.ok, false);

  const invalidPrUrl = parseFixAttemptCallbackPayload({ status: "PR_OPENED", prUrl: "not-a-url" });
  assert.equal(invalidPrUrl.ok, false);

  const parsed = parseFixAttemptCallbackPayload({
    status: "PR_OPENED",
    prUrl: "https://github.com/owner/repo/pull/123",
    githubWorkflowRunId: "987654321",
    evidence: {
      branch: "flowproof/autofix-fix-attempt-1",
      commitSha: "abc123"
    }
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.deepEqual(buildFixAttemptCallbackUpdate("CONTEXT_FETCHED", parsed.payload), {
    status: "PR_OPENED",
    prUrl: "https://github.com/owner/repo/pull/123",
    errorMessage: null,
    githubWorkflowRunId: "987654321"
  });
});

test("FAILED callbacks persist a useful fallback error", () => {
  const parsed = parseFixAttemptCallbackPayload({ status: "FAILED" });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.deepEqual(buildFixAttemptCallbackUpdate("CONTEXT_FETCHED", parsed.payload), {
    status: "FAILED",
    errorMessage: "Autofix workflow reported failure."
  });
});
