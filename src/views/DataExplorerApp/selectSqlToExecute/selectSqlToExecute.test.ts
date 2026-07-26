import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { describe, expect, it } from "vitest";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

const datasetId = "dataset_large" as DatasetId;

function _datasetQuery(): PartialStructuredQuery {
  return {
    ...StructuredQuery.makeEmpty(),
    dataSource: {
      __type: "Dataset",
      id: datasetId,
      name: "Large",
    },
    queryColumns: [
      {
        id: "col_1",
        baseColumn: {
          __type: "DatasetColumn",
          id: "dc_1",
          name: "id",
          dataType: "integer",
          datasetId,
          columnIdx: 0,
        },
        aggregation: "none",
      },
    ],
  } as unknown as PartialStructuredQuery;
}

describe("selectSqlToExecute", () => {
  it("returns rawSQL verbatim when set, ignoring the structured form", () => {
    const executionQuery = {
      ..._datasetQuery(),
      limit: 100,
    } as PartialStructuredQuery;
    const result = selectSqlToExecute({
      rawSQL: 'SELECT COUNT(*) FROM "LONG_global_deaths.csv"',
      isStructuredQueryInSync: true,
      executionQuery,
    });

    expect(result).toBe('SELECT COUNT(*) FROM "LONG_global_deaths.csv"');
  });

  it("returns rawSQL even when isStructuredQueryInSync is false", () => {
    const result = selectSqlToExecute({
      rawSQL: "SELECT 1",
      isStructuredQueryInSync: false,
      executionQuery: _datasetQuery(),
    });

    expect(result).toBe("SELECT 1");
  });

  it("returns SQL generated from the structured form when rawSQL is undefined and form is in sync", () => {
    const result = selectSqlToExecute({
      rawSQL: undefined,
      isStructuredQueryInSync: true,
      executionQuery: _datasetQuery(),
    });

    expect(result).toBeDefined();
    expect(result).toMatch(/select/i);
  });

  it("returns undefined when rawSQL is undefined and the structured form is not in sync", () => {
    const result = selectSqlToExecute({
      rawSQL: undefined,
      isStructuredQueryInSync: false,
      executionQuery: _datasetQuery(),
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined when rawSQL is undefined and dataSource is missing", () => {
    const result = selectSqlToExecute({
      rawSQL: undefined,
      isStructuredQueryInSync: true,
      executionQuery: StructuredQuery.makeEmpty(),
    });

    expect(result).toBeUndefined();
  });
});
