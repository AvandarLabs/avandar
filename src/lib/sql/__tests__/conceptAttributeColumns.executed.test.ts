import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptRelationMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Executed tests for the step that turns a concept's ontology rows into the
 * columns its DuckDB view emits.
 *
 * Every case drives real SQL over real parquet files from a fake concept's
 * metadata, because this is the half of the concept relation that no type
 * protects: a wrong identifier-attribute lookup, or a column read against the
 * wrong dataset, produces a view that compiles and returns all-NULL columns. A
 * test that asserted the returned `ConceptAttributeColumn[]` would agree with
 * whatever the implementation happened to do.
 *
 * Dataset A's key column is deliberately `BIGINT` while the spine's key is
 * `VARCHAR`. That is the real shape: `individuals.external_id` is `text` in
 * Postgres and a dataset's key column is whatever its parquet file says. Before
 * the comparison cast, DuckDB resolved `VARCHAR = BIGINT` by casting the
 * spine's ids to numbers, which raises a conversion error on the first
 * non-numeric id.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { buildConceptViewSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql";
import { makeConceptAttributeColumnsFromMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";

const DATASET_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const DATASET_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb" as Dataset.Id;
const CONCEPT_VIEW = "concept_cccccccc-3333-4333-8333-cccccccccccc";
const SPINE = `${CONCEPT_VIEW}__individuals`;

/**
 * Builds one concept attribute.
 *
 * The ids are derived from the name so a fixture reads as its attribute rather
 * than as a uuid, and so the name-collision case can still give two attributes
 * distinct ids.
 */
function _attribute(
  overrides: Readonly<Partial<ConceptAttribute.T> & { name: string }>,
): ConceptAttribute.T {
  return {
    __type: "ConceptAttribute",
    id: (overrides.id ?? `attr-${overrides.name}`) as ConceptAttribute.Id,
    conceptId:
      "cccccccc-3333-4333-8333-cccccccccccc" as ConceptAttribute.T["conceptId"],
    workspaceId:
      "wwwwwwww-4444-4444-8444-wwwwwwwwwwww" as ConceptAttribute.T["workspaceId"],
    description: undefined,
    createdAt: "2026-08-19T00:00:00Z",
    updatedAt: "2026-08-19T00:00:00Z",
    dataType: "varchar",
    mappingType: "dataset_column",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: false,
    isArray: false,
    ...overrides,
  };
}

/** One mapping paired with the dataset column it names. */
type MappedColumn = {
  mapping: DatasetColumnMapping;
  datasetColumn: DatasetColumn.T;
};

/** Builds one dataset-column mapping, plus the dataset column it names. */
function _mapping(
  options: Readonly<{
    attributeName: string;
    datasetId: Dataset.Id;
    columnName: string;
    ruleType?: DatasetColumnMapping["valuePickerRuleType"];
  }>,
): MappedColumn {
  const datasetColumnId =
    `col-${options.datasetId}-${options.columnName}` as DatasetColumn.Id;
  return {
    mapping: {
      id: `map-${options.attributeName}` as DatasetColumnMapping["id"],
      workspaceId:
        "wwwwwwww-4444-4444-8444-wwwwwwwwwwww" as DatasetColumnMapping["workspaceId"],
      type: "dataset_column",
      conceptAttributeId:
        `attr-${options.attributeName}` as ConceptAttribute.Id,
      valuePickerRuleType: options.ruleType ?? "first",
      datasetId: options.datasetId,
      datasetColumnId,
      createdAt: "2026-08-19T00:00:00Z",
      updatedAt: "2026-08-19T00:00:00Z",
    },
    datasetColumn: {
      id: datasetColumnId,
      name: options.columnName,
      datasetId: options.datasetId,
    } as DatasetColumn.T,
  };
}

/** Assembles the metadata a concept's columns are derived from. */
function _metadata(
  options: Readonly<{
    attributes: readonly ConceptAttribute.T[];
    mappings: readonly MappedColumn[];
  }>,
): ConceptRelationMetadata {
  return {
    attributes: [...options.attributes],
    mappings: options.mappings.map((entry) => {
      return entry.mapping;
    }),
    datasetColumnsById: Object.fromEntries(
      options.mappings.map((entry) => {
        return [entry.datasetColumn.id, entry.datasetColumn];
      }),
    ),
  };
}

const PERSON_ID = _attribute({
  name: "person_id",
  isIdentifier: true,
});
const HOUSEHOLD_ID = _attribute({
  name: "hh_id",
  isIdentifier: true,
});
const AGE = _attribute({ name: "age", dataType: "bigint" });
const REGION = _attribute({ name: "region" });
const TAGS = _attribute({ name: "tags", isArray: true });
const NOTE = _attribute({ name: "note", mappingType: "manual_entry" });

const PERSON_ID_MAPPING = _mapping({
  attributeName: "person_id",
  datasetId: DATASET_A,
  columnName: "person_id",
});
const HOUSEHOLD_ID_MAPPING = _mapping({
  attributeName: "hh_id",
  datasetId: DATASET_B,
  columnName: "hh_id",
});
const AGE_MAPPING = _mapping({
  attributeName: "age",
  datasetId: DATASET_A,
  columnName: "age_years",
});
const REGION_MAPPING = _mapping({
  attributeName: "region",
  datasetId: DATASET_B,
  columnName: "region_name",
  ruleType: "most_frequent",
});
const TAGS_MAPPING = _mapping({
  attributeName: "tags",
  datasetId: DATASET_A,
  columnName: "tag",
});

/**
 * Builds the fixture world: two contributing datasets as parquet with their
 * `ava_rows_` views, plus the spine.
 *
 * `101` has two rows in dataset A so `first` has something to be wrong about,
 * `102` has two equally frequent regions in B so `most_frequent` has a tie to
 * break, and `103` is in the spine and in no dataset. Dataset A's key is a
 * number and B's is text, on purpose.
 */
async function _seed(connection: DuckDBConnection): Promise<void> {
  const pathA = join(tmpdir(), "ava-concept-columns-a.parquet");
  const pathB = join(tmpdir(), "ava-concept-columns-b.parquet");

  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        (101, 41, 'blue'),
        (101, 42, 'green'),
        (102, 50, 'red')
      ) AS t(person_id, age_years, tag)
    ) TO '${pathA}' (FORMAT parquet)
  `);
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('101', 'North'),
        ('102', 'South'),
        ('102', 'East')
      ) AS t(hh_id, region_name)
    ) TO '${pathB}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${DATASET_A}" AS SELECT * FROM read_parquet('${pathA}');
    CREATE VIEW "${DATASET_B}" AS SELECT * FROM read_parquet('${pathB}');
    CREATE VIEW "${getRowNumberedViewName(DATASET_A)}" AS
      SELECT * FROM read_parquet('${pathA}', file_row_number = true);
    CREATE VIEW "${getRowNumberedViewName(DATASET_B)}" AS
      SELECT * FROM read_parquet('${pathB}', file_row_number = true);
    CREATE TABLE "${SPINE}" AS
      SELECT CAST(external_id AS VARCHAR) AS external_id
      FROM (VALUES ('101'), ('102'), ('103')) AS t(external_id);
  `);
}

