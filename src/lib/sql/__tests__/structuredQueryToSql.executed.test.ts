/**
 * Row-level tests for {@link structuredQueryToSql}. Every case builds a
 * structured query, runs the emitted SQL against a real in-memory DuckDB,
 * and asserts the rows that come back.
 *
 * Asserting rows rather than SQL text is the point of this suite: a
 * snapshot of emitted SQL stays green when the SQL is subtly wrong, while
 * executing it does not.
 *
 * The suite lives under `src/` rather than beside its module because the
 * DuckDB harness it needs is browser-side code, and `deno check shared`
 * type-checks every file under `shared/`. A `shared/` test importing `@/`
 * fails that check, and mapping `@/` for Deno would let Deno-reachable code
 * import browser code, which is the boundary the rule exists to protect.
 */
import { Model } from "@avandar/models";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { describe, expect, it } from "vitest";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import type { DuckDBConnection } from "@duckdb/node-api";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types";
import type { ConceptModel } from "$/models/ontology/Concept/Concept.types";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { QueryJoin } from "$/models/queries/StructuredQuery/QueryJoin.types";
import type {
  OrderByDirection,
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types";

/** The DDL every case in this suite runs before its query. */
const _FIXTURE_SQL = `
  CREATE TABLE cases AS SELECT * FROM (VALUES
    ('North', 'confirmed', 5),
    ('North', 'suspected', 2),
    ('South', 'confirmed', 3),
    ('East', 'confirmed', 1)
  ) AS t(district, status, cnt);

  CREATE TABLE districts AS SELECT * FROM (VALUES
    ('north', 'North'),
    ('south', 'South'),
    ('west', 'West')
  ) AS t(district_key, district_label);

  CREATE TABLE populations AS SELECT * FROM (VALUES
    ('north', 100),
    ('south', 50)
  ) AS t(pop_key, population);
`;

/** A dataset whose `id` is used verbatim as the FROM table name. */
function _makeDataset(tableName: string): DatasetModel["Read"] {
  return Model.make("Dataset", {
    id: tableName,
    name: tableName,
  }) as unknown as DatasetModel["Read"];
}

/**
 * A query column wrapping a dataset column. `id` is passed explicitly
 * because `structuredQueryToSql` sorts the SELECT list by column id.
 */
function _makeColumn(args: {
  id: string;
  name: string;
  dataType?: string;
  aggregation?: QueryAggregationTypeT;
}): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: args.id as QueryColumnId,
    baseColumn: Model.make("DatasetColumn", {
      id: `dc_${args.name}`,
      name: args.name,
      originalName: args.name,
      dataType: args.dataType ?? "varchar",
      columnIdx: 0,
    }),
    aggregation: args.aggregation,
  }) as unknown as QueryColumnRead;
}

/**
 * Builds a structured query over `tableName` with the given columns. The
 * `aggregations` map is derived from each column's own `aggregation` so the
 * two stay consistent, which is what the app does.
 */
function _makeQuery(args: {
  tableName: string;
  columns: readonly QueryColumnRead[];
  filters?: QueryFilterGroup;
  having?: QueryFilterGroup;
  joins?: readonly QueryJoin[];
  orderByColumn?: QueryColumnId;
  orderByDirection?: OrderByDirection;
  limit?: number;
  offset?: number;
}): PartialStructuredQuery {
  const aggregations = Object.fromEntries(
    args.columns.map((column) => {
      return [column.id, column.aggregation ?? "none"];
    }),
  );

  return Model.make("StructuredQuery", {
    id: "q1" as StructuredQueryId,
    version: 1 as const,
    dataSource: _makeDataset(args.tableName),
    queryColumns: args.columns,
    orderByColumn: args.orderByColumn,
    orderByDirection: args.orderByDirection,
    aggregations,
    filters: args.filters ?? EMPTY_QUERY_FILTER,
    having: args.having ?? EMPTY_QUERY_FILTER,
    joins: args.joins ?? [],
    offset: args.offset,
    limit: args.limit,
  }) as unknown as PartialStructuredQuery;
}

/**
 * DuckDB returns integer aggregates as `bigint` and decimals as objects.
 * Normalising to `number` keeps the row assertions readable while still
 * comparing real values.
 */
function _normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (typeof value === "bigint") {
        return [key, Number(value)];
      }
      if (
        typeof value === "object" &&
        value !== null &&
        "toDouble" in value &&
        typeof value.toDouble === "function"
      ) {
        return [key, (value as { toDouble: () => number }).toDouble()];
      }
      return [key, value];
    }),
  );
}

/** Creates the fixture tables, runs `sql`, and returns the rows. */
async function _runQuery(sql: string): Promise<Array<Record<string, unknown>>> {
  return withDuckDb(async (connection: DuckDBConnection) => {
    await connection.run(_FIXTURE_SQL);
    const result = await connection.runAndReadAll(sql);
    return result.getRowObjects().map(_normalizeRow);
  });
}

