/** Maximum length accepted for LLM-generated discovery queries. */
export const MAX_DISCOVERY_QUERY_CHARS = 2000;

const LEADING_KEYWORD_REGEX = /^\s*(?:with|select)\b/i;

/**
 * Validates a discovery query before local DuckDB execution or returning it
 * to the client. Discovery queries populate clarification choices from local
 * dataset values, so both runtimes enforce the same single read-only query
 * contract here.
 */
export function isReadOnlyDiscoveryQuery(query: string): boolean {
  if (typeof query !== "string") {
    return false;
  }
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_DISCOVERY_QUERY_CHARS) {
    return false;
  }
  if (!LEADING_KEYWORD_REGEX.test(trimmed)) {
    return false;
  }
  return !trimmed.includes(";");
}
