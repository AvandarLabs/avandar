import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types.ts";
import type { ConceptAttributeModel } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { ObjectPaths, UUID } from "@avandar/utils";
import type { SetOptional, SetRequiredDeep, Simplify } from "type-fest";

type ModelType = "Concept";
export type ConceptId = UUID<ModelType>;

/**
 * A named concept: one class of individuals, and the terminology that
 * defines it. Concepts are the elements of a workspace's TBox.
 */
type ConceptRead = Model.Base<
  ModelType,
  {
    /** Unique identifier for this concept */
    id: ConceptId;

    /** Workspace ID this concept belongs to */
    workspaceId: Workspace.Id;

    /** User ID of the owner of this concept */
    ownerId: UserId;

    /** Display name of the concept */
    name: string;

    /** Optional description of what this concept represents */
    description: string | undefined;

    /** Timestamp when this concept was created */
    createdAt: string;

    /** Timestamp when this concept was last updated */
    updatedAt: string;

    /** Whether users can manually create individuals of this concept */
    allowManualCreation: boolean;
  }
>;

type ConceptInsert = SetOptional<
  ConceptRead,
  "id" | "ownerId" | "description" | "createdAt" | "updatedAt"
>;

type ConceptUpdate = Partial<ConceptInsert>;

type ConceptFull = ConceptRead & {
  datasets?: Array<DatasetModel["Read"]>;
  attributes?: ReadonlyArray<
    ConceptAttributeModel["Read"] & {
      mapping?: AttributeMapping;
    }
  >;
};

/**
 * CRUD type definitions for the Concept model.
 */
export type ConceptModel = SupabaseCrudModelSpec<
  {
    tableName: "concepts";
    modelName: "Concept";
    modelPrimaryKeyType: ConceptId;
    modelTypes: {
      Read: ConceptRead;
      Insert: ConceptInsert;
      Update: ConceptUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  },
  {
    Full: ConceptFull;
  }
>;

export type ConceptWith<Keys extends ObjectPaths<ConceptModel["Full"]>> =
  Simplify<SetRequiredDeep<ConceptModel["Full"], Keys>>;

export type BuildableConcept = ConceptWith<
  "datasets" | "attributes" | `attributes.${number}.mapping`
>;

export type BuildableAttribute = BuildableConcept["attributes"][number];
