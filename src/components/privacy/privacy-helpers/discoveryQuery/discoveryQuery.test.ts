import { describe, expect, test } from "vitest";
import {
  isReadOnlyDiscoveryQuery,
  MAX_DISCOVERY_QUERY_CHARS,
} from "$/utils/privacy/isReadOnlyDiscoveryQuery";

describe("isReadOnlyDiscoveryQuery", () => {
  test("accepts simple SELECT", () => {
    expect(
      isReadOnlyDiscoveryQuery(
        'SELECT DISTINCT "indicator" FROM "abc" ORDER BY "indicator" LIMIT 100',
      ),
    ).toBe(true);
  });

  test("accepts CTE prefixed with WITH", () => {
    expect(
      isReadOnlyDiscoveryQuery(
        "WITH t AS (SELECT 1 AS x) SELECT * FROM t LIMIT 10",
      ),
    ).toBe(true);
  });

  test("tolerates leading whitespace", () => {
    expect(isReadOnlyDiscoveryQuery("   \n  SELECT 1 LIMIT 1")).toBe(true);
  });

  test("rejects empty string", () => {
    expect(isReadOnlyDiscoveryQuery("")).toBe(false);
  });

  test("rejects DROP", () => {
    expect(isReadOnlyDiscoveryQuery('DROP TABLE "abc"')).toBe(false);
  });

  test("rejects UPDATE", () => {
    expect(isReadOnlyDiscoveryQuery('UPDATE "abc" SET x = 1')).toBe(false);
  });

  test("rejects DELETE", () => {
    expect(isReadOnlyDiscoveryQuery('DELETE FROM "abc"')).toBe(false);
  });

  test("rejects PRAGMA", () => {
    expect(isReadOnlyDiscoveryQuery("PRAGMA version")).toBe(false);
  });

  test("rejects statement with semicolon", () => {
    expect(isReadOnlyDiscoveryQuery("SELECT 1; DROP TABLE x")).toBe(false);
  });

  test("rejects a query longer than the cap", () => {
    const long = `SELECT ${"a,".repeat(MAX_DISCOVERY_QUERY_CHARS)}`;
    expect(isReadOnlyDiscoveryQuery(long)).toBe(false);
  });

  test("rejects non-string input", () => {
    expect(isReadOnlyDiscoveryQuery(123 as unknown as string)).toBe(false);
    expect(isReadOnlyDiscoveryQuery(null as unknown as string)).toBe(false);
  });
});