/** DuckDB returns integers as bigint and lists as array-likes. */
function _normalize(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (typeof value === "bigint") {
        return [key, Number(value)];
      }
      if (value !== null && typeof value === "object" && "items" in value) {
        return [key, (value as { items: unknown[] }).items];
      }
      return [key, value];
    }),
  );
}

/** Derives the columns from metadata, creates the view, returns its rows. */
async function _queryConcept(
  metadata: Readonly<ConceptRelationMetadata>,
): Promise<Array<Record<string, unknown>>> {
  const { attributeColumns } =
    makeConceptAttributeColumnsFromMetadata(metadata);
  return await withDuckDb(async (connection) => {
    await _seed(connection);
    await connection.run(
      buildConceptViewSql({
        viewName: CONCEPT_VIEW,
        spineTableName: SPINE,
        attributeColumns,
      }),
    );
    const reader = await connection.runAndReadAll(
      `SELECT * FROM "${CONCEPT_VIEW}" ORDER BY external_id`,
    );
    return reader.getRowObjects().map(_normalize);
  });
}

const FULL_CONCEPT = _metadata({
  attributes: [PERSON_ID, HOUSEHOLD_ID, AGE, REGION, TAGS, NOTE],
  mappings: [
    PERSON_ID_MAPPING,
    HOUSEHOLD_ID_MAPPING,
    AGE_MAPPING,
    REGION_MAPPING,
    TAGS_MAPPING,
  ],
});

