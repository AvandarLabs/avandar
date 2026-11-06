import { sourceUrl } from "./urlSafety.mjs";

const FORBIDDEN_KEYS =
  /^(?:password|passwd|secret|token|access_token|refresh_token|authorization|cookies?|storageState|localStorage|sessionStorage|api[-_]?key|credentials?|headers|requestBody)$/i;
const TOKEN_PATTERN =
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

/** Redact secrets, tokens, and credential-shaped substrings before text reaches an artifact. */
export function sanitizeText(value, secrets = [], limit = 2000) {
  let text = [...secrets]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .reduce(
      (acc, secret) => acc.split(secret).join("[redacted]"),
      String(value),
    );
  text = text
    .replace(TOKEN_PATTERN, "[redacted token]")
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer [redacted]")
    .replace(
      /\b(?:password|passwd|access_token|refresh_token|api_key|apikey|authorization)\s*[:=]\s*["']?[^\s,"'<>]+/gi,
      "[redacted credential]",
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/https?:\/\/[^\s"'<>]+/g, (url) => sourceUrl(url))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  return text.slice(0, limit);
}

/** Structural rejection keeps credential containers out even if redaction misses one. */
export function assertSafeManifest(value, secrets = [], path = "manifest") {
  if (typeof value === "string") {
    if (
      [...value.matchAll(TOKEN_PATTERN)].length ||
      /\bBearer\s+(?!\[redacted\])/i.test(value)
    )
      throw new Error(`Credential-shaped value at ${path}`);
    for (const secret of secrets.filter(Boolean)) {
      // Short demo passwords can also be legitimate product/workspace substrings.
      if (value === secret || (secret.length >= 8 && value.includes(secret)))
        throw new Error(`Unredacted credential at ${path}`);
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.test(key))
      throw new Error(`Credential field is forbidden at ${path}.${key}`);
    assertSafeManifest(child, secrets, `${path}.${key}`);
  }
}
