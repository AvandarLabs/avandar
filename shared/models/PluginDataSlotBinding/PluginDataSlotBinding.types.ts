import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

/** Identifies a data slot binding. */
export type PluginDataSlotBindingId = UUID<"PluginDataSlotBinding">;

/**
 * What kind of workspace record a data slot reads: a case type (`concept`)
 * or a dataset. Mirrors the `plugin_data_slot_bindings__source_type`
 * database enum.
 */
export type PluginDataSlotBindingSourceType =
  Enums<"plugin_data_slot_bindings__source_type">;

/**
 * Which workspace records one installed plugin's data slot reads, and which
 * field fills each slot attribute. A plugin command reads the records
 * through it with `avandar.data.querySlot`.
 */
export type PluginDataSlotBindingRead = Model.Base<
  "PluginDataSlotBinding",
  {
    /**
     * Slot attribute key to the case type attribute id or the dataset column
     * id that fills it. An attribute with no entry is unmapped.
     */
    attributeMap: Record<string, string>;

    /** User who last bound the slot, if that user still exists. */
    boundBy: User.Id | undefined;

    /**
     * The case type the slot reads. Undefined unless `sourceType` is
     * `concept`, and undefined again once that case type is deleted.
     */
    conceptId: Concept.Id | undefined;

    /** Timestamp of when the slot was first bound. */
    createdAt: string;

    /**
     * The dataset the slot reads. Undefined unless `sourceType` is
     * `dataset`, and undefined again once that dataset is deleted.
     */
    datasetId: Dataset.Id | undefined;

    /** The binding's unique identifier. */
    id: PluginDataSlotBindingId;

    /** The plugin install this binding belongs to. */
    installationId: PluginInstallation.Id;

    /** The manifest's data slot id, e.g. `cases`. */
    slotId: string;

    /** Whether the slot reads a case type or a dataset. */
    sourceType: PluginDataSlotBindingSourceType;

    /** Timestamp of the last change to this binding. */
    updatedAt: string;

    /** Workspace of the binding, always the install's workspace. */
    workspaceId: Workspace.Id;
  }
>;

/**
 * One slot's binding as an admin chose it, before it is saved. The install
 * wizard collects one per bound slot, and the plugin card in Settings saves
 * one when a slot is rebound.
 */
export type PluginDataSlotBindingDraft = Pick<
  PluginDataSlotBindingRead,
  "attributeMap" | "conceptId" | "datasetId" | "slotId" | "sourceType"
>;

type PluginDataSlotBindingCrudSpec = {
  tableName: "plugin_data_slot_bindings";
  modelName: "PluginDataSlotBinding";
  modelPrimaryKeyType: PluginDataSlotBindingId;
  modelTypes: {
    Read: PluginDataSlotBindingRead;
    Insert: SetOptional<
      PluginDataSlotBindingRead,
      | "attributeMap"
      | "boundBy"
      | "conceptId"
      | "createdAt"
      | "datasetId"
      | "id"
      | "updatedAt"
    >;
    Update: Partial<PluginDataSlotBindingRead>;
  };
};

/** CRUD type definitions for the PluginDataSlotBinding model. */
export type PluginDataSlotBindingModel = SupabaseCrudModelSpec<
  PluginDataSlotBindingCrudSpec,
  { dbTablePrimaryKey: "id" }
>;
