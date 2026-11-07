import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "ConceptStatus";
export type ConceptStatusId = UUID<ModelType>;

/**
 * One status a case type's records can be in. Each case type owns an ordered
 * set and names one of them as the default for new records.
 */
type ConceptStatusRead = Model.Base<
  ModelType,
  {
    /** Unique identifier for this status */
    id: ConceptStatusId;

    /** Workspace this status belongs to */
    workspaceId: Workspace.Id;

    /** Case type this status belongs to */
    conceptId: ConceptId;

    /** Display name, unique per case type ignoring case */
    name: string;

    /** What the status means, shown to the people working the records */
    description: string | undefined;

    /** Display color as lowercase `#rrggbb` */
    color: string;

    /** Display order within the case type, ascending */
    position: number;

    /** Timestamp when this status was created */
    createdAt: string;

    /** Timestamp when this status was last updated */
    updatedAt: string;
  }
>;

type ConceptStatusInsert = SetOptional<
  ConceptStatusRead,
  "id" | "description" | "createdAt" | "updatedAt"
>;

type ConceptStatusUpdate = Partial<ConceptStatusInsert>;

/**
 * CRUD type definitions for the ConceptStatus model.
 */
export type ConceptStatusModel = SupabaseCrudModelSpec<
  {
    tableName: "concept_statuses";
    modelName: "ConceptStatus";
    modelPrimaryKeyType: ConceptStatusId;
    modelTypes: {
      Read: ConceptStatusRead;
      Insert: ConceptStatusInsert;
      Update: ConceptStatusUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

/** The palette swatch a status color comes from. */
export type ConceptStatusColorKey =
  | "neutral"
  | "green"
  | "blue"
  | "teal"
  | "yellow"
  | "orange"
  | "red"
  | "grape";

/**
 * A status while someone edits a status set, before it is saved. Its
 * position is its index in the set.
 */
export type ConceptStatusDraft = {
  id: ConceptStatusId;
  name: string;
  description: string;
  color: string;
};

/** A status set being edited, with the status new records start in. */
export type ConceptStatusSetValue = {
  statuses: readonly ConceptStatusDraft[];
  defaultStatusId: ConceptStatusId | undefined;
};

/** One reason a status set cannot be saved yet. */
export type ConceptStatusSetIssue =
  | { type: "empty_set" }
  | { type: "name_required"; statusId: ConceptStatusId }
  | { type: "name_not_unique"; statusId: ConceptStatusId }
  | { type: "default_required" }
  | { type: "replacement_required"; statusId: ConceptStatusId };

/** The arguments of `rpc_concept_statuses__save`, in model shape. */
export type ConceptStatusSavePayload = {
  conceptId: ConceptId;
  statuses: Array<{
    id: ConceptStatusId;
    name: string;
    description: string | undefined;
    color: string;
    position: number;
  }>;
  defaultStatusId: ConceptStatusId;
  replacements: Partial<Record<ConceptStatusId, ConceptStatusId>>;
};

/** The stable `hint` values `rpc_concept_statuses__save` raises with. */
export type ConceptStatusSaveErrorHint =
  | "case_types_editor_required"
  | "status_set_empty"
  | "status_name_required"
  | "status_names_not_unique"
  | "status_color_invalid"
  | "status_not_in_case_type"
  | "status_default_not_in_set"
  | "status_replacement_required"
  | "status_replacement_not_in_set";
