import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { rpc: rpcMock };
      },
    },
  };
});

const { ConceptClient } = await import("./ConceptClient");

const WORKSPACE_ID = uuid<Workspace.Id>();
const CONCEPT_ID = uuid<Concept.Id>();
const STATUS_ID = uuid<ConceptStatus.Id>();
const LABEL_ATTRIBUTE_ID = uuid<ConceptAttribute.Id>();
const KEY_ATTRIBUTE_ID = uuid<ConceptAttribute.Id>();
const DATASET_ID = uuid<DatasetId>();
const COLUMN_ID = uuid<DatasetColumnId>();

function _makeAttribute(options: {
  id: ConceptAttribute.Id;
  mappingType: "manual_entry" | "dataset_column";
  isLabel: boolean;
}): ConceptAttribute.T<"Insert"> {
  return Model.make("ConceptAttribute", {
    id: options.id,
    workspaceId: WORKSPACE_ID,
    conceptId: CONCEPT_ID,
    name: options.isLabel ? "Name" : "Key",
    description: undefined,
    dataType: "varchar",
    mappingType: options.mappingType,
    isIdentifier: !options.isLabel,
    isLabel: options.isLabel,
    allowManualEdit: false,
    isArray: false,
  });
}

describe("ConceptClient.create", () => {
  it("sends the case type, its statuses, attributes, and each mapping kind as database rows", async () => {
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: CONCEPT_ID });
      },
    });
    // The form's extra fields ride along and must be stripped.
    const concept = Model.make("Concept", {
      id: CONCEPT_ID,
      workspaceId: WORKSPACE_ID,
      name: "Cholera case",
      description: undefined,
      allowManualCreation: false,
      defaultStatusId: STATUS_ID,
      labelAttributeId: LABEL_ATTRIBUTE_ID,
    });
    const mappings: Array<AttributeMapping<"Insert">> = [
      {
        type: "manual_entry",
        conceptAttributeId: LABEL_ATTRIBUTE_ID,
        workspaceId: WORKSPACE_ID,
      },
      {
        type: "dataset_column",
        conceptAttributeId: KEY_ATTRIBUTE_ID,
        workspaceId: WORKSPACE_ID,
        valuePickerRuleType: "most_frequent",
        datasetId: DATASET_ID,
        datasetColumnId: COLUMN_ID,
      },
    ];

    const conceptId = await ConceptClient.create({
      concept,
      statuses: [
        Model.make("ConceptStatus", {
          id: STATUS_ID,
          workspaceId: WORKSPACE_ID,
          conceptId: CONCEPT_ID,
          name: "Active",
          description: undefined,
          color: "#40c057",
          position: 0,
        }),
      ],
      attributes: [
        _makeAttribute({
          id: LABEL_ATTRIBUTE_ID,
          mappingType: "manual_entry",
          isLabel: true,
        }),
        _makeAttribute({
          id: KEY_ATTRIBUTE_ID,
          mappingType: "dataset_column",
          isLabel: false,
        }),
      ],
      mappings,
    });

    expect(conceptId).toBe(CONCEPT_ID);
    const [rpcName, args] = rpcMock.mock.calls[0]!;
    expect(rpcName).toBe("rpc_concepts__create");
    expect(args.p_concept).toMatchObject({
      id: CONCEPT_ID,
      default_status_id: STATUS_ID,
    });
    expect(args.p_concept).not.toHaveProperty("label_attribute_id");
    expect(args.p_statuses).toEqual([
      expect.objectContaining({
        id: STATUS_ID,
        concept_id: CONCEPT_ID,
        name: "Active",
        description: null,
        position: 0,
      }),
    ]);
    expect(args.p_attributes).toHaveLength(2);
    expect(args.p_manual_entry_mappings).toEqual([
      { concept_attribute_id: LABEL_ATTRIBUTE_ID, workspace_id: WORKSPACE_ID },
    ]);
    expect(args.p_dataset_column_mappings).toEqual([
      expect.objectContaining({
        concept_attribute_id: KEY_ATTRIBUTE_ID,
        dataset_id: DATASET_ID,
        dataset_column_id: COLUMN_ID,
        value_picker_rule_type: "most_frequent",
      }),
    ]);
  });
});
