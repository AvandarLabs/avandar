import { Model } from "@models/Model/Model.ts";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { structuredQueryToSQL } from "$/models/queries/StructuredQuery/structuredQueryToSQL.ts";
import { describe, expect, it } from "vitest";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

function _makeDataset(): DatasetModel["Read"] {
  return Model.make("Dataset", {
    id: "users_table",
    name: "users",
  }) as unknown as DatasetModel["Read"];
}

function _makeColumn(name: string, dataType = "varchar"): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: `qc_${name}` as QueryColumnId,
    baseColumn: Model.make("DatasetColumn", {
      id: `dc_${name}`,
      name,
      originalName: name,
      dataType,
      columnIdx: 0,
    }),
    aggregation: undefined,
  }) as unknown as QueryColumnRead;
}

function _makeQuery(
  filters: QueryFilterGroup = EMPTY_QUERY_FILTER,
): PartialStructuredQuery {
  const nameColumn = _makeColumn("name");
  const ageColumn = _makeColumn("age", "integer");
  return Model.make("StructuredQuery", {
    id: "q1" as StructuredQueryId,
    version: 1 as const,
    dataSource: _makeDataset(),
    queryColumns: [nameColumn, ageColumn],
    orderByColumn: undefined,
    orderByDirection: undefined,
    aggregations: {
      [nameColumn.id]: "none",
      [ageColumn.id]: "none",
    },
    filters,
    offset: undefined,
    limit: undefined,
  }) as PartialStructuredQuery;
}

describe("structuredQueryToSQL", () => {
  it("emits a basic SELECT statement when filters are empty", () => {
    const sql = structuredQueryToSQL(_makeQuery());
    expect(sql).toContain("select");
    expect(sql).toContain('"name"');
    expect(sql).toContain('"age"');
    expect(sql).toContain('from "users_table"');
    expect(sql.toLowerCase()).not.toContain("where");
  });

  it("renders a simple equality filter", () => {
    const sql = structuredQueryToSQL(
      _makeQuery({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "age",
            operator: ">",
            value: 30,
          },
        ],
      }),
    );
    expect(sql).toMatch(/where .*"age".* > 30/i);
  });

  it("renders nested AND/OR groups with parentheses", () => {
    const sql = structuredQueryToSQL(
      _makeQuery({
        type: "group",
        combinator: "OR",
        rules: [
          {
            type: "group",
            combinator: "AND",
            rules: [
              {
                type: "rule",
                columnName: "age",
                operator: ">",
                value: 30,
              },
              {
                type: "rule",
                columnName: "name",
                operator: "=",
                value: "alice",
              },
            ],
          },
          {
            type: "rule",
            columnName: "name",
            operator: "=",
            value: "admin",
          },
        ],
      }),
    );
    expect(sql.toLowerCase()).toContain("where");
    expect(sql.toLowerCase()).toContain(" or ");
    expect(sql.toLowerCase()).toContain(" and ");
  });

  it("renders IN list", () => {
    const sql = structuredQueryToSQL(
      _makeQuery({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "name",
            operator: "in",
            value: ["alice", "bob"],
          },
        ],
      }),
    );
    expect(sql.toLowerCase()).toMatch(/"name" in/);
  });

  it("renders IS NULL", () => {
    const sql = structuredQueryToSQL(
      _makeQuery({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "age",
            operator: "is_null",
            value: null,
          },
        ],
      }),
    );
    expect(sql.toLowerCase()).toContain('"age" is null');
  });
});
