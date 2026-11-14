import type { CrosswalkId } from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type { CrosswalkLayoutId } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "CrosswalkDataset";
export type CrosswalkDatasetId = UUID<ModelType>;

/** One dataset's membership in a crosswalk, through the layout it matches. */
type CrosswalkDatasetRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dataset joined the crosswalk */
    createdAt: string;

    /** Crosswalk the dataset belongs to */
    crosswalkId: CrosswalkId;

    /** The dataset */
    datasetId: Dataset.Id;

    /** Unique identifier of the membership */
    id: CrosswalkDatasetId;

    /** The layout whose column names the dataset has */
    layoutId: CrosswalkLayoutId;

    /** Workspace this membership belongs to, always its crosswalk's */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the CrosswalkDataset model. */
export type CrosswalkDatasetModel = SupabaseCrudModelSpec<
  {
    tableName: "crosswalks__datasets";
    modelName: "CrosswalkDataset";
    modelPrimaryKeyType: CrosswalkDatasetId;
    modelTypes: {
      Read: CrosswalkDatasetRead;
      Insert: SetOptional<CrosswalkDatasetRead, "createdAt" | "id">;
      Update: Partial<CrosswalkDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
