import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

import { describe, expect, it } from "vitest";

import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";

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
  it("returns rawSql verbatim when set, ignoring the structured form", () => {
    const executionQuery = {
      ..._datasetQuery(),
      limit: 100,
    } as PartialStructuredQuery;
    const result = selectSqlToExecute({
      rawSql: 'SELECT COUNT(*) FROM "LONG_global_deaths.csv"',
      isStructuredQueryInSync: true,
      executionQuery,
    });

    expect(result).toBe('SELECT COUNT(*) FROM "LONG_global_deaths.csv"');
  });

  it("returns rawSql even when isStructuredQueryInSync is false", () => {
    const result = selectSqlToExecute({
      rawSql: "SELECT 1",
      isStructuredQueryInSync: false,
      executionQuery: _datasetQuery(),
    });

    expect(result).toBe("SELECT 1");
  });

  it("returns SQL generated from the structured form when rawSql is undefined and form is in sync", () => {
    const result = selectSqlToExecute({
      rawSql: undefined,
      isStructuredQueryInSync: true,
      executionQuery: _datasetQuery(),
    });

    expect(result).toBeDefined();
    expect(result).toMatch(/select/i);
  });

  it("returns undefined when rawSql is undefined and the structured form is not in sync", () => {
    const result = selectSqlToExecute({
      rawSql: undefined,
      isStructuredQueryInSync: false,
      executionQuery: _datasetQuery(),
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined when rawSql is undefined and dataSource is missing", () => {
    const result = selectSqlToExecute({
      rawSql: undefined,
      isStructuredQueryInSync: true,
      executionQuery: StructuredQuery.makeEmpty(),
    });

    expect(result).toBeUndefined();
  });
});
