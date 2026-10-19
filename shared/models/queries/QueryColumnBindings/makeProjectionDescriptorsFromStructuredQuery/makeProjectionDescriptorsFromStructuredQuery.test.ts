import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql.ts";
import { makeProjectionDescriptorsFromStructuredQuery } from "$/models/queries/QueryColumnBindings/makeProjectionDescriptorsFromStructuredQuery/makeProjectionDescriptorsFromStructuredQuery.ts";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
/** Structured identity follows selected IDs and the aggregation map. */
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";

const COLUMN: QueryColumn.T = {
  ...QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: "revenue-id",
      name: "revenue",
      dataType: "double",
    }) as DatasetColumn.T,
  ),
  outputAlias: "total",
  aggregation: "avg" as const,
};
function _query(): StructuredQuery.Partial {
  return {
    ...StructuredQuery.makeEmpty(),
    dataSource: Model.make("Dataset", {
      id: "sales",
      name: "Sales",
    }) as Dataset.T,
    queryColumns: [COLUMN],
    aggregations: { [COLUMN.id]: "sum" },
  };
}
describe("makeProjectionDescriptorsFromStructuredQuery", () => {
  it("uses the selected ID and authoritative aggregation instead of stale wrapper settings", () => {
    const descriptor =
      makeProjectionDescriptorsFromStructuredQuery(_query())[0];
    const sql = makeProjectionDescriptorsFromSql({
      sql: "SELECT SUM(revenue) AS amount FROM sales",
      columns: [{ name: "amount", dataType: "double" }],
    })[0];
    expect(descriptor).toMatchObject({
      id: COLUMN.id,
      identity: "structured",
      outputName: "total",
    });
    expect(descriptor?.sqlExpressionKey).toBe(sql?.expressionKey);
    expect(descriptor?.expressionKey).not.toBe(descriptor?.sqlExpressionKey);
  });
  it("keeps model lineage through metadata renames but invalidates replacement source IDs", () => {
    const query = _query();
    const original = makeProjectionDescriptorsFromStructuredQuery(query)[0];
    const renamed = makeProjectionDescriptorsFromStructuredQuery({
      ...query,
      queryColumns: [
        { ...COLUMN, baseColumn: { ...COLUMN.baseColumn, name: "new_name" } },
      ],
    })[0];
    expect(original).toBeDefined();
    expect(renamed?.expressionKey).toBe(original?.expressionKey);
    expect(renamed?.sqlExpressionKey).not.toBe(original?.sqlExpressionKey);
    const replaced = makeProjectionDescriptorsFromStructuredQuery({
      ...query,
      dataSource: Model.make("Dataset", {
        id: "other",
        name: "Sales",
      }) as Dataset.T,
    })[0];
    expect(replaced?.expressionKey).not.toBe(original?.expressionKey);
  });
  it("normalizes group-by and plain columns to the same supported expression", () => {
    const query = _query();
    const plain = makeProjectionDescriptorsFromStructuredQuery({
      ...query,
      aggregations: { [COLUMN.id]: "none" },
    });
    const grouped = makeProjectionDescriptorsFromStructuredQuery({
      ...query,
      aggregations: { [COLUMN.id]: "group_by" },
    });
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.expressionKey).toBe(plain[0]?.expressionKey);
  });
  it("does not infer source lineage for an incomplete query", () => {
    expect(
      makeProjectionDescriptorsFromStructuredQuery({
        ..._query(),
        dataSource: undefined,
      }),
    ).toEqual([]);
  });
});
