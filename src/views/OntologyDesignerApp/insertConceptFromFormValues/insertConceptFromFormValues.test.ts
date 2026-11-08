import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { insertConceptFromFormValues } from "./insertConceptFromFormValues";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConceptFormSubmitValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

const {
  conceptCreateMock,
  conceptGetByIdMock,
  attributeGetAllMock,
  getAllAttributeMappingsMock,
  datasetGetAllMock,
  generateIndividualsMock,
} = vi.hoisted(() => {
  return {
    conceptCreateMock: vi.fn(),
    conceptGetByIdMock: vi.fn(),
    attributeGetAllMock: vi.fn(),
    getAllAttributeMappingsMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    generateIndividualsMock: vi.fn(),
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      create: conceptCreateMock,
      getById: conceptGetByIdMock,
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      getAll: attributeGetAllMock,
      getAllAttributeMappings: getAllAttributeMappingsMock,
    },
  };
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

const STATUS_ID = uuid<ConceptStatus.Id>();
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
    defaultStatusId: STATUS_ID,
    statuses: [
      { id: STATUS_ID, name: " Active ", description: "", color: "#40c057" },
    ],
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

/** A dataset-column field whose mapping names the `sum` rule. */
function _makeDatasetColumnAttribute(options: {
  baseAttribute: ConceptFormSubmitValues["attributes"][number];
  name: string;
  isArray: boolean;
}): ConceptFormSubmitValues["attributes"][number] {
  const attributeId = uuid<ConceptAttributeId>();
  return {
    ...options.baseAttribute,
    id: attributeId,
    name: options.name,
    dataType: "bigint",
    mappingType: "dataset_column",
    isLabel: false,
    isArray: options.isArray,
    mappings: {
      manualEntry: { type: "manual_entry", conceptAttributeId: attributeId },
      datasetColumn: {
        type: "dataset_column",
        conceptAttributeId: attributeId,
        valuePickerRuleType: "sum",
        datasetId: uuid<Dataset.Id>(),
        datasetColumnId: uuid<DatasetColumn.Id>(),
      },
    },
  };
}

describe("insertConceptFromFormValues", () => {
  beforeEach(() => {
    conceptCreateMock.mockResolvedValue(CONCEPT_ID);
    conceptGetByIdMock.mockResolvedValue({
      id: CONCEPT_ID,
      workspaceId: WORKSPACE_ID,
      name: "Facility",
    });
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

  it("creates the case type with its trimmed statuses, attributes, and mappings in one call", async () => {
    generateIndividualsMock.mockResolvedValue(undefined);

    await insertConceptFromFormValues(_makeFormValues());

    expect(conceptCreateMock).toHaveBeenCalledTimes(1);
    expect(conceptCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        concept: expect.objectContaining({
          id: CONCEPT_ID,
          workspaceId: WORKSPACE_ID,
          defaultStatusId: STATUS_ID,
        }),
        statuses: [
          expect.objectContaining({
            id: STATUS_ID,
            conceptId: CONCEPT_ID,
            workspaceId: WORKSPACE_ID,
            name: "Active",
            description: undefined,
            position: 0,
          }),
        ],
        attributes: [
          expect.objectContaining({
            id: ATTRIBUTE_ID,
            workspaceId: WORKSPACE_ID,
          }),
        ],
        mappings: [
          {
            type: "manual_entry",
            conceptAttributeId: ATTRIBUTE_ID,
            workspaceId: WORKSPACE_ID,
          },
        ],
      }),
    );
  });

  it("rejects without syncing when the case type cannot be created", async () => {
    conceptCreateMock.mockRejectedValue(new Error("refused"));

    await expect(
      insertConceptFromFormValues(_makeFormValues()),
    ).rejects.toThrow("refused");
    expect(generateIndividualsMock).not.toHaveBeenCalled();
  });

  it("writes no value rule for a field that keeps every value, and keeps a single field's rule", async () => {
    generateIndividualsMock.mockResolvedValue(undefined);
    const formValues = _makeFormValues();
    const listAttribute = _makeDatasetColumnAttribute({
      baseAttribute: formValues.attributes[0]!,
      name: "Daily new cases",
      isArray: true,
    });
    const singleAttribute = _makeDatasetColumnAttribute({
      baseAttribute: formValues.attributes[0]!,
      name: "Total cases",
      isArray: false,
    });

    await insertConceptFromFormValues({
      ...formValues,
      attributes: [...formValues.attributes, listAttribute, singleAttribute],
    });

    const [{ mappings }] = conceptCreateMock.mock.calls[0]!;
    const findMapping = (attributeId: string) => {
      return mappings.find((mapping: { conceptAttributeId: string }) => {
        return mapping.conceptAttributeId === attributeId;
      });
    };
    expect(findMapping(listAttribute.id)).toMatchObject({
      type: "dataset_column",
      workspaceId: WORKSPACE_ID,
    });
    expect(findMapping(listAttribute.id).valuePickerRuleType).toBeUndefined();
    expect(findMapping(singleAttribute.id)).toMatchObject({
      type: "dataset_column",
      valuePickerRuleType: "sum",
    });
  });
});
