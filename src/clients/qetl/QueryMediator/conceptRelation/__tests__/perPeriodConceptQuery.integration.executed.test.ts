/**
 * Executed test for a concept query that reads a per-period field, from the
 * structured query to the rows DuckDB returns.
 *
 * It follows the path a query takes: the SQL a structured query emits, the
 * columns the query needs from each dataset, a load that keeps only those
 * columns, and the concept view over what was loaded. The load is the point.
 * A per-period field reads a date column its SQL never names, so a load that
 * keeps only the columns the SQL and the plan name fails to bind the view when
 * the date column is left out.
 */
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { buildConceptViewSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import { makeConceptAttributeColumnsFromMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import { getNeededColumnsFromQuery } from "@/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import { StructuredQueryTestFixtures } from "../../../../../../tests/integration/queries/StructuredQueryTestFixtures";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type { ConceptRelationMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import type { DuckDBConnection } from "@duckdb/node-api";

const { _makeConcept, _makeConceptAttributeColumn, _makeQuery } =
  StructuredQueryTestFixtures;

const VISITS = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;
const CONCEPT_VIEW = RelationRef.toTableName({
  kind: "concept",
  id: CONCEPT_ID,
});
const SPINE = `${CONCEPT_VIEW}__individuals`;
const WORKSPACE_ID =
  "wwwwwwww-4444-4444-8444-wwwwwwwwwwww" as ConceptAttribute.T["workspaceId"];

function _attribute(
  overrides: Readonly<Partial<ConceptAttribute.T> & { name: string }>,
): ConceptAttribute.T {
  return {
    __type: "ConceptAttribute",
    id: `attr-${overrides.name}` as ConceptAttribute.Id,
    conceptId: CONCEPT_ID,
    workspaceId: WORKSPACE_ID,
    description: undefined,
    createdAt: "2026-08-19T00:00:00Z",
    updatedAt: "2026-08-19T00:00:00Z",
    dataType: "varchar",
    mappingType: "dataset_column",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: false,
    isArray: false,
    bucketGrain: undefined,
    ...overrides,
  };
}

function _column(
  name: string,
  dataType: DatasetColumn.T["dataType"],
): DatasetColumn.T {
  return {
    id: `col-${name}` as DatasetColumn.Id,
    name,
    datasetId: VISITS,
    dataType,
  } as DatasetColumn.T;
}

function _mapping(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    column: DatasetColumn.T;
    ruleType: NonNullable<DatasetColumnMapping["valuePickerRuleType"]>;
    bucketColumn?: DatasetColumn.T;
  }>,
): DatasetColumnMapping {
  return {
    id: `map-${options.attribute.name}` as DatasetColumnMapping["id"],
    workspaceId: WORKSPACE_ID as DatasetColumnMapping["workspaceId"],
    type: "dataset_column",
    conceptAttributeId: options.attribute.id,
    valuePickerRuleType: options.ruleType,
    datasetId: VISITS,
    datasetColumnId: options.column.id,
    bucketColumnId: options.bucketColumn?.id,
    createdAt: "2026-08-19T00:00:00Z",
    updatedAt: "2026-08-19T00:00:00Z",
  };
}

const PERSON_ID = _attribute({ name: "person_id", isIdentifier: true });
const TEMPERATURE_PER_MONTH = _attribute({
  name: "temperature per month",
  dataType: "bigint",
  isArray: true,
  bucketGrain: "month",
});
const PERSON_ID_COLUMN = _column("person_id", "bigint");
const TEMPERATURE_COLUMN = _column("temperature", "bigint");
const VISIT_DATE_COLUMN = _column("visit_date", "date");

const METADATA: ConceptRelationMetadata = {
  attributes: [PERSON_ID, TEMPERATURE_PER_MONTH],
  mappings: [
    _mapping({
      attribute: PERSON_ID,
      column: PERSON_ID_COLUMN,
      ruleType: "most_frequent",
    }),
    _mapping({
      attribute: TEMPERATURE_PER_MONTH,
      column: TEMPERATURE_COLUMN,
      ruleType: "max",
      bucketColumn: VISIT_DATE_COLUMN,
    }),
  ],
  datasetColumnsById: {
    [PERSON_ID_COLUMN.id]: PERSON_ID_COLUMN,
    [TEMPERATURE_COLUMN.id]: TEMPERATURE_COLUMN,
    [VISIT_DATE_COLUMN.id]: VISIT_DATE_COLUMN,
  },
};

/**
 * Loads the visits dataset as the query would: only `neededColumns`, in the
 * table and in the row-numbered view beside it. A column of the file outside
 * the list does not exist for the query.
 */
async function _loadVisits(
  connection: DuckDBConnection,
  neededColumns: readonly string[],
): Promise<void> {
  const path = join(tmpdir(), `ava-per-period-${randomUUID()}.parquet`);
  const columnList = neededColumns
    .map((name) => {
      return `"${name}"`;
    })
    .join(", ");
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        (101, 30, DATE '2026-01-05', 'unused'),
        (101, 38, DATE '2026-01-25', 'unused'),
        (101, 35, DATE '2026-02-10', 'unused'),
        (102, 31, DATE '2026-01-20', 'unused')
      ) AS t(person_id, temperature, visit_date, other)
    ) TO '${path}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${VISITS}" AS
      SELECT ${columnList} FROM read_parquet('${path}');
    CREATE VIEW "${getRowNumberedViewName(VISITS)}" AS
      SELECT ${columnList}, file_row_number
      FROM read_parquet('${path}', file_row_number = true);
    CREATE TABLE "${SPINE}" AS
      SELECT * FROM (VALUES ('101', 'Active'), ('102', 'Active'),
        ('103', 'Active')) AS t(external_id, status);
  `);
}

describe("a concept query that reads a per-period field", () => {
  it("returns each record's periods as a list of bucket and value", async () => {
    const field = _makeConceptAttributeColumn({
      id: "qc_1_temperature",
      name: "temperature per month",
      dataType: "bigint",
      isArray: true,
    });
    const externalId = _makeConceptAttributeColumn({
      id: "qc_0_external_id",
      name: "external_id",
    });
    const sql = structuredQueryToSql(
      _makeQuery({
        dataSource: _makeConcept(),
        columns: [externalId, field],
        orderByColumn: externalId.id,
        orderByDirection: "asc",
      }),
    );
    const { attributeColumns } =
      makeConceptAttributeColumnsFromMetadata(METADATA);
    const plan: ConceptRelationPlan = {
      ref: { kind: "concept", id: CONCEPT_ID },
      contributingDatasetIds: [VISITS],
      spineRows: [],
      attributeColumns,
    };
    const neededColumns = getNeededColumnsFromQuery({
      rawSql: sql,
      datasetIds: [VISITS],
      conceptRelations: [plan],
    })[VISITS];

    expect(neededColumns).toEqual(["person_id", "temperature", "visit_date"]);

    const rows = await withDuckDb(async (connection) => {
      await _loadVisits(connection, neededColumns as string[]);
      await connection.run(
        buildConceptViewSql({
          viewName: CONCEPT_VIEW,
          spineTableName: SPINE,
          attributeColumns,
        }),
      );
      const reader = await connection.runAndReadAll(sql);
      return reader.getRowObjectsJson();
    });

    expect(rows).toEqual([
      {
        external_id: "101",
        "temperature per month": [
          { bucket: "2026-01-01", value: 38 },
          { bucket: "2026-02-01", value: 35 },
        ],
      },
      {
        external_id: "102",
        "temperature per month": [{ bucket: "2026-01-01", value: 31 }],
      },
      { external_id: "103", "temperature per month": [] },
    ]);
  });
});
