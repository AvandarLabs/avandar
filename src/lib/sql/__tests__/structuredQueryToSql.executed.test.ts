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
import { describe, expect, it } from "vitest";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptModel } from "$/models/ontology/Concept/Concept.types";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { QueryJoin } from "$/models/queries/StructuredQuery/QueryJoin.types";
import type {
  OrderByDirection,
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * A concept, and the table name the emitter has to derive for it.
 *
 * The concept cases below stand the view up by hand rather than through
 * `buildConceptViewSql` and the spine loader, because those are another lane's
 * work and are not wired into relation loading yet. What this suite owns is the
 * emitter: that a `Concept` source resolves to `RelationRef.toTableName`'s
 * spelling, and that group-by and aggregation reach a `ConceptAttribute`. A
 * hand-built table is enough to hold both, and it stays honest because the
 * name is derived here the same way the emitter derives it.
 */
const _CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const _CONCEPT_TABLE_NAME = RelationRef.toTableName({
  kind: "concept",
  id: _CONCEPT_ID as Concept.Id,
});

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

  CREATE TABLE "${_CONCEPT_TABLE_NAME}" AS SELECT * FROM (VALUES
    ('p1', 'North', 5),
    ('p2', 'North', 2),
    ('p3', 'South', 3),
    ('p4', 'East', 1)
  ) AS t(external_id, region, headcount);
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
  dataType?: AvaDataType.T;
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

/** The concept the concept cases query, as a `QueryDataSource` model row. */
function _makeConcept(): ConceptModel["Read"] {
  return Model.make("Concept", {
    id: _CONCEPT_ID,
    name: "Household",
  }) as unknown as ConceptModel["Read"];
}

/**
 * A query column wrapping a concept attribute. Everything the emitter reads
 * off a base column, the `name` and the `dataType`, a `ConceptAttribute`
 * carries too, which is why the aggregation pass needs no second arm for it.
 */
function _makeConceptAttributeColumn(args: {
  id: string;
  name: string;
  dataType?: AvaDataType.T;
  aggregation?: QueryAggregationTypeT;
}): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: args.id as QueryColumnId,
    baseColumn: Model.make("ConceptAttribute", {
      id: `ca_${args.name}`,
      name: args.name,
      dataType: args.dataType ?? "varchar",
      isLabel: false,
      isIdentifier: false,
      isArray: false,
    }),
    aggregation: args.aggregation,
  }) as unknown as QueryColumnRead;
}

/**
 * Builds a structured query over `dataSource` with the given columns. The
 * `aggregations` map is derived from each column's own `aggregation` so the
 * two stay consistent, which is what the app does.
 */
