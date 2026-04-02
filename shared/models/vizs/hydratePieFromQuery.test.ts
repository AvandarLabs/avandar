import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import { hydratePieFromQuery } from "$/models/vizs/hydratePieFromQuery.ts";
import { describe, expect, it } from "vitest";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { PieChartVizConfig } from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types.ts";

function makePieConfig(
  overrides: Partial<PieChartVizConfig> = {},
): PieChartVizConfig {
  return {
    vizType: "pie",
    nameKey: undefined,
    valueKey: undefined,
    isDonut: false,
    withLabels: false,
    labelsType: "value",
    ...overrides,
  };
}

function makeCol(name: string, dataType: DatasetColumn.T["dataType"]) {
  return QueryColumn.makeFromDatasetColumn({
    id: name as DatasetColumn.T["id"],
    name,
    dataType,
    columnIdx: 0,
  } as DatasetColumn.T);
}

function makeQuery(
  columns: ReadonlyArray<ReturnType<typeof makeCol>>,
): ReturnType<typeof StructuredQuery.makeEmpty> {
  return {
    ...StructuredQuery.makeEmpty(),
    queryColumns: columns,
  };
}

describe("hydratePieFromQuery", () => {
  it("picks first non-numeric as nameKey and first numeric as valueKey", () => {
    const out = hydratePieFromQuery(
      makePieConfig(),
      makeQuery([makeCol("category", "varchar"), makeCol("amount", "double")]),
    );
    expect(out.nameKey).toBe("category");
    expect(out.valueKey).toBe("amount");
  });

  it("falls back to a second numeric nameKey when no non-numeric column", () => {
    const out = hydratePieFromQuery(
      makePieConfig(),
      makeQuery([makeCol("x", "bigint"), makeCol("y", "double")]),
    );
    expect(out.valueKey).toBe("x");
    expect(out.nameKey).toBe("y");
  });

  it("clears nameKey when the column no longer exists in the query", () => {
    const out = hydratePieFromQuery(
      makePieConfig({ nameKey: "stale_col" }),
      makeQuery([makeCol("category", "varchar"), makeCol("total", "double")]),
    );
    expect(out.nameKey).toBe("category");
  });

  it("does not overwrite already valid keys", () => {
    const out = hydratePieFromQuery(
      makePieConfig({ nameKey: "category", valueKey: "total" }),
      makeQuery([makeCol("category", "varchar"), makeCol("total", "double")]),
    );
    expect(out.nameKey).toBe("category");
    expect(out.valueKey).toBe("total");
  });

  it("returns unchanged when the query has no columns", () => {
    const cfg = makePieConfig();
    expect(hydratePieFromQuery(cfg, makeQuery([]))).toEqual(cfg);
  });
});
