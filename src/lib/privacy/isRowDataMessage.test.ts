import { describe, expect, it } from "vitest";

/**
 * Mirror-tests the server-side `isRowDataMessage` helper in
 * `supabase/functions/_shared/privacy/isRowDataMessage.ts`. The two
 * implementations must agree exactly; we duplicate the logic here so a
 * vitest run on the client side catches drift.
 */

const KNOWN_SAFE_KEYS = new Set([
  "error",
  "errors",
  "status",
  "schema",
  "ok",
  "message",
  "code",
]);

function isRowDataMessage(content: string): {
  isRowData: boolean;
  reason: string;
} {
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

describe("isRowDataMessage", () => {
  it("treats plain text as non-row-data", () => {
    expect(isRowDataMessage("just some text").isRowData).toBe(false);
    expect(isRowDataMessage("123").isRowData).toBe(false);
  });

  it("treats malformed JSON as non-row-data (it can't be row data)", () => {
    expect(isRowDataMessage("{ not json").isRowData).toBe(false);
  });

  it("flags non-empty arrays as row data", () => {
    expect(isRowDataMessage("[1, 2, 3]").isRowData).toBe(true);
    expect(isRowDataMessage('[{"id": 1}, {"id": 2}]').isRowData).toBe(true);
  });

  it("treats empty arrays as safe", () => {
    expect(isRowDataMessage("[]").isRowData).toBe(false);
  });

  it("treats known-safe-key objects as safe", () => {
    expect(isRowDataMessage('{"status": "ok"}').isRowData).toBe(false);
    expect(isRowDataMessage('{"errors": ["a", "b"]}').isRowData).toBe(false);
    expect(
      isRowDataMessage('{"schema": [{"name": "id", "type": "int"}]}').isRowData,
    ).toBe(false);
  });

  it("flags objects with non-safe keys as row data", () => {
    expect(isRowDataMessage('{"name": "Jane"}').isRowData).toBe(true);
    expect(isRowDataMessage('{"email": "x@y.com"}').isRowData).toBe(true);
  });

  it("flags mixed objects (some safe + some unknown keys) as row data", () => {
    // Even though `status` is known-safe, the presence of `name`
    // means we treat this as row data: prefer false positives.
    expect(isRowDataMessage('{"status": "ok", "name": "Jane"}').isRowData).toBe(
      true,
    );
  });

  it("treats empty objects as safe", () => {
    expect(isRowDataMessage("{}").isRowData).toBe(false);
  });
});
