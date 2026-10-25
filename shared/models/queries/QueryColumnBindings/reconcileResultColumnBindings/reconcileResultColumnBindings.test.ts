import { Model } from "@avandar/models";
import { prop, propEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { reconcileResultColumnBindings } from "$/models/queries/QueryColumnBindings/reconcileResultColumnBindings/reconcileResultColumnBindings.ts";
/** Saved targets must read the same expression, never an unrelated label. */
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type {
  ResultColumnBindings,
  ProjectionDescriptor,
  ResultColumnBindingRegistry,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";
type ReconcileColumnBindingsOptions = {
  names: string[];
  projections: ProjectionDescriptor[];
  previous?: ResultColumnBindingRegistry;
  sqlKey?: string;
  scopeKey?: string;
};

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
const PREVIOUS: ResultColumnBindingRegistry = {
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
function _projection({
  outputName,
  expressionKey = "sum-sales-revenue",
}: {
  outputName: string;
  expressionKey?: string;
}): ProjectionDescriptor {
  return {
    id: _column(outputName).id,
    identity: "sql",
    outputName,
    expressionKey,
    sqlExpressionKey: expressionKey,
  };
}
function _reconcileColumnBindings({
  names,
  projections,
  previous = PREVIOUS,
  sqlKey = "edited",
  scopeKey = "owner",
}: ReconcileColumnBindingsOptions): ResultColumnBindings {
  return reconcileResultColumnBindings({
    scopeKey,
    sqlKey,
    previous,
    projections,
    columns: names.map((name) => {
      return { name, dataType: "double" };
    }),
  });
}

describe("reconcileResultColumnBindings", () => {
  it("keeps a saved revenue target reading amount after alias edits and result reordering", () => {
    const schema = _reconcileColumnBindings({
      names: ["profit", "amount"],
      projections: [
        _projection({ outputName: "amount" }),
        _projection({ outputName: "profit", expressionKey: "sales-profit" }),
      ],
    });
    const selected = schema.columns.find(propEq("id", REVENUE.id));
    expect(selected?.name).toBe("amount");
    expect(
      { amount: 7, profit: 3 }[selected!.name as "amount" | "profit"],
    ).toBe(7);
  });
  it("does not let a different source reuse the saved total target", () => {
    const schema = _reconcileColumnBindings({
      names: ["total"],
      projections: [
        _projection({
          outputName: "total",
          expressionKey: "sum-other-revenue",
        }),
      ],
    });
    expect(schema.columns.find(propEq("id", REVENUE.id))).toBeUndefined();
  });
  it("omits outputs whose names differ only by case", () => {
    const schema = _reconcileColumnBindings({
      names: ["total", "TOTAL"],
      projections: [_projection({ outputName: "total" })],
    });
    expect(schema.columns).toEqual([]);
    expect(schema.issues).toContainEqual({
      target: "total",
      reason: "ambiguous",
    });
  });
  it("invalidates opaque label identity after SQL changes", () => {
    const schema = _reconcileColumnBindings({
      names: ["total"],
      projections: [],
    });
    expect(schema.columns.find(propEq("id", REVENUE.id))).toBeUndefined();
  });
  it("keeps opaque targets through identical-query output reordering", () => {
    const schema = _reconcileColumnBindings({
      names: ["profit", "total"],
      projections: [],
      previous: PREVIOUS,
      sqlKey: "original",
    });
    expect(schema.columns.map(prop("id"))).toEqual([PROFIT.id, REVENUE.id]);
  });
  it("does not reuse saved targets across owner scopes", () => {
    expect(
      _reconcileColumnBindings({
        names: ["total"],
        projections: [_projection({ outputName: "total" })],
        previous: PREVIOUS,
        sqlKey: "original",
        scopeKey: "other",
      }).columns[0]?.id,
    ).not.toBe(REVENUE.id);
  });
  it("uses a structured ID even when provisional SQL identity already exists", () => {
    const projection = {
      ..._projection({ outputName: "total" }),
      identity: "structured" as const,
    };
    expect(
      _reconcileColumnBindings({ names: ["total"], projections: [projection] })
        .columns[0]?.id,
    ).toBe(projection.id);
  });
  it("keeps registry and column references on identical refetches", () => {
    const schema = _reconcileColumnBindings({
      names: ["total", "profit"],
      projections: [],
      previous: PREVIOUS,
      sqlKey: "original",
    });
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
    const preserved = _reconcileColumnBindings({
      names: ["second", "total"],
      projections: [
        _projection({ outputName: "total" }),
        _projection({ outputName: "second" }),
      ],
      previous: previous,
    });
    expect(preserved.columns.map(prop("id"))).toEqual([PROFIT.id, REVENUE.id]);
    const ambiguous = _reconcileColumnBindings({
      names: ["amount", "other"],
      projections: [
        _projection({ outputName: "amount" }),
        _projection({ outputName: "other" }),
      ],
      previous: previous,
    });
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
    const schema = _reconcileColumnBindings({
      names: ["amount"],
      projections: [_projection({ outputName: "amount" })],
      previous: previous,
    });
    expect(schema.columns[0]?.id).toBe(REVENUE.id);
    expect(schema.registry.columns[0]?.expressionKey).toBe("model-A");
  });
  it("does not bridge conflicting known model identities", () => {
    const previous = {
      ...PREVIOUS,
      columns: [{ ...PREVIOUS.columns[0]!, expressionKey: "model-A" }],
    };
    const projection = {
      ..._projection({ outputName: "total" }),
      expressionKey: "model-B",
    };
    expect(
      _reconcileColumnBindings({
        names: ["total"],
        projections: [projection],
        previous: previous,
      }).columns[0]?.id,
    ).not.toBe(REVENUE.id);
  });
});

it("omits an output that cannot be matched to the supplied supported descriptors", () => {
  const schema = _reconcileColumnBindings({
    names: ["total"],
    projections: [_projection({ outputName: "amount" })],
  });
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
  const schema = _reconcileColumnBindings({
    names: ["total"],
    projections: [],
    previous: previous,
    sqlKey: "original",
  });
  expect(schema.columns).toEqual([]);
  expect(schema.issues).toContainEqual({
    target: "total",
    reason: "ambiguous",
  });
});
