import type { CrosswalkId } from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type { CrosswalkColumnId } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.types.ts";
import type { CrosswalkLayoutId } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.types.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "CrosswalkMapping";
export type CrosswalkMappingId = UUID<ModelType>;

/** Whether a mapping is a guess the user has not confirmed yet. */
export type CrosswalkMappingStatus = Enums<"crosswalks__mapping_status">;

/**
 * Why a suggested mapping was made: matching names and types, matching
 * values, carried over from a similar layout, or the AI's reading of what
 * the columns mean.
 */
export type CrosswalkMappingReason = Enums<"crosswalks__mapping_reason">;

/** A change applied to a source column's values before they are cast. */
export type CrosswalkConvert =
  | { kind: "parse_date"; format: string }
  | { kind: "pad_text"; length: number }
  | { kind: "multiply"; factor: number }
  | { kind: "trim_and_fix_case"; letterCase: "keep" | "lower" | "upper" };

/**
 * How one column of the combined dataset is filled for one layout. A
 * `column` fill either converts (`convert`) or translates codes through a
 * code list (`codeListId`), never both. `holdsLabels` says the source holds
 * the list's labels rather than its codes. An `expression` names columns as
 * `{column name}` placeholders.
 */
export type CrosswalkFill =
  | {
      kind: "column";
      sourceColumn: string;
      convert: CrosswalkConvert | undefined;
      codeListId: DataDictionaryCodeList.Id | undefined;
      holdsLabels: boolean;
    }
  | { kind: "constant"; value: string }
  | { kind: "expression"; sql: string }
  | { kind: "empty" };

/** How one column of the combined dataset is filled for one layout. */
type CrosswalkMappingRead = Model.Base<
  ModelType,
  {
    /** The column of the combined dataset this mapping fills */
    columnId: CrosswalkColumnId;

    /** How sure a suggestion was, from 0 to 1. Undefined when set by hand. */
    confidence: number | undefined;

    /** Timestamp of when the mapping was created */
    createdAt: string;

    /** Crosswalk this mapping belongs to */
    crosswalkId: CrosswalkId;

    /** How the column is filled */
    fill: CrosswalkFill;

    /** Unique identifier of the mapping */
    id: CrosswalkMappingId;

    /** The layout whose datasets this mapping reads */
    layoutId: CrosswalkLayoutId;

    /** Why the mapping was suggested. Undefined when set by hand. */
    reason: CrosswalkMappingReason | undefined;

    /** Whether the user has confirmed the mapping */
    status: CrosswalkMappingStatus;

    /** Timestamp of when the mapping was last updated */
    updatedAt: string;

    /** Workspace this mapping belongs to, always its crosswalk's */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the CrosswalkMapping model. */
export type CrosswalkMappingModel = SupabaseCrudModelSpec<
  {
    tableName: "crosswalks__mappings";
    modelName: "CrosswalkMapping";
    modelPrimaryKeyType: CrosswalkMappingId;
    modelTypes: {
      Read: CrosswalkMappingRead;
      Insert: SetOptional<
        CrosswalkMappingRead,
        "confidence" | "createdAt" | "id" | "reason" | "status" | "updatedAt"
      >;
      Update: Partial<CrosswalkMappingRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
