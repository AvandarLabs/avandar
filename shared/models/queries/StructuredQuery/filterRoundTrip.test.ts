import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

/**
 * Every operator the catalog offers must survive a trip through
 * `structuredQueryToSql` and back through `sqlToStructuredQuery`. Without this,
 * adding an operator silently turns SQL mode's "form is an approximation"
 * warning on for queries the form itself produced.
 */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";

import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator.ts";
import { sqlToStructuredQuery } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery.ts";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.ts";

const DATASET_ID = "dataset_round_trip";

const COLUMNS: ReadonlyArray<{ name: string; dataType: AvaDataType.T }> = [
  { name: "label", dataType: "varchar" },
  { name: "total", dataType: "bigint" },
  { name: "seen_on", dataType: "date" },
  { name: "is_active", dataType: "boolean" },
];

/*
 * The fixtures below supply only the fields the SQL round trip reads, so each
 * one needs a single assertion at the boundary: `Model.make` types its result
 * from the props it is given and does not check them against the model
 * registry. The `__type` brand comes from `Model.make` rather than being
 * hand-written.
 */
function _datasetColumn(
  name: string,
  dataType: AvaDataType.T,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: `col_${name}` as DatasetColumn.Id,
    name,
    originalName: name,
    dataType,
    columnIdx: 0,
  }) as DatasetColumn.T;
}

const DATASETS = [
  {
    dataset: Model.make("Dataset", {
      id: DATASET_ID as Dataset.Id,
      name: "round_trip",
    }) as Dataset.T,
    columns: COLUMNS.map((column) => {
      return _datasetColumn(column.name, column.dataType);
    }),
  },
];

function _queryColumn(name: string, dataType: AvaDataType.T): QueryColumn.T {
  return Model.make("QueryColumn", {
    id: `qc_${name}` as QueryColumn.Id,
    baseColumn: _datasetColumn(name, dataType),
    aggregation: undefined,
  }) as QueryColumn.T;
}

function _query(rule: QueryFilterRule): PartialStructuredQuery {
  const queryColumns = COLUMNS.map((column) => {
    return _queryColumn(column.name, column.dataType);
  });
  return Model.make("StructuredQuery", {
    id: "q_round_trip" as StructuredQueryId,
    version: 1 as const,
    dataSource: DATASETS[0]!.dataset,
    queryColumns,
    orderByColumn: undefined,
    orderByDirection: undefined,
    aggregations: Object.fromEntries(
      queryColumns.map((column) => {
        return [column.id, "none"];
      }),
    ),
    filters: { type: "group", combinator: "AND", rules: [rule] },
    having: EMPTY_QUERY_FILTER,
    joins: [],
    offset: undefined,
    limit: undefined,
  }) as PartialStructuredQuery;
}

/**
 * One representative rule per operator. Column types are chosen so the rule is
 * valid for the operator being exercised.
 */
const RULES: Readonly<Record<QueryFilterOperator, QueryFilterRule>> = {
  "=": {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "=",
    value: "a",
  },
  "!=": {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "!=",
    value: "a",
  },
  ">": {
    type: "rule",
    columnName: "total",
    columnDataType: "bigint",
    operator: ">",
    value: 1,
  },
  ">=": {
    type: "rule",
    columnName: "total",
    columnDataType: "bigint",
    operator: ">=",
    value: 1,
  },
  "<": {
    type: "rule",
    columnName: "total",
    columnDataType: "bigint",
    operator: "<",
    value: 1,
  },
  "<=": {
    type: "rule",
    columnName: "total",
    columnDataType: "bigint",
    operator: "<=",
    value: 1,
  },
  contains: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "contains",
    value: "a",
  },
  not_contains: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "not_contains",
    value: "a",
  },
  starts_with: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "starts_with",
    value: "a",
  },
  not_starts_with: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "not_starts_with",
    value: "a",
  },
  ends_with: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "ends_with",
    value: "a",
  },
  not_ends_with: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "not_ends_with",
    value: "a",
  },
  in: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "in",
    value: ["a", "b"],
  },
  not_in: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "not_in",
    value: ["a", "b"],
  },
  between: {
    type: "rule",
    columnName: "total",
    columnDataType: "bigint",
    operator: "between",
    value: [1, 2],
  },
  not_between: {
    type: "rule",
    columnName: "total",
    columnDataType: "bigint",
    operator: "not_between",
    value: [1, 2],
  },
  is_null: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "is_null",
    value: null,
  },
  is_not_null: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "is_not_null",
    value: null,
  },
  is_blank: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "is_blank",
    value: null,
  },
  is_not_blank: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "is_not_blank",
    value: null,
  },
  is_true: {
    type: "rule",
    columnName: "is_active",
    columnDataType: "boolean",
    operator: "is_true",
    value: null,
  },
  is_false: {
    type: "rule",
    columnName: "is_active",
    columnDataType: "boolean",
    operator: "is_false",
    value: null,
  },
  matches_regex: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "matches_regex",
    value: "^a",
  },
  not_matches_regex: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "not_matches_regex",
    value: "^a",
  },
  like: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "like",
    value: "a%",
  },
  not_like: {
    type: "rule",
    columnName: "label",
    columnDataType: "varchar",
    operator: "not_like",
    value: "a%",
  },
};

describe("filter round trip", () => {
  QueryFilterOperator.SPECS.forEach((spec) => {
    it(`round-trips ${spec.operator}`, () => {
      const rule = RULES[spec.operator];
      const sql = structuredQueryToSql(_query(rule));
      const result = sqlToStructuredQuery({ sql, datasets: DATASETS });

      expect(
        result.unmappedReasons.filter((reason) => {
          return reason.code.startsWith("where");
        }),
      ).toEqual([]);

      const parsedFilters = result.query.filters;
      expect(parsedFilters.type).toBe("group");
      expect(parsedFilters.rules).toHaveLength(1);

      const parsed = parsedFilters.rules[0];
      expect(parsed?.type).toBe("rule");
      if (parsed?.type !== "rule") {
        return;
      }
      expect(parsed.operator).toBe(rule.operator);
      expect(parsed.columnName).toBe(rule.columnName);
      expect(parsed.matchCase ?? false).toBe(rule.matchCase ?? false);
      expect(parsed.value).toEqual(rule.value);
    });
  });

  it("round-trips a case-sensitive text rule as matchCase true", () => {
    const rule: QueryFilterRule = {
      type: "rule",
      columnName: "label",
      columnDataType: "varchar",
      operator: "contains",
      value: "a",
      matchCase: true,
    };
    const sql = structuredQueryToSql(_query(rule));
    const result = sqlToStructuredQuery({ sql, datasets: DATASETS });
    const parsed = result.query.filters.rules[0];
    expect(parsed?.type === "rule" && parsed.matchCase).toBe(true);
  });

  it("round-trips a nested OR inside an AND", () => {
    const query = _query(RULES["="]);
    const nested = {
      ...query,
      filters: {
        type: "group" as const,
        combinator: "AND" as const,
        rules: [
          RULES[">"],
          {
            type: "group" as const,
            combinator: "OR" as const,
            rules: [RULES["="], RULES.contains],
          },
        ],
      },
    } as PartialStructuredQuery;
    const sql = structuredQueryToSql(nested);
    const result = sqlToStructuredQuery({ sql, datasets: DATASETS });
    expect(result.query.filters).toEqual(nested.filters);
  });
});
