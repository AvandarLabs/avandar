import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeColumnBindingsFromDashboardFilters } from "./makeColumnBindingsFromDashboardFilters";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DashboardFilterRecord } from "../DashboardFilterStateManager";
import type { DashboardFilterTargets } from "./makeColumnBindingsFromDashboardFilters";

const COLUMN: QueryResult.ColumnWithId = {
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
    kind: "columnId" as const,
    columnId: COLUMN.id,
    authoringColumnName: "region",
  },
};
describe("makeColumnBindingsFromDashboardFilters", () => {
  it("keeps the ID when only the query alias, label, or viewer value changes", () => {
    const result = makeColumnBindingsFromDashboardFilters({
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
    const result = makeColumnBindingsFromDashboardFilters({
      filters: [{ ...FILTER, columnName: "category" }],
      targets: BOUND,
      columns: [COLUMN, replacement],
    });
    expect(result.targets.global).toEqual({
      kind: "columnId",
      columnId: replacement.id,
      authoringColumnName: "category",
    });
  });
  it("omits a missing bound ID even when another output has the authoring name", () => {
    const result = makeColumnBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: BOUND,
      columns: [{ ...COLUMN, id: uuid<QueryColumn.Id>(), name: "region" }],
    });
    expect(result.resolvedFilters).toEqual([]);
    expect(result.issues).toEqual([{ target: "global", reason: "missing" }]);
    expect(result.targets).toEqual(BOUND);
  });
  it("does not retry unresolved names during result refetches", () => {
    const first = makeColumnBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: {},
      columns: [],
    });
    expect(first.targets.global).toEqual({
      kind: "unresolved",
      columnName: "region",
      reason: "missing",
    });
    const refetch = makeColumnBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: first.targets,
      columns: [{ ...COLUMN, name: "region" }],
    });
    expect(refetch.resolvedFilters).toEqual([]);
    expect(refetch.issues).toEqual([{ target: "global", reason: "missing" }]);
    const reset = makeColumnBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: { global: { kind: "columnName", columnName: "region" } },
      columns: [{ ...COLUMN, name: "region" }],
    });
    expect(reset.resolvedFilters).toEqual([FILTER]);
  });
  it("reports ambiguous name matches without selecting the first", () => {
    const result = makeColumnBindingsFromDashboardFilters({
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
  it("binds a unique case-insensitive column name", () => {
    const result = makeColumnBindingsFromDashboardFilters({
      filters: [FILTER],
      targets: {},
      columns: [{ ...COLUMN, name: "REGION" }],
    });
    expect(result.resolvedFilters).toEqual([
      { ...FILTER, columnName: "REGION" },
    ]);
  });
});
