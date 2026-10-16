/** Legacy ingress binds only unique names, while runtime rules require IDs. */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { normalizeQueryFilters } from "$/models/queries/StructuredQuery/normalizeQueryFilters/normalizeQueryFilters.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { LegacyQueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

function _column(id: string, name: string): QueryColumn.T {
  return Model.make("QueryColumn", {
    id: id as QueryColumn.Id,
    baseColumn: Model.make("DatasetColumn", {
      id: `base_${id}`,
      name,
      dataType: "bigint",
    }) as DatasetColumn.T,
    aggregation: undefined,
  });
}
const LEGACY_FILTER: LegacyQueryFilterGroup = {
  type: "group",
  id: "group",
  combinator: "OR",
  rules: [
    { type: "rule", id: "rule", columnName: "cnt", operator: ">", value: 5 },
  ],
};
describe("normalizeQueryFilters", () => {
  it("retains node identity and values when binding a unique legacy name", () => {
    expect(
      normalizeQueryFilters({
        filter: LEGACY_FILTER,
        columns: [_column("source", "cnt")],
        clause: "where",
      }),
    ).toEqual({
      filter: {
        type: "group",
        id: "group",
        combinator: "OR",
        rules: [
          {
            type: "rule",
            id: "rule",
            columnId: "source",
            columnDataType: "bigint",
            operator: ">",
            value: 5,
          },
        ],
      },
      issues: [],
    });
  });
  it("omits an ambiguous legacy name and reports its rule", () => {
    const result = normalizeQueryFilters({
      filter: LEGACY_FILTER,
      columns: [_column("one", "cnt"), _column("two", "cnt")],
      clause: "where",
    });
    expect(result.filter.rules).toEqual([]);
    expect(result.issues).toEqual([{ nodeId: "rule", reason: "ambiguous" }]);
  });
  it("never rebinds an absent ID to an unrelated source with the old name", () => {
    const bound = normalizeQueryFilters({
      filter: LEGACY_FILTER,
      columns: [_column("original", "cnt")],
      clause: "where",
    }).filter;
    const result = normalizeQueryFilters({
      filter: bound,
      columns: [_column("unrelated", "cnt")],
      clause: "where",
    });
    expect(result.filter.rules).toEqual([]);
    expect(result.issues).toEqual([{ nodeId: "rule", reason: "missing" }]);
  });
});
