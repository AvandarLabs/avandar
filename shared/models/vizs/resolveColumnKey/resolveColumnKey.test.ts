import { describe, expect, it } from "vitest";
import { resolveColumnKey } from "$/models/vizs/resolveColumnKey/resolveColumnKey.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";

const columns: readonly QueryResultColumn[] = [
  { name: "count", dataType: "bigint" } as QueryResultColumn,
  { name: "Region", dataType: "varchar" } as QueryResultColumn,
];

describe("resolveColumnKey", () => {
  it("returns the same key on exact match", () => {
    expect(resolveColumnKey("count", columns)).toBe("count");
  });

  it("returns the canonical name on case-insensitive match", () => {
    expect(resolveColumnKey("COUNT", columns)).toBe("count");
    expect(resolveColumnKey("region", columns)).toBe("Region");
  });

  it("returns undefined when there is no match", () => {
    expect(resolveColumnKey("total", columns)).toBeUndefined();
  });

  it("returns undefined for an undefined key", () => {
    expect(resolveColumnKey(undefined, columns)).toBeUndefined();
  });

  it("returns undefined when columns is empty", () => {
    expect(resolveColumnKey("count", [])).toBeUndefined();
  });
});
