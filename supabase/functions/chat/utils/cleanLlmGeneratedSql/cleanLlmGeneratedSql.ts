/**
 * Strip markdown fencing and stray prefixes that LLMs sometimes wrap around
 * generated SQL.
 */
export function cleanLlmGeneratedSql(raw: string): string {
  return raw
    .replace(/^\n?/i, "")
    .replace(/^```\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim()
    .replace(/^sql\s+/i, "");
}
