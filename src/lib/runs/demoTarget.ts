const DEMO_ACCOUNT_SETTINGS_PATH = "/demo-app/account-settings";

export function getDemoAccountSettingsTargetUrl(requestUrl: string) {
  return `${getDemoBaseUrl(requestUrl)}${DEMO_ACCOUNT_SETTINGS_PATH}`;
}

export function getSelfHealedDemoAccountSettingsTargetUrl(requestUrl: string, encodedPlan: string) {
  const url = new URL(getDemoAccountSettingsTargetUrl(requestUrl));
  url.searchParams.set("heal", encodedPlan);
  return url.toString();
}

function getDemoBaseUrl(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configuredBaseUrl = process.env.NEXT_PUBLIC_DEMO_BASE_URL || process.env.FLOWPROOF_APP_URL;
  const baseUrl = isLocalhostTarget(new URL(requestOrigin)) && configuredBaseUrl ? configuredBaseUrl : requestOrigin;
  return baseUrl.replace(/\/$/, "");
}

export function isLocalhostTarget(url: URL) {
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname);
}