describe("makeConceptAttributeColumnsFromMetadata", () => {
  // The whole point of the step: every attribute resolves against the right
  // dataset through the right key column. Any mistake in the identifier lookup
  // shows up here as a NULL rather than as a wrong shape.
  it("reads every attribute against its own dataset and key column", async () => {
    const rows = await _queryConcept(FULL_CONCEPT);

    expect(rows).toEqual([
      {
        external_id: "101",
        age: 41,
        hh_id: "101",
        note: null,
        person_id: 101,
        region: "North",
        tags: ["blue", "green"],
      },
      {
        external_id: "102",
        age: 50,
        hh_id: "102",
        note: null,
        person_id: 102,
        region: "East",
        tags: ["red"],
      },
      {
        external_id: "103",
        age: null,
        hh_id: null,
        note: null,
        person_id: null,
        region: null,
        tags: [],
      },
    ]);
  });

  // The positive control for the case below: with the numeric-keyed dataset
  // present, an id that is not a number must still resolve rather than abort
  // the query. `CAST(... AS VARCHAR)` on both sides is what makes this
  // possible; a numeric comparison raises a conversion error on 'x-9'.
  it("matches a non-numeric external id against a numeric key column", async () => {
    const { attributeColumns } =
      makeConceptAttributeColumnsFromMetadata(FULL_CONCEPT);

    const rows = await withDuckDb(async (connection) => {
      await _seed(connection);
      await connection.run(`
        CREATE OR REPLACE TABLE "${SPINE}" AS
          SELECT CAST(external_id AS VARCHAR) AS external_id
          FROM (VALUES ('101'), ('x-9')) AS t(external_id);
      `);
      await connection.run(
        buildConceptViewSql({
          viewName: CONCEPT_VIEW,
          spineTableName: SPINE,
          attributeColumns,
        }),
      );
      const reader = await connection.runAndReadAll(
        `SELECT external_id, age FROM "${CONCEPT_VIEW}" ORDER BY external_id`,
      );
      return reader.getRowObjects().map(_normalize);
    });

    expect(rows).toEqual([
      { external_id: "101", age: 41 },
      { external_id: "x-9", age: null },
    ]);
  });

  // The grain claim, asserted as the spec's own one-query proof. `101` is
  // contributed to by both datasets, which is exactly the input that makes the
  // concatenating implementation return two rows for one individual.
  it("keeps one row per individual when two datasets contribute to it", async () => {
    const { attributeColumns } =
      makeConceptAttributeColumnsFromMetadata(FULL_CONCEPT);

    const isGrainIntact = await withDuckDb(async (connection) => {
      await _seed(connection);
      await connection.run(
        buildConceptViewSql({
          viewName: CONCEPT_VIEW,
          spineTableName: SPINE,
          attributeColumns,
        }),
      );
      const reader = await connection.runAndReadAll(
        `SELECT COUNT(*) = COUNT(DISTINCT "external_id") AS is_intact
         FROM "${CONCEPT_VIEW}"`,
      );
      return reader.getRowObjects()[0]?.is_intact;
    });

    expect(isGrainIntact).toBe(true);
  });

  // A dataset that contributes a column but has no identifier attribute mapped
  // into it cannot have its rows matched to an individual. Silently emitting
  // the column would return NULL for every individual, which reads as "no
  // value" rather than as the broken mapping it is.
  it("refuses a dataset with no identifier attribute mapped into it", () => {
    const metadata = _metadata({
      attributes: [HOUSEHOLD_ID, AGE],
      mappings: [HOUSEHOLD_ID_MAPPING, AGE_MAPPING],
    });

    expect(() => {
      return makeConceptAttributeColumnsFromMetadata(metadata);
    }).toThrow(/no identifier attribute mapped into it/);
  });

  // A mapping pointing at a column that no longer exists is a broken ontology.
  // Answering with NULLs would report "no value" for data that may well exist.
  it("refuses a mapping whose dataset column no longer exists", () => {
    const metadata = _metadata({
      attributes: [PERSON_ID, AGE],
      mappings: [PERSON_ID_MAPPING],
    });
    metadata.mappings.push(AGE_MAPPING.mapping);

    expect(() => {
      return makeConceptAttributeColumnsFromMetadata(metadata);
    }).toThrow(/does not exist/);
  });

  // `concept_attributes` has no unique constraint on `(concept_id, name)`, so
  // two attributes of one concept really can share a name, and a view with two
  // identically named columns does not compile. The alphabetically first
  // attribute id keeps the plain name.
  it("suffixes a duplicate attribute name instead of emitting it twice", async () => {
    const duplicate = _attribute({
      name: "age",
      id: "attr-age-2" as ConceptAttribute.Id,
    });
    const duplicateMapping = _mapping({
      attributeName: "age",
      datasetId: DATASET_A,
      columnName: "age_years",
    });
    const metadata = _metadata({
      attributes: [PERSON_ID, AGE, duplicate],
      mappings: [PERSON_ID_MAPPING, AGE_MAPPING],
    });
    metadata.mappings.push({
      ...duplicateMapping.mapping,
      id: "map-age-2" as DatasetColumnMapping["id"],
      conceptAttributeId: duplicate.id,
    });

    const columns = makeConceptAttributeColumnsFromMetadata(metadata);
    const rows = await _queryConcept(metadata);

    expect(columns.renamedColumns).toEqual([
      { attributeId: duplicate.id, requestedName: "age", emittedName: "age_2" },
    ]);
    expect(rows[0]).toEqual({
      external_id: "101",
      age: 41,
      age_2: 41,
      person_id: 101,
    });
  });

  // Only the datasets the emitted columns actually read, de-duplicated and
  // sorted, because the runner merges this into the set of relations to load
  // and the relation cache hashes that set.
  it("reports the contributing datasets, sorted and de-duplicated", () => {
    const columns = makeConceptAttributeColumnsFromMetadata(FULL_CONCEPT);

    expect(columns.contributingDatasetIds).toEqual([DATASET_A, DATASET_B]);
  });

  // A manual-entry attribute must not make the whole concept unqueryable, which
  // is what `getAttributeAssertions` does today. It contributes no dataset.
  it("emits a manual-entry attribute as a column that reads no dataset", () => {
    const columns = makeConceptAttributeColumnsFromMetadata(
      _metadata({ attributes: [NOTE], mappings: [] }),
    );

    expect(columns.attributeColumns).toEqual([
      { kind: "unmapped", attributeName: "note", duckDbDataType: "VARCHAR" },
    ]);
    expect(columns.contributingDatasetIds).toEqual([]);
  });
});
