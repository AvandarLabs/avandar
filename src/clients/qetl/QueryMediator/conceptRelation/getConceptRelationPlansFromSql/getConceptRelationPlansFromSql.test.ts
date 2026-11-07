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
const ACTIVE_STATUS_ID = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RULED_OUT_STATUS_ID = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const {
  conceptAttributeGetAllMock,
  getAllAttributeMappingsMock,
  datasetColumnGetAllMock,
  individualGetAllMock,
  conceptStatusGetAllMock,
} = vi.hoisted(() => {
  return {
    conceptAttributeGetAllMock: vi.fn(),
    getAllAttributeMappingsMock: vi.fn(),
    datasetColumnGetAllMock: vi.fn(),
    individualGetAllMock: vi.fn(),
    conceptStatusGetAllMock: vi.fn(),
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

vi.mock("@/clients/ontology/ConceptStatusClient", () => {
  return { ConceptStatusClient: { getAll: conceptStatusGetAllMock } };
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
    { id: "ind-1", externalId: "p1", statusId: ACTIVE_STATUS_ID },
    { id: "ind-2", externalId: "p2", statusId: RULED_OUT_STATUS_ID },
  ]);
  conceptStatusGetAllMock.mockResolvedValue([
    { id: ACTIVE_STATUS_ID, name: "Active" },
    { id: RULED_OUT_STATUS_ID, name: "Ruled out" },
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
    expect(conceptStatusGetAllMock).not.toHaveBeenCalled();
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
    expect(
      plans[0]?.spineRows.map((row) => {
        return row.externalId;
      }),
    ).toEqual(["p1", "p2"]);
  });

  // The highest-risk case in this file. Without this a `concept_<uuid>` from
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
    expect(conceptStatusGetAllMock).not.toHaveBeenCalled();
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
  });

  // `generateIndividuals` stages rows with CREATE TABLE AS SELECT from the
  // contributing datasets. That is mutating SQL, but it names no concept
  // relation: treating it as unanalyzable made every Generate Individuals
  // click fail before DuckDB ran.
  it("plans nothing for CREATE TABLE AS SELECT from a dataset", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");
    const allowlist = _permissiveAllowlist();
    const getAllowedConceptIds = vi.fn(allowlist.getAllowedConceptIds);

    const plans = await getConceptRelationPlansFromSql({
      rawSql:
        `DROP TABLE IF EXISTS "ava_staging_individuals_${CONCEPT_ID}";\n` +
        `CREATE TABLE "ava_staging_individuals_${CONCEPT_ID}" AS ` +
        `SELECT * FROM "${DATASET_ID}"`,
      allowlist: { ...allowlist, getAllowedConceptIds },
    });

    expect(plans).toEqual([]);
    expect(getAllowedConceptIds).not.toHaveBeenCalled();
    expect(conceptAttributeGetAllMock).not.toHaveBeenCalled();
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

  it("names each record's status in its spine row", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    const plans = await getConceptRelationPlansFromSql({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
      allowlist: _permissiveAllowlist(),
    });

    expect(plans[0]?.spineRows).toEqual([
      { externalId: "p1", statusName: "Active" },
      { externalId: "p2", statusName: "Ruled out" },
    ]);
    expect(conceptStatusGetAllMock).toHaveBeenCalledTimes(1);
  });

  // The composite foreign key on `individuals` rules this state out, so seeing
  // it means the set was saved between the two reads. A NULL status would
  // misreport the record, so the query fails and a retry sees both agree.
  it("refuses a record whose status is not one of the concept's statuses", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");
    conceptStatusGetAllMock.mockResolvedValue([
      { id: ACTIVE_STATUS_ID, name: "Active" },
    ]);

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        allowlist: _permissiveAllowlist(),
      }),
    ).rejects.toThrow(/is not one of the concept's statuses/);
  });

  // A record page asks for one record. Its spine must hold that record alone,
  // so the view computes one row instead of the whole case type.
  it("loads only the restricted records into the spine", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");
    individualGetAllMock.mockResolvedValue([
      { id: "ind-2", externalId: "p2", statusId: RULED_OUT_STATUS_ID },
    ]);

    const plans = await getConceptRelationPlansFromSql({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
      allowlist: _permissiveAllowlist(),
      conceptSpineRestrictions: [
        { conceptId: CONCEPT_ID, externalIds: ["p2"] },
      ],
    });

    expect(individualGetAllMock).toHaveBeenCalledWith({
      where: { concept_id: { eq: CONCEPT_ID }, external_id: { in: ["p2"] } },
    });
    expect(plans[0]?.spineRows).toEqual([
      { externalId: "p2", statusName: "Ruled out" },
    ]);
  });

  // A restriction on a concept the statement does not read restricts
  // nothing, while its caller believes the records are narrowed.
  it("refuses a restriction on a concept the statement does not read", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        allowlist: _permissiveAllowlist(),
        conceptSpineRestrictions: [
          { conceptId: OTHER_CONCEPT_ID, externalIds: ["p1"] },
        ],
      }),
    ).rejects.toThrow(/which this query does not read/);
    expect(conceptAttributeGetAllMock).not.toHaveBeenCalled();
  });

  it("refuses two restrictions on one concept", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        allowlist: _permissiveAllowlist(),
        conceptSpineRestrictions: [
          { conceptId: CONCEPT_ID, externalIds: ["p1"] },
          { conceptId: CONCEPT_ID, externalIds: ["p2"] },
        ],
      }),
    ).rejects.toThrow(/more than one spine restriction/);
    expect(conceptAttributeGetAllMock).not.toHaveBeenCalled();
  });

  // One restriction costs one Postgres read per 50 keys, so it is bounded.
  it("refuses a restriction naming more records than one query may read", async () => {
    const { getConceptRelationPlansFromSql, MAX_RESTRICTED_EXTERNAL_IDS } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");
    const externalIds = Array.from(
      { length: MAX_RESTRICTED_EXTERNAL_IDS + 1 },
      (_, index) => {
        return `p${index}`;
      },
    );

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        allowlist: _permissiveAllowlist(),
        conceptSpineRestrictions: [{ conceptId: CONCEPT_ID, externalIds }],
      }),
    ).rejects.toThrow(/at most 500 may be named/);
    expect(individualGetAllMock).not.toHaveBeenCalled();
  });
});
