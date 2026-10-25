/** Verifies explicit SQL output naming for selected projections. */
import { Model } from "@avandar/models";
import { expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";

it("uses an explicit output alias for an aggregate projection", () => {
  const column = QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: "dc_revenue",
      name: "revenue",
      dataType: "double",
    }) as DatasetColumn.T,
  );
  expect(
    QueryColumn.getDerivedColumnName({
      ...column,
      aggregation: "sum",
      outputAlias: "total",
    }),
  ).toBe("total");
});
