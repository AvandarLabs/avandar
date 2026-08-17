import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AttributeMappingType } from "$/models/ontology/AttributeMapping/AttributeMapping.types.ts";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

export type ConceptAttributeId = UUID<"ConceptAttribute">;

type ConceptAttributeRead = Model.Base<
  "ConceptAttribute",
  {
    id: ConceptAttributeId;
    conceptId: ConceptId;
    workspaceId: Workspace.Id;
    name: string;
    description: string | undefined;
    createdAt: string;
    updatedAt: string;
    dataType: AvaDataType.T;
    mappingType: AttributeMappingType;
    isLabel: boolean;
    isIdentifier: boolean;
    allowManualEdit: boolean;
    isArray: boolean;
  }
>;

type ConceptAttributeInsert = SetOptional<
  ConceptAttributeRead,
  "id" | "createdAt" | "updatedAt" | "description"
>;

type ConceptAttributeUpdate = Partial<ConceptAttributeRead>;

export type ConceptAttributeModel = SupabaseCrudModelSpec<
  {
    tableName: "concept_attributes";
    modelName: "ConceptAttribute";
    modelPrimaryKeyType: ConceptAttributeId;
    modelTypes: {
      Read: ConceptAttributeRead;
      Insert: ConceptAttributeInsert;
      Update: ConceptAttributeUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
