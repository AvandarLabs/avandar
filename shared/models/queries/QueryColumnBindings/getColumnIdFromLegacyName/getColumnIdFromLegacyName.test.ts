import { describe, expect, it } from "vitest";
/** Legacy ingress accepts only unique exact or case-insensitive names. */
import { uuid } from "$/lib/uuid.ts";
import { getColumnIdFromLegacyName } from "$/models/queries/QueryColumnBindings/getColumnIdFromLegacyName/getColumnIdFromLegacyName.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
const COLUMNS: QueryResult.BoundColumn[] = [
  { name: "total", dataType: "double", id: uuid<QueryColumn.Id>() },
  { name: "TOTAL", dataType: "double", id: uuid<QueryColumn.Id>() },
];
describe("getColumnIdFromLegacyName", () => {
  it("prefers a unique exact name before considering case-insensitive candidates", () => {
    expect(getColumnIdFromLegacyName({ name: "total", columns: COLUMNS })).toBe(
      COLUMNS[0]!.id,
    );
  });
  it("accepts unique case-insensitive legacy names", () => {
    expect(
      getColumnIdFromLegacyName({ name: "ToTaL", columns: [COLUMNS[0]!] }),
    ).toBe(COLUMNS[0]!.id);
  });
  it("rejects multiple case-insensitive candidates", () => {
    expect(
      getColumnIdFromLegacyName({ name: "ToTaL", columns: COLUMNS }),
    ).toBeUndefined();
  });
  it("rejects duplicate exact matches without choosing the first", () => {
    expect(
      getColumnIdFromLegacyName({
        name: "total",
        columns: [COLUMNS[0]!, COLUMNS[0]!],
      }),
    ).toBeUndefined();
  });
  it("leaves missing targets unresolved", () => {
    expect(
      getColumnIdFromLegacyName({ name: "profit", columns: COLUMNS }),
    ).toBeUndefined();
  });
});
