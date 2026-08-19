/**
 * Tests for the concept relation allowlist and expansion.
 *
 * The allowlist is the security control this lane adds: a concept relation is
 * named `concept_<uuid>` in SQL, and without an intersection against the
 * workspace's own concept ids a concept belonging to another workspace would be
 * planned, loaded and answered from. `assertWorkspaceMembership` does not cover
 * it: that check is principal-level and says nothing about the relations a
 * query names.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;
const OTHER_CONCEPT_ID = "dddddddd-4444-4444-8444-dddddddddddd" as Concept.Id;
const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const WORKSPACE_ID = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";

const {
  conceptAttributeGetAllMock,
  getAllAttributeMappingsMock,
  datasetColumnGetAllMock,
  individualGetAllMock,
} = vi.hoisted(() => {
  return {
    conceptAttributeGetAllMock: vi.fn(),
    getAllAttributeMappingsMock: vi.fn(),
    datasetColumnGetAllMock: vi.fn(),
    individualGetAllMock: vi.fn(),
  };
});

vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      getAll: conceptAttributeGetAllMock,
      getAllAttributeMappings: getAllAttributeMappingsMock,
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { getAll: datasetColumnGetAllMock } };
});

vi.mock("@/clients/ontology/IndividualClient", () => {
  return { IndividualClient: { getAll: individualGetAllMock } };
});

const IDENTIFIER_ATTRIBUTE = {
  __type: "ConceptAttribute",
  id: "attr-person-id" as ConceptAttribute.Id,
  conceptId: CONCEPT_ID,
  workspaceId: WORKSPACE_ID,
  name: "person_id",
  description: undefined,
  createdAt: "2026-08-19T00:00:00Z",
  updatedAt: "2026-08-19T00:00:00Z",
  dataType: "varchar",
  mappingType: "dataset_column",
  isLabel: false,
  isIdentifier: true,
  allowManualEdit: false,
  isArray: false,
} as ConceptAttribute.T;

const IDENTIFIER_MAPPING = {
  id: "map-person-id",
  workspaceId: WORKSPACE_ID,
  type: "dataset_column",
  conceptAttributeId: IDENTIFIER_ATTRIBUTE.id,
  valuePickerRuleType: "first",
  datasetId: DATASET_ID,
  datasetColumnId: "col-person-id",
  createdAt: "2026-08-19T00:00:00Z",
  updatedAt: "2026-08-19T00:00:00Z",
} as DatasetColumnMapping;

const IDENTIFIER_COLUMN = {
  id: "col-person-id",
  name: "person_id",
  datasetId: DATASET_ID,
} as DatasetColumn.T;

/** An allowlist that permits the fixture concept and its dataset. */
function _permissiveAllowlist(): {
  getAllowedConceptIds: () => Promise<Concept.Id[]>;
  getAllowedDatasetIds: () => Promise<Dataset.Id[]>;
} {
  return {
    getAllowedConceptIds: async () => {
      return [CONCEPT_ID];
    },
    getAllowedDatasetIds: async () => {
      return [DATASET_ID];
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  conceptAttributeGetAllMock.mockResolvedValue([IDENTIFIER_ATTRIBUTE]);
  getAllAttributeMappingsMock.mockResolvedValue([IDENTIFIER_MAPPING]);
  datasetColumnGetAllMock.mockResolvedValue([IDENTIFIER_COLUMN]);
  individualGetAllMock.mockResolvedValue([
    { externalId: "p1" },
    { externalId: "p2" },
  ]);
});

describe("getConceptRelationPlansFromSql", () => {
  // Runs on every query the mediator executes, including the several a
  // dashboard fires per column summary. A cutover that added a Postgres read to
  // dataset-only queries would be a regression the old dispatch never had.
  it("reads nothing at all for a statement that names no concept", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");
    const allowlist = _permissiveAllowlist();
    const getAllowedConceptIds = vi.fn(allowlist.getAllowedConceptIds);

    const plans = await getConceptRelationPlansFromSql({
      rawSql: `SELECT * FROM "${DATASET_ID}"`,
      allowlist: { ...allowlist, getAllowedConceptIds },
    });

    expect(plans).toEqual([]);
    expect(getAllowedConceptIds).not.toHaveBeenCalled();
    expect(conceptAttributeGetAllMock).not.toHaveBeenCalled();
    expect(individualGetAllMock).not.toHaveBeenCalled();
  });

  it("plans a concept the caller is allowed to read", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    const plans = await getConceptRelationPlansFromSql({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
      allowlist: _permissiveAllowlist(),
    });

    expect(plans).toHaveLength(1);
    expect(plans[0]?.ref).toEqual({ kind: "concept", id: CONCEPT_ID });
    expect(plans[0]?.contributingDatasetIds).toEqual([DATASET_ID]);
    expect(plans[0]?.externalIds).toEqual(["p1", "p2"]);
  });

  // The highest-risk line in the spec. Without this a `concept_<uuid>` from
  // another workspace is planned and loaded from a session that may not read
  // it.
  it("refuses a concept that does not belong to the caller's workspace", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM "concept_${OTHER_CONCEPT_ID}"`,
        allowlist: _permissiveAllowlist(),
      }),
    ).rejects.toThrow(/does not belong to this workspace/);
    expect(conceptAttributeGetAllMock).not.toHaveBeenCalled();
  });

  // Fail closed on the expansion too. A short contributor list would mean the
  // view binds against a dataset nothing authorized, or against one another
  // workspace's session left behind in the shared catalog.
  it("refuses a concept whose contributing dataset is out of reach", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        allowlist: {
          getAllowedConceptIds: async () => {
            return [CONCEPT_ID];
          },
          getAllowedDatasetIds: async () => {
            return [];
          },
        },
      }),
    ).rejects.toThrow(/not reachable from this workspace/);
    // The individuals are never read either: the refusal comes before the
    // spine.
    expect(individualGetAllMock).not.toHaveBeenCalled();
  });

  // Fail closed on analysis. An unanalyzable statement carries no relation
  // list, and reading a missing list as "names no concept" would let a
  // reference through unauthorized and unloaded.
  it("refuses a statement whose relations cannot be determined", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM mystery_table`,
        allowlist: _permissiveAllowlist(),
      }),
    ).rejects.toThrow(/Cannot determine the concepts this query reads/);
    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `DELETE FROM "${DATASET_ID}"`,
        allowlist: _permissiveAllowlist(),
      }),
    ).rejects.toThrow(/Cannot determine the concepts this query reads/);
  });

  it("plans a concept named twice in one statement only once", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    const plans = await getConceptRelationPlansFromSql({
      rawSql:
        `SELECT * FROM "concept_${CONCEPT_ID}" a ` +
        `JOIN "concept_${CONCEPT_ID}" b ON a.external_id = b.external_id`,
      allowlist: _permissiveAllowlist(),
    });

    expect(plans).toHaveLength(1);
  });
});
