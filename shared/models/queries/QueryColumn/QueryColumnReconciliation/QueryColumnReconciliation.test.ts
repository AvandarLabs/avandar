/** Verifies stable source identities and unambiguous projection retention. */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { QueryColumnReconciliation } from "$/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.ts";

function _createColumn(name = "revenue"): QueryColumn.T {
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: "dc_revenue",
      name,
      dataType: "double",
    }) as DatasetColumn.T,
  );
}

const _SOURCE_KEY: QueryDataSource.TypedId = {
  __type: "Dataset",
  id: "sales" as Dataset.Id,
};

describe("QueryColumnReconciliation", () => {
  it("retains source IDs across metadata refreshes without projection settings", () => {
    const previous = Object.freeze({
      ..._createColumn(),
      aggregation: "sum" as const,
      outputAlias: "total",
    });
    const incoming = Object.freeze(_createColumn("net_revenue"));
    const columns = QueryColumnReconciliation.reconcileSourceColumns({
      sourceKey: _SOURCE_KEY,
      previousSourceKey: { ..._SOURCE_KEY },
      previous: [previous],
      incoming: [incoming],
    });
    expect(columns).toMatchObject([
      {
        id: previous.id,
        aggregation: undefined,
        baseColumn: { name: "net_revenue" },
      },
    ]);
    expect(columns[0]).not.toHaveProperty("outputAlias");
    expect(previous.aggregation).toBe("sum");
    expect(incoming.id).not.toBe(previous.id);
  });

  it.each([
    { __type: "Dataset", id: "other" },
    { __type: "Concept", id: "sales" },
  ])(
    "does not retain source IDs in a different typed scope: $__type $id",
    (sourceKey) => {
      const previous = _createColumn();
      const incoming = _createColumn();
      expect(
        QueryColumnReconciliation.reconcileSourceColumns({
          sourceKey: sourceKey as QueryDataSource.TypedId,
          previousSourceKey: _SOURCE_KEY,
          previous: [previous],
          incoming: [incoming],
        })[0]?.id,
      ).toBe(incoming.id);
    },
  );

  it("does not guess a projection when multiple previous projections share a source", () => {
    const sum = {
      ..._createColumn(),
      aggregation: "sum" as const,
      outputAlias: "total",
    };
    const average = { ..._createColumn(), aggregation: "avg" as const };
    const incoming = _createColumn();
    expect(
      QueryColumnReconciliation.reconcileSelectedColumns({
        previous: [sum, average],
        incoming: [incoming],
        aggregations: { [sum.id]: "sum", [average.id]: "avg" },
      }),
    ).toEqual({ columns: [incoming], aggregations: { [incoming.id]: "none" } });
  });

  it("refreshes metadata immutably while keeping the authoritative aggregation and alias", () => {
    const previous = Object.freeze({
      ..._createColumn(),
      outputAlias: "total",
    });
    const incoming = Object.freeze(_createColumn("net_revenue"));
    const result = QueryColumnReconciliation.reconcileSelectedColumns({
      previous: [previous],
      incoming: [incoming],
      aggregations: { [previous.id]: "sum" },
    });
    expect(result.columns).toMatchObject([
      {
        id: previous.id,
        outputAlias: "total",
        aggregation: "sum",
        baseColumn: { name: "net_revenue" },
      },
    ]);
    expect(previous.baseColumn.name).toBe("revenue");
    expect(incoming.aggregation).toBeUndefined();
  });

  it("keeps a new explicit projection separate when another projection already selects its source", () => {
    const previous = _createColumn();
    const additional = _createColumn();
    const result = QueryColumnReconciliation.reconcileSelectedColumns({
      previous: [previous],
      incoming: [previous, additional],
      aggregations: { [previous.id]: "sum" },
    });
    expect(
      result.columns.map(({ id, aggregation }) => {
        return { id, aggregation };
      }),
    ).toEqual([
      { id: previous.id, aggregation: "sum" },
      { id: additional.id, aggregation: undefined },
    ]);
  });
});
