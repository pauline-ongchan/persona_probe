import crypto from "node:crypto";

export function createFixContextToken(fixAttemptId: string): string {
  const secret = process.env.FIX_CONTEXT_SECRET;
  if (!secret) {
    throw new Error("FIX_CONTEXT_SECRET is required to create fix-context URLs.");
  }

  const payload = base64UrlEncode(fixAttemptId);
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyFixContextToken(token: string): string | null {
  const secret = process.env.FIX_CONTEXT_SECRET;
  if (!secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
