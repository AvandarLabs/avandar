/**
 * Identifies "row-data" tool messages: messages that carry actual
 * row-level data values to the LLM rather than schema, status, or
 * error strings.
 *
 * Used (per the chat-interactive-workflows spec) to enforce
 * that any row-data crossing the LLM boundary carries a valid ack token
 * (see `verifyAckToken`).
 *
 * v1 heuristic (English-only, deliberately conservative):
 *   - tool-result messages whose content is a JSON array of length > 0
 *     where each element is an object or primitive → row data
 *   - tool-result messages whose content is a JSON object with an
 *     `errors` / `error` / `status` / `schema` top-level key only,
 *     and no other large field → safe
 *   - anything else with array/object payloads → row data
 *
 * Prefer false positives. The spec is explicit: an over-eager row-data
 * classifier just demands a token; under-eager would let data slip.
 */

export type RowDataInspection = {
  isRowData: boolean;
  reason: string;
};

const KNOWN_SAFE_KEYS = new Set([
  "error",
  "errors",
  "status",
  "schema",
  "ok",
  "message",
  "code",
]);

export function isRowDataMessage(content: string): RowDataInspection {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return { isRowData: false, reason: "not_json_shaped" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { isRowData: false, reason: "unparsable_json" };
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return { isRowData: false, reason: "empty_array" };
    }
    return { isRowData: true, reason: "non_empty_array" };
  }

  if (parsed && typeof parsed === "object") {
    const keys = Object.keys(parsed as Record<string, unknown>);
    if (keys.length === 0) {
      return { isRowData: false, reason: "empty_object" };
    }
    const allSafe = keys.every((k) => {
      return KNOWN_SAFE_KEYS.has(k);
    });
    if (allSafe) {
      return { isRowData: false, reason: "all_keys_known_safe" };
    }
    return { isRowData: true, reason: "object_with_unknown_keys" };
  }

  return { isRowData: false, reason: "primitive" };
}
