import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeBindingsFromDashboardFilters } from "./makeBindingsFromDashboardFilters";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DashboardFilterRecord } from "../DashboardFilterStateManager";
import type { DashboardFilterTargets } from "./makeBindingsFromDashboardFilters";
const COLUMN: QueryResult.BoundColumn = {
  id: uuid<QueryColumn.Id>(),
  name: "territory",
  dataType: "varchar",
};
const FILTER: DashboardFilterRecord = {
  filterId: "global",
  columnName: "region",
  label: "Region",
  operator: "equals",
  value: "North",
};
const BOUND: DashboardFilterTargets = {
  global: {
    kind: "bound" as const,
    columnId: COLUMN.id,
    authoringColumnName: "region",
  },
};
describe("makeBindingsFromDashboardFilters", () => {
  it("keeps the ID when only the query alias, label, or viewer value changes", () => {
    const result = makeBindingsFromDashboardFilters({
      filters: [{ ...FILTER, label: "Area", value: "South" }],
      targets: BOUND,
      columns: [COLUMN],
    });
    expect(result.resolvedFilters).toEqual([
      { ...FILTER, label: "Area", value: "South", columnName: "territory" },
    ]);
    expect(result.targets).toEqual(BOUND);
  });
  it("rebinds only an explicit definition target edit", () => {
    const replacement = {
      ...COLUMN,
      id: uuid<QueryColumn.Id>(),
      name: "category",
    };
    const result = makeBindingsFromDashboardFilters({
      filters: [{ ...FILTER, columnName: "category" }],
      targets: BOUND,
      columns: [COLUMN, replacement],
    });
    expect(result.targets.global).toEqual({
      kind: "bound",
      columnId: replacement.id,
      authoringColumnName: "category",
    });
  });
  it("omits a missing bound ID even when another output has the authoring name", () => {
    const result = makeBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: BOUND,
      columns: [{ ...COLUMN, id: uuid<QueryColumn.Id>(), name: "region" }],
    });
    expect(result.resolvedFilters).toEqual([]);
    expect(result.issues).toEqual([{ target: "global", reason: "missing" }]);
    expect(result.targets).toEqual(BOUND);
  });
  it("does not retry unresolved names during result refetches", () => {
    const first = makeBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: {},
      columns: [],
    });
    expect(first.targets.global).toEqual({
      kind: "unresolved",
      columnName: "region",
      reason: "missing",
    });
    const refetch = makeBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: first.targets,
      columns: [{ ...COLUMN, name: "region" }],
    });
    expect(refetch.resolvedFilters).toEqual([]);
    expect(refetch.issues).toEqual([{ target: "global", reason: "missing" }]);
    const reset = makeBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: { global: { kind: "legacy", columnName: "region" } },
      columns: [{ ...COLUMN, name: "region" }],
    });
    expect(reset.resolvedFilters).toEqual([FILTER]);
  });
  it("reports ambiguous legacy matches without selecting the first", () => {
    const result = makeBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: {},
      columns: [
        { ...COLUMN, name: "REGION" },
        { ...COLUMN, id: uuid<QueryColumn.Id>(), name: "Region" },
      ],
    });
    expect(result.resolvedFilters).toEqual([]);
    expect(result.issues).toEqual([{ target: "global", reason: "ambiguous" }]);
  });
  it("binds a unique case-insensitive legacy name", () => {
    const result = makeBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: {},
      columns: [{ ...COLUMN, name: "REGION" }],
    });
    expect(result.resolvedFilters).toEqual([
      { ...FILTER, columnName: "REGION" },
    ]);
  });
});