describe("structuredQueryToSql executed", () => {
  it("filters and groups to the right rows", async () => {
    const district = _makeColumn({ id: "qc_1_district", name: "district" });
    const total = _makeColumn({
      id: "qc_2_cnt",
      name: "cnt",
      dataType: "number",
      aggregation: "sum",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        tableName: "cases",
        columns: [district, total],
        filters: {
          type: "group",
          combinator: "AND",
          rules: [
            {
              type: "rule",
              columnName: "status",
              operator: "=",
              value: "confirmed",
            },
          ],
        },
        orderByColumn: district.id,
        orderByDirection: "asc",
      }),
    );

    await expect(_runQuery(sql)).resolves.toEqual([
      { district: "East", "sum(cnt)": 1 },
      { district: "North", "sum(cnt)": 5 },
      { district: "South", "sum(cnt)": 3 },
    ]);
  });

  it("keeps unmatched left rows on a left join", async () => {
    const label = _makeColumn({ id: "qc_1_label", name: "district_label" });
    const population = _makeColumn({
      id: "qc_2_population",
      name: "population",
      dataType: "number",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        tableName: "districts",
        columns: [label, population],
        joins: [
          {
            id: "j1",
            kind: "left",
            target: { type: "table", tableName: "populations" },
            on: [
              {
                type: "equality",
                leftColumn: "district_key",
                rightColumn: "pop_key",
              },
            ],
          },
        ],
        orderByColumn: label.id,
        orderByDirection: "asc",
      }),
    );

    // "West" has no row in `populations`; a left join must keep it with a
    // NULL population, which DuckDB hands back as `null`. An inner join
    // would silently drop the row.
    await expect(_runQuery(sql)).resolves.toEqual([
      { district_label: "North", population: 100 },
      { district_label: "South", population: 50 },
      { district_label: "West", population: null },
    ]);
  });

  it("orders and limits to the top rows in order", async () => {
    const district = _makeColumn({ id: "qc_1_district", name: "district" });
    const cnt = _makeColumn({
      id: "qc_2_cnt",
      name: "cnt",
      dataType: "number",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        tableName: "cases",
        columns: [district, cnt],
        orderByColumn: cnt.id,
        orderByDirection: "desc",
        limit: 2,
      }),
    );

    await expect(_runQuery(sql)).resolves.toEqual([
      { district: "North", cnt: 5 },
      { district: "South", cnt: 3 },
    ]);
  });

  it("filters after aggregation with a having clause", async () => {
    const district = _makeColumn({ id: "qc_1_district", name: "district" });
    const total = _makeColumn({
      id: "qc_2_cnt",
      name: "cnt",
      dataType: "number",
      aggregation: "sum",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        tableName: "cases",
        columns: [district, total],
        having: {
          type: "group",
          combinator: "AND",
          rules: [
            {
              type: "rule",
              // The HAVING tree names the *derived* column, which is the
              // alias `structuredQueryToSql` emits for a sum.
              columnName: "sum(cnt)",
              operator: ">",
              value: 3,
            },
          ],
        },
        orderByColumn: district.id,
        orderByDirection: "asc",
      }),
    );

    // North sums to 7, South to 3, East to 1, so only North survives.
    await expect(_runQuery(sql)).resolves.toEqual([
      { district: "North", "sum(cnt)": 7 },
    ]);
  });

  it("emits SQL DuckDB rejects when ordering by an aggregated column", async () => {
    // `structuredQueryToSql` derives the ORDER BY name from the query
    // column's own `aggregation` field, but derives the SELECT alias from
    // the query's `aggregations` map. When only the map carries the
    // aggregation the two disagree: the alias is `sum(cnt)` while the
    // ORDER BY says the bare `cnt`, which is neither grouped nor
    // aggregated, so DuckDB rejects the statement. This test pins that
    // behaviour; it turns red the moment the two naming paths are unified.
    const district = _makeColumn({ id: "qc_1_district", name: "district" });
    const total = _makeColumn({
      id: "qc_2_cnt",
      name: "cnt",
      dataType: "number",
    });

    const query = _makeQuery({
      tableName: "cases",
      columns: [district, total],
      orderByColumn: total.id,
      orderByDirection: "desc",
    });
    const withMapOnlyAggregation = {
      ...query,
      aggregations: { ...query.aggregations, [total.id]: "sum" },
    } as PartialStructuredQuery;

    const sql = structuredQueryToSql(withMapOnlyAggregation);
    expect(sql).toContain('order by "cnt" desc');
    await expect(_runQuery(sql)).rejects.toThrow(/GROUP BY|Binder Error/i);
  });

  it("throws rather than emitting SQL for a Concept data source", () => {
    // Characterizes the guard at the top of `structuredQueryToSql`. When
    // the Concept path becomes queryable this assertion must change.
    const district = _makeColumn({ id: "qc_1_district", name: "district" });
    const query = _makeQuery({ tableName: "cases", columns: [district] });
    const conceptQuery = {
      ...query,
      dataSource: Model.make("Concept", {
        id: "concept_1",
        name: "Case",
      }) as unknown as ConceptModel["Read"],
    } as PartialStructuredQuery;

    expect(() => {
      return structuredQueryToSql(conceptQuery);
    }).toThrow("Querying Concepts through DuckDB is not supported.");
  });
});
