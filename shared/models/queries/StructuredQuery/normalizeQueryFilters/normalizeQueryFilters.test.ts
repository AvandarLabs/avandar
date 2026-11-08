import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { normalizeQueryFilters } from "$/models/queries/StructuredQuery/normalizeQueryFilters/normalizeQueryFilters.ts";
/** Column-name rules bind only unique names. Runtime rules require IDs. */
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
import type { ColumnNameQueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

function _listFieldColumn(id: string): QueryColumn.T {
  return QueryColumn.makeFromConceptAttributes([
    Model.make("ConceptAttribute", {
      id,
      conceptId: "concept_1",
      workspaceId: "workspace_1",
      name: "Symptoms",
      description: undefined,
      createdAt: "2026-11-06T00:00:00Z",
      updatedAt: "2026-11-06T00:00:00Z",
      dataType: "varchar",
      mappingType: "dataset_column",
      isLabel: false,
      isIdentifier: false,
      allowManualEdit: false,
      isArray: true,
    }) as ConceptAttribute.T,
  ])[0]!;
}

function _column({ id, name }: { id: string; name: string }): QueryColumn.T {
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
const COLUMN_NAME_FILTER: ColumnNameQueryFilterGroup = {
  type: "group",
  id: "group",
  combinator: "OR",
  rules: [
    { type: "rule", id: "rule", columnName: "cnt", operator: ">", value: 5 },
  ],
};
describe("normalizeQueryFilters", () => {
  it("retains node identity and values when binding a unique column name", () => {
    expect(
      normalizeQueryFilters({
        filter: COLUMN_NAME_FILTER,
        columns: [_column({ id: "source", name: "cnt" })],
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
  it("omits an ambiguous column name and reports its rule", () => {
    const result = normalizeQueryFilters({
      filter: COLUMN_NAME_FILTER,
      columns: [
        _column({ id: "one", name: "cnt" }),
        _column({ id: "two", name: "cnt" }),
      ],
      clause: "where",
    });
    expect(result.filter.rules).toEqual([]);
    expect(result.issues).toEqual([{ nodeId: "rule", reason: "ambiguous" }]);
  });
  it("never rebinds an absent ID to an unrelated source with the old name", () => {
    const bound = normalizeQueryFilters({
      filter: COLUMN_NAME_FILTER,
      columns: [_column({ id: "original", name: "cnt" })],
      clause: "where",
    }).filter;
    const result = normalizeQueryFilters({
      filter: bound,
      columns: [_column({ id: "unrelated", name: "cnt" })],
      clause: "where",
    });
    expect(result.filter.rules).toEqual([]);
    expect(result.issues).toEqual([{ nodeId: "rule", reason: "missing" }]);
  });
  it("drops a rule on a list column and reports it as unsupported", () => {
    const listColumn = _listFieldColumn("symptoms");
    const result = normalizeQueryFilters({
      filter: {
        type: "group",
        id: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            id: "rule",
            columnId: listColumn.id,
            columnDataType: "varchar",
            operator: "contains",
            value: "Fever",
          },
        ],
      },
      columns: [listColumn],
      clause: "where",
    });
    expect(result.filter.rules).toEqual([]);
    expect(result.issues).toEqual([{ nodeId: "rule", reason: "unsupported" }]);
  });

  it("keeps a having rule on a list column that is counted", () => {
    const listColumn = {
      ..._listFieldColumn("symptoms"),
      aggregation: "count" as const,
    };
    const rule = {
      type: "rule" as const,
      id: "rule",
      columnId: listColumn.id,
      columnDataType: "bigint" as const,
      operator: ">" as const,
      value: 1,
    };
    const result = normalizeQueryFilters({
      filter: { type: "group", id: "group", combinator: "AND", rules: [rule] },
      columns: [listColumn],
      clause: "having",
    });
    expect(result.filter.rules).toEqual([rule]);
    expect(result.issues).toEqual([]);
  });
});
