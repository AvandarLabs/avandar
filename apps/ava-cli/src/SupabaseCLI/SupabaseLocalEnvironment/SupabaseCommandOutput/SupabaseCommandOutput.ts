const SENSITIVE_FIELD_NAMES = new Set([
  "PUBLISHABLE_KEY",
  "SECRET_KEY",
  "JWT_SECRET",
  "ANON_KEY",
  "SERVICE_ROLE_KEY",
  "S3_PROTOCOL_ACCESS_KEY_ID",
  "S3_PROTOCOL_ACCESS_KEY_SECRET",
]);

const HUMAN_READABLE_SECRET_PATTERN =
  /^(\s*(?:publishable[ _]key|secret[ _]key|jwt[ _]secret|anon[ _]key|service_role[ _]key|s3[ _]access[ _]key|s3[ _]secret[ _]key)\s*(?:│|:|=)\s*)\S.*$/i;

function _redactJsonSecrets(line: string): string | undefined {
  try {
    const parsedValue: unknown = JSON.parse(line);
    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return undefined;
    }
    const parsedEntries = Object.entries(parsedValue);
    const hasSensitiveField = parsedEntries.some(([key]) => {
      return SENSITIVE_FIELD_NAMES.has(key);
    });
    if (!hasSensitiveField) {
      return line;
    }
    const redactedEntries = parsedEntries.map(([key, value]) => {
      return [key, SENSITIVE_FIELD_NAMES.has(key) ? "[redacted]" : value];
    });
    return JSON.stringify(Object.fromEntries(redactedEntries));
  } catch {
    return undefined;
  }
}

function _redactSecretsFromLine(line: string): string {
  const redactedJson = _redactJsonSecrets(line);
  if (redactedJson !== undefined) {
    return redactedJson;
  }
  return line.replace(HUMAN_READABLE_SECRET_PATTERN, "$1[redacted]");
}

/** Removes generated credentials while preserving Supabase startup output. */
export const SupabaseCommandOutput = {
  /** Redacts credential values from one complete output line. */
  redactSecretsFromLine: _redactSecretsFromLine,
};
