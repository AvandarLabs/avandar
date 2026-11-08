import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { buildConceptViewSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import { makeConceptAttributeColumnsFromMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
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
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptRelationMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import type { DuckDBConnection } from "@duckdb/node-api";

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
    // The column's Ava type. `bigint` by default, a type every rule allows,
    // so a fixture names one only when its test is about the type.
    columnDataType?: AvaDataType.T;
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
      dataType: options.columnDataType ?? "bigint",
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
      SELECT
        CAST(external_id AS VARCHAR) AS external_id,
        CAST(status AS VARCHAR) AS status
      FROM (VALUES ('101', 'Active'), ('102', 'Active'), ('103', 'Inactive'))
        AS t(external_id, status);
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
        status: "Active",
        age: 41,
        hh_id: "101",
        note: null,
        person_id: 101,
        region: "North",
        tags: ["blue", "green"],
      },
      {
        external_id: "102",
        status: "Active",
        age: 50,
        hh_id: "102",
        note: null,
        person_id: 102,
        region: "East",
        tags: ["red"],
      },
      {
        external_id: "103",
        status: "Inactive",
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
          SELECT
            CAST(external_id AS VARCHAR) AS external_id,
            CAST(status AS VARCHAR) AS status
          FROM (VALUES ('101', 'Active'), ('x-9', 'Active'))
            AS t(external_id, status);
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

  // The grain claim, asserted with a single query. `101` is
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

  // A field that keeps one value needs a rule to pick it. Guessing one would
  // answer with a value nobody chose, so the planner refuses the concept,
  // naming the field.
  it("refuses a single-value attribute whose mapping names no value rule", () => {
    const metadata = _metadata({
      attributes: [PERSON_ID, AGE],
      mappings: [
        PERSON_ID_MAPPING,
        {
          ...AGE_MAPPING,
          mapping: { ...AGE_MAPPING.mapping, valuePickerRuleType: undefined },
        },
      ],
    });

    expect(() => {
      return makeConceptAttributeColumnsFromMetadata(metadata);
    }).toThrow(/'age'.*names no value rule/);
  });

  // A list field created before lists stored no rule still has one. Its
  // column carries none, so the view keeps every value.
  it("drops the stored rule of a list attribute from its column", () => {
    const metadata = _metadata({
      attributes: [PERSON_ID, TAGS],
      mappings: [
        PERSON_ID_MAPPING,
        {
          ...TAGS_MAPPING,
          mapping: { ...TAGS_MAPPING.mapping, valuePickerRuleType: "sum" },
        },
      ],
    });

    const tags = makeConceptAttributeColumnsFromMetadata(
      metadata,
    ).attributeColumns.find((column) => {
      return column.attributeName === "tags";
    });

    expect(tags).toMatchObject({ kind: "dataset_column", valueShape: "list" });
    expect(tags).not.toHaveProperty("valuePickerRuleType");
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
      status: "Active",
      age: 41,
      age_2: 41,
      person_id: 101,
    });
  });

  // A reader maps a view column back to its attribute. Two attributes can
  // share a name, so mapping by name would hand one attribute's value to the
  // other once the second is suffixed.
  it("names each column's attribute by id, through a duplicate-name suffix", () => {
    const duplicate = _attribute({
      name: "age",
      id: "attr-age-2" as ConceptAttribute.Id,
    });
    const metadata = _metadata({
      attributes: [PERSON_ID, AGE, duplicate],
      mappings: [PERSON_ID_MAPPING, AGE_MAPPING],
    });
    metadata.mappings.push({
      ...AGE_MAPPING.mapping,
      id: "map-age-2" as DatasetColumnMapping["id"],
      conceptAttributeId: duplicate.id,
    });

    const { attributeColumns } =
      makeConceptAttributeColumnsFromMetadata(metadata);

    expect(
      attributeColumns.map((column) => {
        return [column.attributeName, column.attributeId];
      }),
    ).toEqual([
      ["age", AGE.id],
      ["age_2", duplicate.id],
      ["person_id", PERSON_ID.id],
    ]);
  });

  // `external_id` is the view's record key, read from the spine, and a common
  // key column name. An attribute of that name is suffixed rather than
  // dropped, so it still has a column.
  it("suffixes an attribute named external_id so the record key keeps its name", async () => {
    const keyAttribute = _attribute({
      name: "external_id",
      isIdentifier: true,
    });
    const keyMapping = _mapping({
      attributeName: "external_id",
      datasetId: DATASET_A,
      columnName: "person_id",
    });

    const rows = await _queryConcept(
      _metadata({
        attributes: [keyAttribute, AGE],
        mappings: [keyMapping, AGE_MAPPING],
      }),
    );

    expect(rows[0]).toEqual({
      external_id: "101",
      status: "Active",
      age: 41,
      external_id_2: 101,
    });
  });

  // DuckDB column names are case-insensitive, so a name that differs from a
  // reserved column only by case would be renamed by DuckDB itself, and the
  // emitted name would no longer match the view's real column.
  it("suffixes an attribute named EXTERNAL_ID, since column names ignore case", async () => {
    const keyAttribute = _attribute({
      name: "EXTERNAL_ID",
      isIdentifier: true,
    });
    const keyMapping = _mapping({
      attributeName: "EXTERNAL_ID",
      datasetId: DATASET_A,
      columnName: "person_id",
    });
    const metadata = _metadata({
      attributes: [keyAttribute, AGE],
      mappings: [keyMapping, AGE_MAPPING],
    });

    const { attributeColumns } =
      makeConceptAttributeColumnsFromMetadata(metadata);
    const rows = await _queryConcept(metadata);

    expect(
      attributeColumns.map((column) => {
        return column.attributeName;
      }),
    ).toEqual(["age", "EXTERNAL_ID_2"]);
    expect(rows[0]).toEqual({
      external_id: "101",
      status: "Active",
      age: 41,
      EXTERNAL_ID_2: 101,
    });
  });

  // Two attribute names that differ only by case are one name to DuckDB, so
  // the later one is suffixed and its original casing is kept.
  it("suffixes attribute names that differ only by case", async () => {
    const upperAge = _attribute({
      name: "Age",
      id: "attr-Age" as ConceptAttribute.Id,
    });
    const upperAgeMapping = _mapping({
      attributeName: "Age",
      datasetId: DATASET_A,
      columnName: "age_years",
    });
    const metadata = _metadata({
      attributes: [PERSON_ID, AGE, upperAge],
      mappings: [PERSON_ID_MAPPING, AGE_MAPPING, upperAgeMapping],
    });

    const { attributeColumns } =
      makeConceptAttributeColumnsFromMetadata(metadata);
    const rows = await _queryConcept(metadata);

    expect(
      attributeColumns.map((column) => {
        return column.attributeName;
      }),
    ).toEqual(["age", "Age_2", "person_id"]);
    expect(rows[0]).toEqual({
      external_id: "101",
      status: "Active",
      age: 41,
      Age_2: 41,
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

  // A manual-entry attribute must not make the whole concept unqueryable. It
  // contributes no dataset.
  it("emits a manual-entry attribute as a column that reads no dataset", () => {
    const columns = makeConceptAttributeColumnsFromMetadata(
      _metadata({ attributes: [NOTE], mappings: [] }),
    );

    expect(columns.attributeColumns).toEqual([
      {
        kind: "unmapped",
        attributeId: NOTE.id,
        attributeName: "note",
        duckDbDataType: "VARCHAR",
        valueShape: "single",
      },
    ]);
    expect(columns.contributingDatasetIds).toEqual([]);
  });

  // `status` belongs to the built-in column the view reads from the spine. An
  // attribute of that name is suffixed, so both survive and neither shadows
  // the other.
  it("suffixes an attribute named status so the built-in status keeps its name", async () => {
    const statusAttribute = _attribute({
      name: "status",
      mappingType: "manual_entry",
    });
    const metadata = _metadata({
      attributes: [PERSON_ID, statusAttribute],
      mappings: [PERSON_ID_MAPPING],
    });

    const columns = makeConceptAttributeColumnsFromMetadata(metadata);
    const rows = await _queryConcept(metadata);

    expect(columns.renamedColumns).toEqual([
      {
        attributeId: statusAttribute.id,
        requestedName: "status",
        emittedName: "status_2",
      },
    ]);
    expect(rows[0]).toEqual({
      external_id: "101",
      status: "Active",
      status_2: null,
      person_id: 101,
    });
  });

  // A column whose type was changed after the field was made can leave a rule
  // the new type does not allow. DuckDB would refuse the whole view with an
  // error that names neither the field nor the rule.
  it("refuses a sum over a text column", () => {
    const total = _attribute({ name: "total", dataType: "double" });
    const metadata = _metadata({
      attributes: [PERSON_ID, total],
      mappings: [
        PERSON_ID_MAPPING,
        _mapping({
          attributeName: "total",
          datasetId: DATASET_A,
          columnName: "tag",
          ruleType: "sum",
          columnDataType: "varchar",
        }),
      ],
    });

    expect(() => {
      return makeConceptAttributeColumnsFromMetadata(metadata);
    }).toThrow(
      /Concept attribute 'total' .* applies 'sum' to dataset column 'tag', whose type 'varchar' does not allow it/,
    );
  });

  // A list field keeps every value and applies no rule, so the rule its
  // mapping happens to store cannot break it.
  it("reads a list field whose mapping stores a rule its column type does not allow", async () => {
    const metadata = _metadata({
      attributes: [PERSON_ID, TAGS],
      mappings: [
        PERSON_ID_MAPPING,
        _mapping({
          attributeName: "tags",
          datasetId: DATASET_A,
          columnName: "tag",
          ruleType: "sum",
          columnDataType: "varchar",
        }),
      ],
    });

    const rows = await _queryConcept(metadata);

    expect(
      rows.map((row) => {
        return row.tags;
      }),
    ).toEqual([["blue", "green"], ["red"], []]);
  });
});
