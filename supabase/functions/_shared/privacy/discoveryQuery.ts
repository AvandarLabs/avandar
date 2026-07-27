/**
 * Backend validation for generated discovery clarification queries.
 *
 * The client mirrors this validator so malformed or write-shaped queries are
 * rejected before they are persisted into a response or executed locally.
 */

/** Maximum length accepted for LLM-generated discovery queries. */
export const MAX_DISCOVERY_QUERY_CHARS = 2000;

const LEADING_KEYWORD_RE = /^\s*(?:with|select)\b/i;

/**
 * Validates an LLM-generated discovery query before it reaches the user.
 * Returns whether the query is shaped like one read-only SELECT or CTE.
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
