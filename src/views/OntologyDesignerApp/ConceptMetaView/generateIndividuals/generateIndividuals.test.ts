/**
 * Tests for the DuckDB table `generateIndividuals` stages its rows in.
 *
 * The name is the whole subject here. It used to be the concept's bare id, and
 * a bare UUID in a table name always means a dataset, so the catalog held a
 * table that `RelationRef.fromTableName` read back as a dataset reference for
 * an id that is not a dataset. Every later consumer of that function inherits
 * the hole, and nothing about it is visible in the generated individuals, so
 * only a test on the emitted SQL and on the table's lifetime can hold it.
 */
import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStagingIndividualsTableName } from "@/clients/DuckDbClient/duckDbSqlText";
import { generateIndividuals } from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type {
  DatasetColumnMapping,
  DatasetColumnMappingId,
} from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { BuildableConcept } from "$/models/ontology/Concept/Concept.types";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const {
  runQueryMock,
  forEachQueryPageMock,
  getAllDatasetColumnsMock,
  bulkInsertMock,
} = vi.hoisted(() => {
  return {
    runQueryMock: vi.fn(),
    forEachQueryPageMock: vi.fn(),
    getAllDatasetColumnsMock: vi.fn(),
    bulkInsertMock: vi.fn(),
  };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});
vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { forEachQueryPage: forEachQueryPageMock } };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { getAll: getAllDatasetColumnsMock } };
});
vi.mock("@/clients/ontology/IndividualClient", () => {
  return {
    IndividualClient: { crudFunctions: { bulkInsert: bulkInsertMock } },
  };
});

const WORKSPACE_ID = uuid<Workspace.Id>();
const CONCEPT_ID = uuid<Concept.Id>();
const DATASET_ID = uuid<Dataset.Id>();
const EXTERNAL_ID_COLUMN_ID = uuid<DatasetColumnId>();
const NAME_COLUMN_ID = uuid<DatasetColumnId>();
const STAGING_TABLE = getStagingIndividualsTableName(CONCEPT_ID);

function _makeDatasetColumn(
  id: DatasetColumnId,
  name: string,
): DatasetColumnRead {
  return Model.make("DatasetColumn", {
    id,
    name,
    originalName: name,
    datasetId: DATASET_ID,
    workspaceId: WORKSPACE_ID,
    description: undefined,
    dataType: "varchar" as const,
    detectedDataType: "VARCHAR" as const,
    originalDataType: "VARCHAR",
    columnIdx: 0,
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  });
}

function _makeMapping(args: {
  conceptAttributeId: ConceptAttributeId;
  datasetColumnId: DatasetColumnId;
}): DatasetColumnMapping {
  return {
    id: uuid<DatasetColumnMappingId>(),
    workspaceId: WORKSPACE_ID,
    type: "dataset_column",
    conceptAttributeId: args.conceptAttributeId,
    valuePickerRuleType: "first",
    datasetId: DATASET_ID,
    datasetColumnId: args.datasetColumnId,
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  };
}

/**
 * A concept with the minimum `generateIndividuals` reads: one identifier
 * attribute and one label attribute, each mapped to a dataset column.
 */
