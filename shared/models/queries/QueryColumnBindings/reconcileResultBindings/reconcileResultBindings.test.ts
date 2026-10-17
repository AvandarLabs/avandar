/** Saved targets must read the same expression, never an unrelated label. */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type {
  ProjectionDescriptor,
  ResultBindingRegistry,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings.ts";

function _column(name: string): QueryColumn.T {
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: name,
      name,
      dataType: "double",
    }) as DatasetColumn.T,
  );
}
const REVENUE = _column("revenue");
const PROFIT = _column("profit");
const PREVIOUS: ResultBindingRegistry = {
  version: 1,
  scopeKey: "owner",
  sqlKey: "original",
  columns: [
    {
      id: REVENUE.id,
      name: "total",
      dataType: "double",
      expressionKey: "sum-sales-revenue",
      sqlExpressionKey: "sum-sales-revenue",
    },
    {
      id: PROFIT.id,
      name: "profit",
      dataType: "double",
      expressionKey: "sales-profit",
      sqlExpressionKey: "sales-profit",
    },
  ],
};
function _projection(
  outputName: string,
  expressionKey = "sum-sales-revenue",
): ProjectionDescriptor {
  return {
    id: _column(outputName).id,
    identity: "sql",
    outputName,
    expressionKey,
    sqlExpressionKey: expressionKey,
  };
}
function _bind(
  names: string[],
  projections: ProjectionDescriptor[],
  previous = PREVIOUS,
  sqlKey = "edited",
  scopeKey = "owner",
) {
  return reconcileResultBindings({
    scopeKey,
    sqlKey,
    previous,
    projections,
    columns: names.map((name) => {
      return { name, dataType: "double" };
    }),
  });
}

describe("reconcileResultBindings", () => {
  it("keeps a saved revenue target reading amount after alias edits and result reordering", () => {
    const schema = _bind(
      ["profit", "amount"],
      [_projection("amount"), _projection("profit", "sales-profit")],
    );
    const selected = schema.columns.find((column) => {
      return column.id === REVENUE.id;
    });
    expect(selected?.name).toBe("amount");
    expect(
      { amount: 7, profit: 3 }[selected!.name as "amount" | "profit"],
    ).toBe(7);
  });
  it("does not let a different source reuse the saved total target", () => {
    const schema = _bind(
      ["total"],
      [_projection("total", "sum-other-revenue")],
    );
    expect(
      schema.columns.find((column) => {
        return column.id === REVENUE.id;
      }),
    ).toBeUndefined();
  });
  it("omits outputs whose names differ only by case", () => {
    const schema = _bind(["total", "TOTAL"], [_projection("total")]);
    expect(schema.columns).toEqual([]);
    expect(schema.issues).toContainEqual({
      target: "total",
      reason: "ambiguous",
    });
  });
  it("invalidates opaque label identity after SQL changes", () => {
    const schema = _bind(["total"], []);
    expect(
      schema.columns.find((column) => {
        return column.id === REVENUE.id;
      }),
    ).toBeUndefined();
  });
  it("keeps opaque targets through identical-query output reordering", () => {
    const schema = _bind(["profit", "total"], [], PREVIOUS, "original");
    expect(
      schema.columns.map((column) => {
        return column.id;
      }),
    ).toEqual([PROFIT.id, REVENUE.id]);
  });
  it("does not reuse saved targets across owner scopes", () => {
    expect(
      _bind(["total"], [_projection("total")], PREVIOUS, "original", "other")
        .columns[0]?.id,
    ).not.toBe(REVENUE.id);
  });
  it("uses a structured ID even when provisional SQL identity already exists", () => {
    const projection = {
      ..._projection("total"),
      identity: "structured" as const,
    };
    expect(_bind(["total"], [projection]).columns[0]?.id).toBe(projection.id);
  });
  it("keeps registry and column references on identical refetches", () => {
    const schema = _bind(["total", "profit"], [], PREVIOUS, "original");
    expect(schema.registry).toBe(PREVIOUS);
    expect(schema.columns).toBe(PREVIOUS.columns);
  });
  it("pairs repeated expressions only through unique unchanged aliases", () => {
    const previous = {
      ...PREVIOUS,
      columns: [
        PREVIOUS.columns[0]!,
        { ...PREVIOUS.columns[0]!, id: PROFIT.id, name: "second" },
      ],
    };
    const preserved = _bind(
      ["second", "total"],
      [_projection("total"), _projection("second")],
      previous,
    );
    expect(
      preserved.columns.map((column) => {
        return column.id;
      }),
    ).toEqual([PROFIT.id, REVENUE.id]);
    const ambiguous = _bind(
      ["amount", "other"],
      [_projection("amount"), _projection("other")],
      previous,
    );
    expect(ambiguous.columns).toEqual([]);
    expect(ambiguous.issues).toContainEqual({
      target: "amount",
      reason: "ambiguous",
    });
  });
  it("bridges physical SQL keys while retaining known model lineage", () => {
    const previous = {
      ...PREVIOUS,
      columns: [{ ...PREVIOUS.columns[0]!, expressionKey: "model-A" }],
    };
    const schema = _bind(["amount"], [_projection("amount")], previous);
    expect(schema.columns[0]?.id).toBe(REVENUE.id);
    expect(schema.registry.columns[0]?.expressionKey).toBe("model-A");
  });
  it("does not bridge conflicting known model identities", () => {
    const previous = {
      ...PREVIOUS,
      columns: [{ ...PREVIOUS.columns[0]!, expressionKey: "model-A" }],
    };
    const projection = { ..._projection("total"), expressionKey: "model-B" };
    expect(_bind(["total"], [projection], previous).columns[0]?.id).not.toBe(
      REVENUE.id,
    );
  });
});

it("omits an output that cannot be matched to the supplied supported descriptors", () => {
  const schema = _bind(["total"], [_projection("amount")]);
  expect(schema.columns).toEqual([]);
  expect(schema.issues).toContainEqual({
    target: "total",
    reason: "unsupported",
  });
  expect(schema.issues).toContainEqual({ target: "amount", reason: "missing" });
});
it("rejects ambiguous persisted opaque labels instead of inheriting arbitrary lineage", () => {
  const previous = {
    ...PREVIOUS,
    columns: [PREVIOUS.columns[0]!, { ...PREVIOUS.columns[0]!, id: PROFIT.id }],
  };
  const schema = _bind(["total"], [], previous, "original");
  expect(schema.columns).toEqual([]);
  expect(schema.issues).toContainEqual({
    target: "total",
    reason: "ambiguous",
  });
});
