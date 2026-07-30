/** Maximum length accepted for LLM-generated discovery queries. */
export const MAX_DISCOVERY_QUERY_CHARS = 2000;

const LEADING_KEYWORD_RE = /^\s*(?:with|select)\b/i;

/**
 * Validates an LLM-generated discovery query before local DuckDB execution, so
 * generated clarification queries fail fast instead of making the user wait on
 * DuckDB. Mirrors the backend validator so both sides enforce the same
 * contract. Returns whether the query is shaped like one read-only SELECT or
 * CTE.
 */
export function isReadOnlyDiscoveryQuery(q: string): boolean {
  if (typeof q !== "string") {
    return false;
  }
  const trimmed = q.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_DISCOVERY_QUERY_CHARS) {
    return false;
  }
  if (!LEADING_KEYWORD_RE.test(trimmed)) {
    return false;
  }
  if (trimmed.includes(";")) {
    return false;
  }
  return true;
}
