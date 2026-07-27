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

/**
 * Identifies whether tool-message content carries row-level data values.
 * Returns the row-data decision and the reason for that classification.
 */
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
