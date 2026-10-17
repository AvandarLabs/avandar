/** Legacy ingress accepts only unique exact or case-insensitive names. */
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { resolveLegacyColumnName } from "$/models/queries/QueryColumnBindings/resolveLegacyColumnName/resolveLegacyColumnName.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
const COLUMNS: QueryResult.BoundColumn[] = [
  { name: "total", dataType: "double", id: uuid<QueryColumn.Id>() },
  { name: "TOTAL", dataType: "double", id: uuid<QueryColumn.Id>() },
];
describe("resolveLegacyColumnName", () => {
  it("prefers a unique exact name before considering case-insensitive candidates", () => {
    expect(resolveLegacyColumnName("total", COLUMNS)).toBe(COLUMNS[0]!.id);
  });
  it("accepts unique case-insensitive legacy names", () => {
    expect(resolveLegacyColumnName("ToTaL", [COLUMNS[0]!])).toBe(
      COLUMNS[0]!.id,
    );
  });
  it("rejects multiple case-insensitive candidates", () => {
    expect(resolveLegacyColumnName("ToTaL", COLUMNS)).toBeUndefined();
  });
  it("rejects duplicate exact matches without choosing the first", () => {
    expect(
      resolveLegacyColumnName("total", [COLUMNS[0]!, COLUMNS[0]!]),
    ).toBeUndefined();
  });
  it("leaves missing targets unresolved", () => {
    expect(resolveLegacyColumnName("profit", COLUMNS)).toBeUndefined();
  });
});