function _makeQuery(args: {
  dataSource: QueryDataSource;
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
    dataSource: args.dataSource,
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
      dataType: "bigint",
      aggregation: "sum",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        dataSource: _makeDataset("cases"),
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
      dataType: "bigint",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        dataSource: _makeDataset("districts"),
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
      dataType: "bigint",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        dataSource: _makeDataset("cases"),
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
      dataType: "bigint",
      aggregation: "sum",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        dataSource: _makeDataset("cases"),
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

  it("orders by an aggregation carried only by the aggregations map", async () => {
    // The two copies of a column's aggregation, the query's `aggregations`
    // map and the column's own `aggregation` field, are maintained
    // independently. Here only the map carries the sum, which is what used to
    // make the emitter alias `sum(cnt)` in the SELECT list while naming the
    // bare `cnt` in the ORDER BY: a column that is neither grouped nor
    // aggregated, which DuckDB rejects outright. Executing the SQL is the
    // assertion that matters; a string comparison passed the broken version.
    const district = _makeColumn({ id: "qc_1_district", name: "district" });
    const total = _makeColumn({
      id: "qc_2_cnt",
      name: "cnt",
      dataType: "bigint",
    });

    const query = _makeQuery({
      dataSource: _makeDataset("cases"),
      columns: [district, total],
      orderByColumn: total.id,
      orderByDirection: "desc",
    });
    const withMapOnlyAggregation = {
      ...query,
      aggregations: { ...query.aggregations, [total.id]: "sum" },
    } as PartialStructuredQuery;

    const sql = structuredQueryToSql(withMapOnlyAggregation);
    // North sums to 7, South to 3 and East to 1, so a descending sort on the
    // aggregate is a different order from a descending sort on `cnt`, whose
    // largest single row is North's 5.
    await expect(_runQuery(sql)).resolves.toEqual([
      { district: "North", "sum(cnt)": 7 },
      { district: "South", "sum(cnt)": 3 },
      { district: "East", "sum(cnt)": 1 },
    ]);
  });

  it("orders by the bare column when only the column field carries the aggregation", async () => {
    // The other direction of the same disagreement, and the reason the map is
    // the emitter's source of truth rather than the column: the map says
    // `none`, so no aggregate is emitted and no GROUP BY is either. An ORDER
    // BY taken from the column's field would name `sum(cnt)`, an alias that
    // appears nowhere in the statement.
    const district = _makeColumn({ id: "qc_1_district", name: "district" });
    const total = _makeColumn({
      id: "qc_2_cnt",
      name: "cnt",
      dataType: "bigint",
      aggregation: "sum",
    });

    const query = _makeQuery({
      dataSource: _makeDataset("cases"),
      columns: [district, total],
      orderByColumn: total.id,
      orderByDirection: "desc",
    });
    const withColumnOnlyAggregation = {
      ...query,
      aggregations: { ...query.aggregations, [total.id]: "none" },
    } as PartialStructuredQuery;

    const sql = structuredQueryToSql(withColumnOnlyAggregation);
    await expect(_runQuery(sql)).resolves.toEqual([
      { district: "North", cnt: 5 },
      { district: "South", cnt: 3 },
      { district: "North", cnt: 2 },
      { district: "East", cnt: 1 },
    ]);
  });

  it("orders by the bare column when the map has no entry for it", async () => {
    // A column absent from the map is not aggregated, because the aggregate
    // pass only walks the map's entries. Falling back to the column's own
    // field for a missing key would name an alias no SELECT item emits, so
    // absent and `none` have to behave the same way.
    const district = _makeColumn({ id: "qc_1_district", name: "district" });
    const total = _makeColumn({
      id: "qc_2_cnt",
      name: "cnt",
      dataType: "bigint",
      aggregation: "sum",
    });

    const query = _makeQuery({
      dataSource: _makeDataset("cases"),
      columns: [district, total],
      orderByColumn: total.id,
      orderByDirection: "desc",
    });
    const { [total.id]: _dropped, ...aggregationsWithoutTotal } =
      query.aggregations;
    const withNoAggregationEntry = {
      ...query,
      aggregations: aggregationsWithoutTotal,
    } as PartialStructuredQuery;

    const sql = structuredQueryToSql(withNoAggregationEntry);
    await expect(_runQuery(sql)).resolves.toEqual([
      { district: "North", cnt: 5 },
      { district: "South", cnt: 3 },
      { district: "North", cnt: 2 },
      { district: "East", cnt: 1 },
    ]);
  });

  it("selects from a Concept source through its prefixed table name", async () => {
    // This used to throw outright. The rows come back only if the FROM names
    // `concept_<uuid>`, because that is the only name the fixture created:
    // `_CONCEPT_ID` alone is not a table here, so a bare id would fail to bind.
    const externalId = _makeConceptAttributeColumn({
      id: "qc_1_external_id",
      name: "external_id",
    });
    const region = _makeConceptAttributeColumn({
      id: "qc_2_region",
      name: "region",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        dataSource: _makeConcept(),
        columns: [externalId, region],
        orderByColumn: externalId.id,
        orderByDirection: "asc",
        limit: 2,
      }),
    );

    await expect(_runQuery(sql)).resolves.toEqual([
      { external_id: "p1", region: "North" },
      { external_id: "p2", region: "North" },
    ]);
  });

  it("groups and aggregates a Concept's attributes", async () => {
    // The regression guard for the aggregation gate. With the gate narrowed to
    // `DatasetColumn` this returns all four ungrouped rows instead: the query
    // still compiles and the rows still look like data, which is exactly why
    // executing it is the only assertion that catches it.
    const region = _makeConceptAttributeColumn({
      id: "qc_1_region",
      name: "region",
      aggregation: "group_by",
    });
    const headcount = _makeConceptAttributeColumn({
      id: "qc_2_headcount",
      name: "headcount",
      dataType: "bigint",
      aggregation: "sum",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        dataSource: _makeConcept(),
        columns: [region, headcount],
        orderByColumn: headcount.id,
        orderByDirection: "desc",
      }),
    );

    // North's two households sum to 7, so the aggregate's descending order is
    // a different order from `headcount`'s, whose largest single row is 5.
    await expect(_runQuery(sql)).resolves.toEqual([
      { region: "North", "sum(headcount)": 7 },
      { region: "South", "sum(headcount)": 3 },
      { region: "East", "sum(headcount)": 1 },
    ]);
  });

  it("filters a Concept's attributes before aggregating", async () => {
    // Filters, having, joins and limits were always relation-agnostic: they
    // work on quoted column names against a table name, so they start working
    // on a concept the moment the name resolves. One case holds that claim
    // rather than a suite that repeats every dataset case.
    const region = _makeConceptAttributeColumn({
      id: "qc_1_region",
      name: "region",
      aggregation: "group_by",
    });
    const headcount = _makeConceptAttributeColumn({
      id: "qc_2_headcount",
      name: "headcount",
      dataType: "bigint",
      aggregation: "sum",
    });

    const sql = structuredQueryToSql(
      _makeQuery({
        dataSource: _makeConcept(),
        columns: [region, headcount],
        filters: {
          type: "group",
          combinator: "AND",
          rules: [
            {
              type: "rule",
              columnName: "headcount",
              operator: ">",
              value: 1,
            },
          ],
        },
        orderByColumn: region.id,
        orderByDirection: "asc",
      }),
    );

    // `p4` is East's only household and its headcount of 1 is filtered out, so
    // East disappears rather than summing to zero.
    await expect(_runQuery(sql)).resolves.toEqual([
      { region: "North", "sum(headcount)": 7 },
      { region: "South", "sum(headcount)": 3 },
    ]);
  });
});
