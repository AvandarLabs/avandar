import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConceptRecordValuesClient } from "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient";
import { MAX_RESTRICTED_EXTERNAL_IDS } from "@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";

const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;
const WORKSPACE_ID = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee" as Workspace.Id;
const AGE_ID = "attr-age" as ConceptAttribute.Id;

const { runQueryMock, getConceptAttributeColumnsMock } = vi.hoisted(() => {
  return {
    runQueryMock: vi.fn(),
    getConceptAttributeColumnsMock: vi.fn(),
  };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

vi.mock(
  "@/clients/qetl/QueryMediator/conceptRelation/getConceptAttributeColumnsFromConceptId",
  () => {
    return {
      getConceptAttributeColumnsFromConceptId: getConceptAttributeColumnsMock,
    };
  },
);

beforeEach(() => {
  vi.clearAllMocks();
  getConceptAttributeColumnsMock.mockResolvedValue({
    attributeColumns: [
      {
        kind: "unmapped",
        attributeId: AGE_ID,
        attributeName: "age",
        duckDbDataType: "BIGINT",
      },
    ],
    contributingDatasetIds: [],
    renamedColumns: [],
  });
  runQueryMock.mockResolvedValue({
    columns: [
      { name: "external_id", dataType: "text" },
      { name: "status", dataType: "text" },
      { name: "age", dataType: "number" },
    ],
    data: [{ external_id: "p1", status: "Active", age: 41 }],
  });
});

describe("ConceptRecordValuesClient.getConceptRecordValues", () => {
  // The keys travel as a restriction, never in the SQL, and each once.
  it("reads the case type's view with its spine restricted to the requested records", async () => {
    await ConceptRecordValuesClient.getConceptRecordValues({
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
      externalIds: ["p1", "p2", "p1"],
    });

    expect(runQueryMock).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
      conceptSpineRestrictions: [
        { conceptId: CONCEPT_ID, externalIds: ["p1", "p2"] },
      ],
    });
  });

  it("returns each record's values keyed by attribute id", async () => {
    const records = await ConceptRecordValuesClient.getConceptRecordValues({
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
      externalIds: ["p1"],
    });

    expect(records).toEqual([
      { externalId: "p1", valuesByAttributeId: { [AGE_ID]: 41 } },
    ]);
  });

  it("reads nothing when no record is requested", async () => {
    const records = await ConceptRecordValuesClient.getConceptRecordValues({
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
      externalIds: [],
    });

    expect(records).toEqual([]);
    expect(runQueryMock).not.toHaveBeenCalled();
    expect(getConceptAttributeColumnsMock).not.toHaveBeenCalled();
  });
});

describe("ConceptRecordValuesClient.getConceptRecordValues guards", () => {
  it("throws when the result's columns are not the columns it read", async () => {
    // A field was added between the two reads, so the view now emits `age`
    // for it and suffixes ours, which the client would file under the wrong
    // field.
    runQueryMock.mockResolvedValue({
      columns: [
        { name: "external_id", dataType: "text" },
        { name: "status", dataType: "text" },
        { name: "age_2", dataType: "number" },
      ],
      data: [{ external_id: "p1", status: "Active", age_2: 41 }],
    });

    await expect(
      ConceptRecordValuesClient.getConceptRecordValues({
        workspaceId: WORKSPACE_ID,
        conceptId: CONCEPT_ID,
        externalIds: ["p1"],
      }),
    ).rejects.toThrow(
      "The case type's fields changed while their values were read. Load them again.",
    );
  });

  it("checks the columns even when no row comes back", async () => {
    runQueryMock.mockResolvedValue({
      columns: [
        { name: "external_id", dataType: "text" },
        { name: "status", dataType: "text" },
      ],
      data: [],
    });

    await expect(
      ConceptRecordValuesClient.getConceptRecordValues({
        workspaceId: WORKSPACE_ID,
        conceptId: CONCEPT_ID,
        externalIds: ["p1"],
      }),
    ).rejects.toThrow("fields changed");
  });

  it("refuses more records than a restriction may name before reading anything", async () => {
    const externalIds = Array.from(
      { length: MAX_RESTRICTED_EXTERNAL_IDS + 1 },
      (_, index) => {
        return `p${index}`;
      },
    );

    await expect(
      ConceptRecordValuesClient.getConceptRecordValues({
        workspaceId: WORKSPACE_ID,
        conceptId: CONCEPT_ID,
        externalIds,
      }),
    ).rejects.toThrow(String(MAX_RESTRICTED_EXTERNAL_IDS));
    expect(getConceptAttributeColumnsMock).not.toHaveBeenCalled();
    expect(runQueryMock).not.toHaveBeenCalled();
  });

  it("counts a repeated key once toward the cap", async () => {
    const externalIds = Array.from(
      { length: MAX_RESTRICTED_EXTERNAL_IDS * 2 },
      () => {
        return "p1";
      },
    );

    await expect(
      ConceptRecordValuesClient.getConceptRecordValues({
        workspaceId: WORKSPACE_ID,
        conceptId: CONCEPT_ID,
        externalIds,
      }),
    ).resolves.toHaveLength(1);
  });
});

describe("ConceptRecordValuesClient.QueryKeys.getConceptRecordValues", () => {
  const baseParams = {
    workspaceId: WORKSPACE_ID,
    conceptId: CONCEPT_ID,
    externalIds: ["p1"],
  };

  // A cached result for one set of records must never answer another set.
  it("differs when the requested records differ", () => {
    const keyFromOneRecord =
      ConceptRecordValuesClient.QueryKeys.getConceptRecordValues(baseParams);
    const keyFromOtherRecord =
      ConceptRecordValuesClient.QueryKeys.getConceptRecordValues({
        ...baseParams,
        externalIds: ["p2"],
      });

    expect(keyFromOneRecord).not.toEqual(keyFromOtherRecord);
  });

  it("includes the workspace, the case type, and the records", () => {
    const queryKey =
      ConceptRecordValuesClient.QueryKeys.getConceptRecordValues(baseParams);

    expect(queryKey).toContainEqual(baseParams);
  });
});
