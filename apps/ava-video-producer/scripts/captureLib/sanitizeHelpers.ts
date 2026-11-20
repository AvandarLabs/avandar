import { isNotEmpty } from "@avandar/utils";
import { makeSourceUrlFromUrl } from "./urlSafetyHelpers";

const FORBIDDEN_KEYS =
  /^(?:password|passwd|secret|token|access_token|refresh_token|authorization|cookies?|storageState|localStorage|sessionStorage|api[-_]?key|credentials?|headers|requestBody)$/i;

const TOKEN_PATTERN =
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

/** Whether a character is a control character other than tab, LF, or CR. */
function _isStrippedControl(character: string): boolean {
  const code = character.charCodeAt(0);
  return code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d;
}

/**
 * Redacts secrets, tokens, and credential-shaped substrings before text
 * reaches an artifact.
 */
export function makeRedactedTextFromValue({
  value,
  secrets = [],
  limit = 2000,
}: Readonly<{
  value: unknown;
  secrets?: ReadonlyArray<string | undefined>;
  limit?: number;
}>): string {
  const withoutSecrets = [...secrets]
    .filter(isNotEmpty)
    .sort((a, b) => {
      return b.length - a.length;
    })
    .reduce((text, secret) => {
      return text.split(secret).join("[redacted]");
    }, String(value));
  return withoutSecrets
    .replace(TOKEN_PATTERN, "[redacted token]")
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer [redacted]")
    .replace(
      /\b(?:password|passwd|access_token|refresh_token|api_key|apikey|authorization)\s*[:=]\s*["']?[^\s,"'<>]+/gi,
      "[redacted credential]",
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/https?:\/\/[^\s"'<>]+/g, (url) => {
      return makeSourceUrlFromUrl(url);
    })
    .split("")
    .filter((character) => {
      return !_isStrippedControl(character);
    })
    .join("")
    .slice(0, limit);
}

function _assertSafeString({
  value,
  secrets,
  path,
}: Readonly<{
  value: string;
  secrets: ReadonlyArray<string | undefined>;
  path: string;
}>): void {
  if (
    [...value.matchAll(TOKEN_PATTERN)].length ||
    /\bBearer\s+(?!\[redacted\])/i.test(value)
  ) {
    throw new Error(`Credential-shaped value at ${path}`);
  }
  secrets.filter(isNotEmpty).forEach((secret) => {
    // Short demo passwords can also be legitimate product/workspace substrings.
    if (value === secret || (secret.length >= 8 && value.includes(secret))) {
      throw new Error(`Unredacted credential at ${path}`);
    }
  });
}

/**
 * Throws when a capture manifest contains a credential container or an
 * unredacted credential. The structural check keeps credential fields out
 * even if text redaction misses one.
 */
export function assertSafeManifest({
  value,
  secrets = [],
  path = "manifest",
}: Readonly<{
  value: unknown;
  secrets?: ReadonlyArray<string | undefined>;
  path?: string;
}>): void {
  if (typeof value === "string") {
    _assertSafeString({ value, secrets, path });
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  Object.entries(value).forEach(([key, child]) => {
    if (FORBIDDEN_KEYS.test(key)) {
      throw new Error(`Credential field is forbidden at ${path}.${key}`);
    }
    assertSafeManifest({ value: child, secrets, path: `${path}.${key}` });
  });
}
