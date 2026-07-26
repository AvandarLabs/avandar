/**
 * Client-side mirror of the backend's `discoveryQuery.ts`. Both files
 * implement the exact same validator so the two ends agree on what a
 * "discovery clarification" query is allowed to look like.
 *
 * The discovery query runs in the user's local DuckDB-WASM, so even a
 * relaxed validator wouldn't leak data to the LLM. But:
 *
 *   1. We want a single source of truth for the contract.
 *   2. We don't want a hostile or malformed query to wedge a worker.
 *   3. Validating client-side lets us fail fast before the user
 *      sees a loading spinner that never resolves.
 *
 * The two files agree by convention (no shared package) — there's a
 * roundtrip test pinning them together.
 */

export const MAX_DISCOVERY_QUERY_CHARS = 2000;

const LEADING_KEYWORD_RE = /^\s*(?:with|select)\b/i;

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
