import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getDemoAccountSettingsTargetUrl,
  getSelfHealedDemoAccountSettingsTargetUrl
} from "../../src/lib/runs/demoTarget";

const originalDemoBaseUrl = process.env.NEXT_PUBLIC_DEMO_BASE_URL;
const originalFlowproofAppUrl = process.env.FLOWPROOF_APP_URL;

afterEach(() => {
  restoreEnv("NEXT_PUBLIC_DEMO_BASE_URL", originalDemoBaseUrl);
  restoreEnv("FLOWPROOF_APP_URL", originalFlowproofAppUrl);
});

test("deployed sample runs use the FlowProof app origin instead of stale configured demo targets", () => {
  process.env.NEXT_PUBLIC_DEMO_BASE_URL = "https://userpersonatestwebsite.vercel.app";
  process.env.FLOWPROOF_APP_URL = "https://also-stale.example.com";

  assert.equal(
    getDemoAccountSettingsTargetUrl("https://persona-probe-6f7d.vercel.app/api/runs"),
    "https://persona-probe-6f7d.vercel.app/demo-app/account-settings"
  );
});

test("local sample runs can use a configured public app origin", () => {
  delete process.env.NEXT_PUBLIC_DEMO_BASE_URL;
  process.env.FLOWPROOF_APP_URL = "https://flowproof-preview.example.com/";

  assert.equal(
    getDemoAccountSettingsTargetUrl("http://localhost:3000/api/runs"),
    "https://flowproof-preview.example.com/demo-app/account-settings"
  );
});

test("self-healed sample runs keep the repair plan on the FlowProof sample page", () => {
  process.env.NEXT_PUBLIC_DEMO_BASE_URL = "https://userpersonatestwebsite.vercel.app";

  assert.equal(
    getSelfHealedDemoAccountSettingsTargetUrl("https://persona-probe-6f7d.vercel.app/api/runs/run-1/self-heal", "abc123"),
    "https://persona-probe-6f7d.vercel.app/demo-app/account-settings?heal=abc123"
  );
});

function restoreEnv(key: "NEXT_PUBLIC_DEMO_BASE_URL" | "FLOWPROOF_APP_URL", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
