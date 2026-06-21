export function normalizePublicAppUrl(value: string | null | undefined): string | null {
  let normalized = String(value || "").trim();
  if (!normalized) return null;

  const markdownLinkMatch = normalized.match(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownLinkMatch?.[1]) {
    normalized = markdownLinkMatch[1];
  }

  normalized = normalized.replace(/^<|>$/g, "").trim();

  if (!/^https?:\/\//i.test(normalized) && /^[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}
