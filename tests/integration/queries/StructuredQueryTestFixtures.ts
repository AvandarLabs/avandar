import { Model } from "@avandar/models";
import { propEq } from "@avandar/utils";
import { expect, it } from "vitest";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types";
import { sqlToStructuredQuery } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery";
import { makeFilterColumnFromStructuredQuery } from "$/models/queries/StructuredQuery/structuredQueryToSql/makeFilterColumnFromStructuredQuery";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { withDuckDb } from "./executedDuckDb";
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
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
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

type MakeColumnOptions = {
  id: string;
  name: string;
  dataType?: AvaDataType.T;
  aggregation?: QueryAggregationTypeT;
};

type MakeConceptAttributeColumnOptions = {
  id: string;
  name: string;
  dataType?: AvaDataType.T;
  aggregation?: QueryAggregationTypeT;
};

type MakeQueryOptions = {
  dataSource: QueryDataSource;
  columns: readonly QueryColumnRead[];
  sourceColumns?: readonly QueryColumnRead[];
  filters?: QueryFilterGroup;
  having?: QueryFilterGroup;
  joins?: readonly QueryJoin[];
  orderByColumn?: QueryColumnId;
  orderByDirection?: OrderByDirection;
  limit?: number;
  offset?: number;
};

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
function _makeColumn(args: MakeColumnOptions): QueryColumnRead {
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
function _makeConceptAttributeColumn(
  args: MakeConceptAttributeColumnOptions,
): QueryColumnRead {
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
function _makeQuery(args: MakeQueryOptions): PartialStructuredQuery {
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
    sourceColumns: args.sourceColumns ?? args.columns,
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

function _getParserDatasets(): Array<{
  dataset: Dataset.T;
  columns: DatasetColumn.T[];
}> {
  return [
    {
      dataset: _makeDataset("cases"),
      columns: [
        _makeColumn({ id: "district", name: "district" }),
        _makeColumn({ id: "cnt", name: "cnt", dataType: "bigint" }),
        _makeColumn({ id: "status", name: "status" }),
      ].map((column) => {
        return column.baseColumn as DatasetColumn.T;
      }),
    },
  ];
}
/** Shared setup and fixtures for StructuredQueryTestFixtures. */
export const StructuredQueryTestFixtures = {
  propEq,
  sqlToStructuredQuery,
  makeFilterColumnFromStructuredQuery,
  structuredQueryToSql,
  withDuckDb,
  expect,
  it,
  _FIXTURE_SQL,
  _makeDataset,
  _makeColumn,
  _makeConcept,
  _makeConceptAttributeColumn,
  _makeQuery,
  _normalizeRow,
  _runQuery,
  _getParserDatasets,
};
