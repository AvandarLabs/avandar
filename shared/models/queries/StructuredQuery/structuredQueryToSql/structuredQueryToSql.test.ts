import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.ts";
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
  const ageColumn = _makeColumn("age", "bigint");
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
    having: EMPTY_QUERY_FILTER,
    joins: [],
    offset: undefined,
    limit: undefined,
  }) as PartialStructuredQuery;
}

describe("structuredQueryToSql", () => {
  it("emits a basic SELECT statement when filters are empty", () => {
    const sql = structuredQueryToSql(_makeQuery());
    expect(sql).toContain("select");
    expect(sql).toContain('"name"');
    expect(sql).toContain('"age"');
    expect(sql).toContain('from "users_table"');
    expect(sql.toLowerCase()).not.toContain("where");
  });

  it("renders a simple equality filter", () => {
    const sql = structuredQueryToSql(
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
    const sql = structuredQueryToSql(
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

  it("renders IN list, case-insensitively by default", () => {
    const sql = structuredQueryToSql(
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
    expect(sql.toLowerCase()).toMatch(/lower\("name"\) in/);
  });

  it("renders IN list case-sensitively when the rule asks to match case", () => {
    const sql = structuredQueryToSql(
      _makeQuery({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "name",
            operator: "in",
            value: ["alice", "bob"],
            matchCase: true,
          },
        ],
      }),
    );
    expect(sql.toLowerCase()).toMatch(/"name" in/);
    expect(sql.toLowerCase()).not.toContain("lower(");
  });

  it("binds numeric filter values as numbers using the query's column types", () => {
    const sql = structuredQueryToSql(
      _makeQuery({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "age",
            operator: ">",
            value: "30",
          },
        ],
      }),
    );
    expect(sql).toContain('"age" > 30');
    expect(sql).not.toContain(`'30'`);
  });

  it("lets an explicit columnTypes option override the query's columns", () => {
    const sql = structuredQueryToSql(
      _makeQuery({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "name",
            operator: "=",
            value: "5",
          },
        ],
      }),
      { columnTypes: { name: "bigint" } },
    );
    expect(sql).toContain('"name" = 5');
  });

  it("renders IS NULL", () => {
    const sql = structuredQueryToSql(
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

  it("emits a HAVING clause when set", () => {
    const nameColumn = _makeColumn("name");
    const ageColumn = _makeColumn("age", "integer");
    const query = Model.make("StructuredQuery", {
      id: "q1" as StructuredQueryId,
      version: 1 as const,
      dataSource: _makeDataset(),
      queryColumns: [nameColumn, ageColumn],
      orderByColumn: undefined,
      orderByDirection: undefined,
      aggregations: {
        [nameColumn.id]: "group_by",
        [ageColumn.id]: "count",
      },
      filters: EMPTY_QUERY_FILTER,
      having: {
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "count_age",
            operator: ">",
            value: 5,
          },
        ],
      } as QueryFilterGroup,
      joins: [],
      offset: undefined,
      limit: undefined,
    }) as PartialStructuredQuery;
    const sql = structuredQueryToSql(query);
    expect(sql.toLowerCase()).toContain("having");
    expect(sql).toContain('"count_age"');
  });

  it("emits an INNER JOIN clause", () => {
    const nameColumn = _makeColumn("name");
    const query = Model.make("StructuredQuery", {
      id: "q1" as StructuredQueryId,
      version: 1 as const,
      dataSource: _makeDataset(),
      queryColumns: [nameColumn],
      orderByColumn: undefined,
      orderByDirection: undefined,
      aggregations: { [nameColumn.id]: "none" },
      filters: EMPTY_QUERY_FILTER,
      having: EMPTY_QUERY_FILTER,
      joins: [
        {
          id: "j1",
          kind: "inner",
          target: { type: "table", tableName: "profiles", alias: "b" },
          on: [
            {
              type: "equality",
              leftColumn: "id",
              rightColumn: "user_id",
              leftTable: "a",
              rightTable: "b",
            },
          ],
          combinator: "AND",
        },
      ],
      offset: undefined,
      limit: undefined,
    }) as PartialStructuredQuery;
    const sql = structuredQueryToSql(query);
    expect(sql.toLowerCase()).toContain("inner join");
    expect(sql).toContain('"profiles"');
    expect(sql).toMatch(/"a"\."id" = "b"\."user_id"/);
  });

  it("emits a LEFT JOIN with subquery target", () => {
    const nameColumn = _makeColumn("name");
    const query = Model.make("StructuredQuery", {
      id: "q1" as StructuredQueryId,
      version: 1 as const,
      dataSource: _makeDataset(),
      queryColumns: [nameColumn],
      orderByColumn: undefined,
      orderByDirection: undefined,
      aggregations: { [nameColumn.id]: "none" },
      filters: EMPTY_QUERY_FILTER,
      having: EMPTY_QUERY_FILTER,
      joins: [
        {
          id: "j1",
          kind: "left",
          target: {
            type: "subquery",
            subqueryId:
              "select user_id, max(score) as s from scores group by user_id",
            alias: "sub",
          },
          on: [
            {
              type: "equality",
              leftColumn: "id",
              rightColumn: "user_id",
              leftTable: "a",
              rightTable: "sub",
            },
          ],
          combinator: "AND",
        },
      ],
      offset: undefined,
      limit: undefined,
    }) as PartialStructuredQuery;
    const sql = structuredQueryToSql(query);
    expect(sql.toLowerCase()).toContain("left join");
    expect(sql).toContain("(select user_id, max(score) as s from scores");
    expect(sql).toContain('as "sub"');
  });

  it("emits FROM (subquery) AS alias when nestedSubquery is set", () => {
    const query = Model.make("StructuredQuery", {
      id: "q1" as StructuredQueryId,
      version: 1 as const,
      dataSource: _makeDataset(),
      nestedSubquery: {
        type: "subquery",
        id: "sub1",
        sql: 'select "name" from "users_table" where "age" > 18',
        alias: "adult",
      },
      queryColumns: [],
      orderByColumn: undefined,
      orderByDirection: undefined,
      aggregations: {},
      filters: EMPTY_QUERY_FILTER,
      having: EMPTY_QUERY_FILTER,
      joins: [],
      offset: undefined,
      limit: undefined,
    }) as PartialStructuredQuery;
    const sql = structuredQueryToSql(query);
    expect(sql).toContain('from (select "name" from "users_table"');
    expect(sql).toContain('as "adult"');
  });
});