function _makeConcept(): BuildableConcept {
  const identifierAttributeId = uuid<ConceptAttributeId>();
  const labelAttributeId = uuid<ConceptAttributeId>();

  const _makeAttribute = (args: {
    id: ConceptAttributeId;
    name: string;
    isIdentifier: boolean;
    isLabel: boolean;
    datasetColumnId: DatasetColumnId;
  }) => {
    return {
      ...Model.make("ConceptAttribute", {
        id: args.id,
        conceptId: CONCEPT_ID,
        workspaceId: WORKSPACE_ID,
        name: args.name,
        description: undefined,
        createdAt: "2026-08-19T00:00:00.000Z",
        updatedAt: "2026-08-19T00:00:00.000Z",
        dataType: "varchar" as const,
        mappingType: "dataset_column" as const,
        isLabel: args.isLabel,
        isIdentifier: args.isIdentifier,
        allowManualEdit: false,
        isArray: false,
      }),
      mapping: _makeMapping({
        conceptAttributeId: args.id,
        datasetColumnId: args.datasetColumnId,
      }),
    };
  };

  return {
    ...Model.make("Concept", {
      id: CONCEPT_ID,
      workspaceId: WORKSPACE_ID,
      ownerId: uuid<UserId>(),
      name: "Person",
      description: undefined,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
      allowManualCreation: false,
    }),
    datasets: [],
    attributes: [
      _makeAttribute({
        id: identifierAttributeId,
        name: "person_id",
        isIdentifier: true,
        isLabel: false,
        datasetColumnId: EXTERNAL_ID_COLUMN_ID,
      }),
      _makeAttribute({
        id: labelAttributeId,
        name: "full_name",
        isIdentifier: false,
        isLabel: true,
        datasetColumnId: NAME_COLUMN_ID,
      }),
    ],
  };
}

/** Every `rawSql` handed to `WorkspaceQuerySession.runQuery`, in call order. */
function _getRunSqlStatements(): string[] {
  return runQueryMock.mock.calls.map((call) => {
    return (call[0] as { rawSql: string }).rawSql;
  });
}

describe("generateIndividuals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllDatasetColumnsMock.mockResolvedValue([
      _makeDatasetColumn(EXTERNAL_ID_COLUMN_ID, "person_id"),
      _makeDatasetColumn(NAME_COLUMN_ID, "full_name"),
    ]);
    forEachQueryPageMock.mockResolvedValue({ numPages: 0, numRows: 0 });
    runQueryMock.mockResolvedValue({ data: [], fields: [], numRows: 0 });
  });

  it("stages the rows under a prefixed table name, never the concept's bare id", async () => {
    await generateIndividuals(_makeConcept());

    const createSql = _getRunSqlStatements()[0]!;
    expect(createSql).toContain(`CREATE TABLE "${STAGING_TABLE}"`);
    // The bare id still appears as the `concept_id` *literal* every staged row
    // carries, so the assertion has to be about the quoted identifier rather
    // than about the id appearing at all.
    expect(createSql).not.toContain(`"${CONCEPT_ID}"`);
  });

  it("names a table that does not read back as a relation reference", async () => {
    // The point of the rename: `fromTableName` resolves a bare UUID to a
    // dataset reference, so the previous name claimed to be a dataset.
    expect(RelationRef.fromTableName(STAGING_TABLE)).toBeUndefined();
    expect(RelationRef.fromTableName(CONCEPT_ID)).toEqual({
      kind: "dataset",
      id: CONCEPT_ID,
    });
  });

  it("pages over the staging table rather than the concept id", async () => {
    await generateIndividuals(_makeConcept());

    expect(forEachQueryPageMock).toHaveBeenCalledTimes(1);
    expect(forEachQueryPageMock.mock.calls[0]![0]).toMatchObject({
      query: { tableName: STAGING_TABLE, castTimestampsToISO: true },
    });
  });

  it("drops the staging table when it finishes", async () => {
    await generateIndividuals(_makeConcept());

    const statements = _getRunSqlStatements();
    expect(statements).toHaveLength(2);
    expect(statements[1]).toBe(`DROP TABLE IF EXISTS "${STAGING_TABLE}";`);
  });

  it("drops the staging table even when the upsert fails", async () => {
    // A table left behind by a failed run would sit in the catalog until the
    // next run of this function, which may never come.
    forEachQueryPageMock.mockRejectedValue(new Error("upsert exploded"));

    await expect(generateIndividuals(_makeConcept())).rejects.toThrow(
      "upsert exploded",
    );

    const statements = _getRunSqlStatements();
    expect(statements).toHaveLength(2);
    expect(statements[1]).toBe(`DROP TABLE IF EXISTS "${STAGING_TABLE}";`);
  });
});
