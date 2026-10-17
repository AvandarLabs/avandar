import { describe, expect, it } from "vitest";
import { hydratePieFromQueryResult } from "$/models/vizs/hydratePieFromQueryResult/hydratePieFromQueryResult.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

function cols(
  pairs: ReadonlyArray<{
    id?: QueryColumn.Id;
    name: string;
    dataType: QueryResult.BoundColumn["dataType"];
  }>,
): QueryResult.BoundColumn[] {
  return pairs.map((p) => {
    return {
      id: p.id ?? (p.name as QueryColumn.Id),
      name: p.name,
      dataType: p.dataType,
    };
  });
}

describe("hydratePieFromQueryResult", () => {
  const empty = { nameKey: undefined, valueKey: undefined };

  it("picks temporal nameKey and numeric valueKey", () => {
    const out = hydratePieFromQueryResult(
      { ...empty },
      cols([
        { id: "month" as QueryColumn.Id, name: "month", dataType: "timestamp" },
        {
          id: "total_cases" as QueryColumn.Id,
          name: "total_cases",
          dataType: "double",
        },
      ]),
    );
    expect(out.nameKey).toBe("month");
    expect(out.valueKey).toBe("total_cases");
  });

  it("prefers text nameKey over numeric fallback", () => {
    const out = hydratePieFromQueryResult(
      { ...empty },
      cols([
        { id: "total" as QueryColumn.Id, name: "total", dataType: "double" },
        { id: "region" as QueryColumn.Id, name: "region", dataType: "varchar" },
      ]),
    );
    expect(out.valueKey).toBe("total");
    expect(out.nameKey).toBe("region");
  });

  it("falls back to a second numeric when no categorical column", () => {
    const out = hydratePieFromQueryResult(
      { ...empty },
      cols([
        { id: "a" as QueryColumn.Id, name: "a", dataType: "bigint" },
        { id: "b" as QueryColumn.Id, name: "b", dataType: "double" },
      ]),
    );
    expect(out.valueKey).toBe("a");
    expect(out.nameKey).toBe("b");
  });

  it("preserves preset keys that still exist in the columns", () => {
    const out = hydratePieFromQueryResult(
      {
        nameKey: "custom_name" as QueryColumn.Id,
        valueKey: "custom_value" as QueryColumn.Id,
      },
      cols([
        { id: "cat" as QueryColumn.Id, name: "cat", dataType: "varchar" },
        { id: "num" as QueryColumn.Id, name: "num", dataType: "double" },
        {
          id: "custom_name" as QueryColumn.Id,
          name: "custom_name",
          dataType: "varchar",
        },
        {
          id: "custom_value" as QueryColumn.Id,
          name: "custom_value",
          dataType: "double",
        },
      ]),
    );
    expect(out.nameKey).toBe("custom_name");
    expect(out.valueKey).toBe("custom_value");
  });

  it("preserves configured IDs that no longer exist in the columns", () => {
    const out = hydratePieFromQueryResult(
      {
        nameKey: "old_name" as QueryColumn.Id,
        valueKey: "old_value" as QueryColumn.Id,
      },
      cols([
        { id: "cat" as QueryColumn.Id, name: "cat", dataType: "varchar" },
        { id: "num" as QueryColumn.Id, name: "num", dataType: "double" },
      ]),
    );
    expect(out.valueKey).toBe("old_value");
    expect(out.nameKey).toBe("old_name");
  });

  it("returns unchanged when columns is empty", () => {
    const cfg = { nameKey: undefined, valueKey: undefined };
    expect(hydratePieFromQueryResult(cfg, [])).toEqual(cfg);
  });

  it("leaves valueKey undefined when there is no numeric column", () => {
    const out = hydratePieFromQueryResult(
      { ...empty },
      cols([
        { id: "label" as QueryColumn.Id, name: "label", dataType: "varchar" },
      ]),
    );
    expect(out.valueKey).toBeUndefined();
  });
});
