import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DataDictionaryEntry";
export type DataDictionaryEntryId = UUID<ModelType>;

/** What kind of column an entry describes. */
export type DataDictionaryEntryKind =
  | "categorical"
  | "ordered"
  | "number"
  | "date"
  | "text"
  | "identifier";

/** One kind of column a dictionary describes. */
type DataDictionaryEntryRead = Model.Base<
  ModelType,
  {
    /** The other column names this entry matches, such as GENDER */
    columnNames: string[];

    /** Timestamp of when the entry was created */
    createdAt: string;

    /** What the column means */
    description: string | undefined;

    /** Dictionary this entry belongs to */
    dictionaryId: DataDictionaryId;

    /** Unique identifier of the entry */
    id: DataDictionaryEntryId;

    /** What kind of column this is */
    kind: DataDictionaryEntryKind;

    /** The entry's name, unique per dictionary ignoring case */
    name: string;

    /** Display order within the dictionary, ascending */
    position: number;

    /** Unit of a number entry, such as "years" */
    unit: string | undefined;

    /** Timestamp of when the entry was last updated */
    updatedAt: string;

    /** Highest valid value of a number entry */
    validMax: number | undefined;

    /** Lowest valid value of a number entry */
    validMin: number | undefined;

    /** Workspace this entry belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the DataDictionaryEntry model. */
export type DataDictionaryEntryModel = SupabaseCrudModelSpec<
  {
    tableName: "data_dictionaries__entries";
    modelName: "DataDictionaryEntry";
    modelPrimaryKeyType: DataDictionaryEntryId;
    modelTypes: {
      Read: DataDictionaryEntryRead;
      Insert: SetOptional<
        DataDictionaryEntryRead,
        | "columnNames"
        | "createdAt"
        | "description"
        | "id"
        | "unit"
        | "updatedAt"
        | "validMax"
        | "validMin"
      >;
      Update: Partial<DataDictionaryEntryRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
