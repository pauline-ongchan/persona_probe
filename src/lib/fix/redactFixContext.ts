import type { FixContext } from "./types";

const SECRET_KEY_PATTERN = /(authorization|cookie|password|passwd|secret|token|api[_-]?key|access[_-]?key|session|localstorage)/i;
const LONG_TEXT_LIMIT = 2000;

export function redactFixContext(context: FixContext): FixContext {
  return redactValue(context) as FixContext;
}

function redactValue(value: unknown, key = ""): unknown {
  if (value == null) return value;

  if (SECRET_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, key));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        redactValue(childValue, childKey)
      ])
    );
  }

  return value;
}

function redactString(value: string) {
  const withoutInlineSecrets = value
    .replace(/(authorization:\s*bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/([?&](?:token|api_key|apikey|key|secret|password)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/((?:token|apiKey|api_key|secret|password)\s*[:=]\s*)["']?[^"',\s]+/gi, "$1[REDACTED]");

  if (withoutInlineSecrets.length <= LONG_TEXT_LIMIT) {
    return withoutInlineSecrets;
  }

  return `${withoutInlineSecrets.slice(0, LONG_TEXT_LIMIT)}...[truncated ${withoutInlineSecrets.length - LONG_TEXT_LIMIT} chars]`;
}
