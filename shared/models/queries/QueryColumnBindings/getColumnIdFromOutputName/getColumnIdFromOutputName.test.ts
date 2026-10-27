import { describe, expect, it } from "vitest";
/** Output names bind only when one exact or case-insensitive match exists. */
import { uuid } from "$/lib/uuid.ts";
import { getColumnIdFromOutputName } from "$/models/queries/QueryColumnBindings/getColumnIdFromOutputName/getColumnIdFromOutputName.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

const COLUMNS: QueryResult.ColumnWithId[] = [
  { name: "total", dataType: "double", id: uuid<QueryColumn.Id>() },
  { name: "TOTAL", dataType: "double", id: uuid<QueryColumn.Id>() },
];
describe("getColumnIdFromOutputName", () => {
  it("prefers a unique exact name before considering case-insensitive candidates", () => {
    expect(getColumnIdFromOutputName({ name: "total", columns: COLUMNS })).toBe(
      COLUMNS[0]!.id,
    );
  });
  it("accepts unique case-insensitive output names", () => {
    expect(
      getColumnIdFromOutputName({ name: "ToTaL", columns: [COLUMNS[0]!] }),
    ).toBe(COLUMNS[0]!.id);
  });
  it("rejects multiple case-insensitive candidates", () => {
    expect(
      getColumnIdFromOutputName({ name: "ToTaL", columns: COLUMNS }),
    ).toBeUndefined();
  });
  it("rejects duplicate exact matches without choosing the first", () => {
    expect(
      getColumnIdFromOutputName({
        name: "total",
        columns: [COLUMNS[0]!, COLUMNS[0]!],
      }),
    ).toBeUndefined();
  });
  it("leaves missing targets unresolved", () => {
    expect(
      getColumnIdFromOutputName({ name: "profit", columns: COLUMNS }),
    ).toBeUndefined();
  });
});
