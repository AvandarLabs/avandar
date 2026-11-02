import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { insertConceptFromFormValues } from "./insertConceptFromFormValues";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConceptFormSubmitValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

const {
  conceptInsertMock,
  attributeBulkInsertMock,
  mappingBulkInsertMock,
  attributeGetAllMock,
  getAllAttributeMappingsMock,
  datasetGetAllMock,
  generateIndividualsMock,
} = vi.hoisted(() => {
  return {
    conceptInsertMock: vi.fn(),
    attributeBulkInsertMock: vi.fn(),
    mappingBulkInsertMock: vi.fn(),
    attributeGetAllMock: vi.fn(),
    getAllAttributeMappingsMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    generateIndividualsMock: vi.fn(),
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { insert: conceptInsertMock } };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      bulkInsert: attributeBulkInsertMock,
      getAll: attributeGetAllMock,
      getAllAttributeMappings: getAllAttributeMappingsMock,
    },
  };
});
vi.mock("@/clients/ontology/AttributeMappingClient", () => {
  return { AttributeMappingClient: { bulkInsert: mappingBulkInsertMock } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAll: datasetGetAllMock } };
});
vi.mock(
  "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals",
  () => {
    return {
      generateIndividuals: generateIndividualsMock,
      getAttributesWithMapping: (
        attributes: ReadonlyArray<{ mapping?: unknown }>,
      ) => {
        return attributes.filter((attribute) => {
          return attribute.mapping !== undefined;
        });
      },
    };
  },
);
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn(), log: vi.fn() } };
});

const WORKSPACE_ID = uuid<Workspace.Id>();
const CONCEPT_ID = uuid<Concept.Id>();
const ATTRIBUTE_ID = uuid<ConceptAttributeId>();

function _makeFormValues(): ConceptFormSubmitValues {
  return {
    __type: "Concept",
    id: CONCEPT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Facility",
    description: undefined,
    allowManualCreation: false,
    labelAttributeId: ATTRIBUTE_ID,
    sourceDatasets: [],
    datasetColumnAttributes: [],
    manualEntryAttributes: [],
    attributes: [
      {
        __type: "ConceptAttribute",
        id: ATTRIBUTE_ID,
        conceptId: CONCEPT_ID,
        name: "Facility name",
        description: undefined,
        dataType: "varchar",
        mappingType: "manual_entry",
        isIdentifier: false,
        isLabel: true,
        allowManualEdit: false,
        isArray: false,
        mappings: {
          manualEntry: {
            type: "manual_entry",
            conceptAttributeId: ATTRIBUTE_ID,
          },
          datasetColumn: {
            type: "dataset_column",
            conceptAttributeId: ATTRIBUTE_ID,
            valuePickerRuleType: "most_frequent",
            datasetId: undefined,
            datasetColumnId: undefined,
          },
        },
      },
    ],
  };
}

describe("insertConceptFromFormValues", () => {
  beforeEach(() => {
    conceptInsertMock.mockResolvedValue({
      id: CONCEPT_ID,
      workspaceId: WORKSPACE_ID,
      name: "Facility",
    });
    attributeBulkInsertMock.mockResolvedValue(undefined);
    mappingBulkInsertMock.mockResolvedValue(undefined);
    attributeGetAllMock.mockResolvedValue([
      {
        id: ATTRIBUTE_ID,
        conceptId: CONCEPT_ID,
        mappingType: "manual_entry",
      },
    ]);
    getAllAttributeMappingsMock.mockResolvedValue([
      { type: "manual_entry", conceptAttributeId: ATTRIBUTE_ID },
    ]);
    datasetGetAllMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    JobProgressStore.getAllJobs().forEach(({ id }) => {
      JobProgressStore.finishJob(id);
    });
  });

  it("resolves without waiting for the background sync to finish", async () => {
    let resolveSync: (() => void) | undefined;
    generateIndividualsMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSync = resolve;
      }),
    );

    await insertConceptFromFormValues(_makeFormValues());

    // The three writes are awaited, but the sync they trigger is not: its own
    // chain (re-fetching attributes/mappings, then calling generateIndividuals)
    // still needs its pending microtasks to flush before the mock registers
    // the call, even though the outer insert already resolved.
    await vi.waitFor(() => {
      expect(generateIndividualsMock).toHaveBeenCalledTimes(1);
    });
    resolveSync?.();
  });

  it("logs rather than throws when the background sync rejects", async () => {
    const { Logger } = await import("@/utils/Logger");
    generateIndividualsMock.mockRejectedValue(new Error("sync exploded"));

    await expect(
      insertConceptFromFormValues(_makeFormValues()),
    ).resolves.toBeUndefined();

    await vi.waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          msg: "Failed to auto-sync records for a newly created concept",
        }),
      );
    });
  });
});
