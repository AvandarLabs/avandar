/**
 * Validation for "discovery clarification" queries emitted by
 * the LLM. The query is executed locally in DuckDB-WASM (never sent to
 * the LLM), but we still validate it on the backend before persisting it
 * to the response: a malformed or write-shaped query is a bug that
 * should never reach the user, and rejecting it server-side lets us log
 * and shed it cleanly.
 *
 * Mirrored by client tests in
 * `src/components/Privacy/privacy-helpers/discoveryQuery.test.ts`.
 */

export const MAX_DISCOVERY_QUERY_CHARS = 2000;

const LEADING_KEYWORD_RE = /^\s*(?:with|select)\b/i;

/**
 * Returns `true` if the string looks like a read-only DuckDB SELECT or
 * CTE query that's safe to dispatch to the local DuckDB connection.
 *
 *   - Must not be empty.
 *   - Must be at most `MAX_DISCOVERY_QUERY_CHARS` characters.
 *   - Must start with `SELECT` or `WITH` (case-insensitive).
 *   - Must NOT contain a semicolon: keeps it a single statement and
 *     defends against statement-splitting in any client wrapper.
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
