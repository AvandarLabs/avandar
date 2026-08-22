import { describe, expect, it } from "vitest";

import {
  EXCLUDED_TABLES,
  isExcluded,
  isSyncable,
  SYNCABLE_TABLES,
} from "./syncable-tables";

describe("syncable-tables manifest", () => {
  it("SYNCABLE_TABLES contains no duplicates", () => {
    expect(new Set(SYNCABLE_TABLES).size).toBe(SYNCABLE_TABLES.length);
  });

  it("EXCLUDED_TABLES contains no duplicates", () => {
    expect(new Set(EXCLUDED_TABLES).size).toBe(EXCLUDED_TABLES.length);
  });

  it("no table appears in both SYNCABLE_TABLES and EXCLUDED_TABLES", () => {
    const overlap = SYNCABLE_TABLES.filter((t) => {
      return (EXCLUDED_TABLES as readonly string[]).includes(t);
    });
    expect(overlap).toEqual([]);
  });

  it("table names use snake_case (no spaces, no mixed case)", () => {
    const namePattern = /^[a-z][a-z0-9_]*$/;
    [...SYNCABLE_TABLES, ...EXCLUDED_TABLES].forEach((tableName) => {
      expect(tableName).toMatch(namePattern);
    });
  });

  it("isSyncable reflects membership in SYNCABLE_TABLES", () => {
    expect(isSyncable(SYNCABLE_TABLES[0]!)).toBe(true);
    expect(isSyncable("definitely_not_a_real_table_xyz")).toBe(false);
  });

  it("isExcluded reflects membership in EXCLUDED_TABLES", () => {
    expect(isExcluded(EXCLUDED_TABLES[0]!)).toBe(true);
    expect(isExcluded("definitely_not_a_real_table_xyz")).toBe(false);
  });

  it("excludes usage analytics events from the desktop mirror", () => {
    expect(isExcluded("usage_analytics_events")).toBe(true);
    expect(isSyncable("usage_analytics_events")).toBe(false);
  });

  it("isSyncable returns false for excluded tables", () => {
    EXCLUDED_TABLES.forEach((tableName) => {
      expect(isSyncable(tableName)).toBe(false);
    });
  });
});
