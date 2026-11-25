import type { CrosswalkId } from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "CrosswalkColumn";
export type CrosswalkColumnId = UUID<ModelType>;

/** One column of a crosswalk's combined dataset. */
type CrosswalkColumnRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the column was created */
    createdAt: string;

    /** Crosswalk this column belongs to */
    crosswalkId: CrosswalkId;

    /** The type the combined dataset casts this column to */
    dataType: AvaDataType.T;

    /** The dictionary entry governing this column's codes, if any */
    entryId: DataDictionaryEntry.Id | undefined;

    /** Unique identifier of the column */
    id: CrosswalkColumnId;

    /** The column's name, unique per crosswalk ignoring case */
    name: string;

    /** Order in the combined dataset, ascending from 0 */
    position: number;

    /** Timestamp of when the column was last updated */
    updatedAt: string;

    /** Workspace this column belongs to, always its crosswalk's */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the CrosswalkColumn model. */
export type CrosswalkColumnModel = SupabaseCrudModelSpec<
  {
    tableName: "crosswalks__columns";
    modelName: "CrosswalkColumn";
    modelPrimaryKeyType: CrosswalkColumnId;
    modelTypes: {
      Read: CrosswalkColumnRead;
      Insert: SetOptional<
        CrosswalkColumnRead,
        "createdAt" | "entryId" | "id" | "updatedAt"
      >;
      Update: Partial<CrosswalkColumnRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
