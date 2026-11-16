import type { CrosswalkId } from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "CrosswalkLayout";
export type CrosswalkLayoutId = UUID<ModelType>;

/**
 * How far a layout's mapping has come: `to_do` (not every column filled),
 * `review` (filled, not confirmed), `mapped`, or `skipped` (left out of the
 * combined dataset).
 */
export type CrosswalkLayoutStatus = Enums<"crosswalks__layout_status">;

/**
 * One set of column names in a crosswalk. Every dataset with these names,
 * ignoring case and order, is mapped once, through this layout.
 */
type CrosswalkLayoutRead = Model.Base<
  ModelType,
  {
    /** The first dataset's column names, in its column order */
    columnNames: string[];

    /** Timestamp of when the layout was created */
    createdAt: string;

    /** Crosswalk this layout belongs to */
    crosswalkId: CrosswalkId;

    /** Unique identifier of the layout */
    id: CrosswalkLayoutId;

    /** Whether the combined dataset's columns come from this layout */
    isReference: boolean;

    /** A hash of the normalized column names, unique per crosswalk */
    signature: string;

    /** How far this layout's mapping has come */
    status: CrosswalkLayoutStatus;

    /** Timestamp of when the layout was last updated */
    updatedAt: string;

    /** Workspace this layout belongs to, always its crosswalk's */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the CrosswalkLayout model. */
export type CrosswalkLayoutModel = SupabaseCrudModelSpec<
  {
    tableName: "crosswalks__layouts";
    modelName: "CrosswalkLayout";
    modelPrimaryKeyType: CrosswalkLayoutId;
    modelTypes: {
      Read: CrosswalkLayoutRead;
      Insert: SetOptional<
        CrosswalkLayoutRead,
        "createdAt" | "id" | "isReference" | "status" | "updatedAt"
      >;
      Update: Partial<CrosswalkLayoutRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

/** A dataset as layouts see it: its name and its columns in column order. */
export type CrosswalkLayoutDataset = {
  id: Dataset.Id;
  name: string;
  columns: ReadonlyArray<{ name: string; dataType: AvaDataType.T }>;
};

/** Datasets that share one set of column names. */
export type CrosswalkLayoutGroup = {
  /** `CrosswalkLayout.buildLayoutKey` of the shared column names */
  key: string;
  signature: string;
  /** The first dataset's (by name) column names, in its column order. */
  columnNames: string[];
  /** Sorted by dataset name. */
  datasetIds: Dataset.Id[];
};
