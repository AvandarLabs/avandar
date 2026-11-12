import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DataDictionaryCodeList";
export type DataDictionaryCodeListId = UUID<ModelType>;

/**
 * One value in a code list. It works both ways: data holding `code`
 * decodes to `label`, and data holding `label` or any of
 * `acceptedSpellings` encodes to `code`.
 */
export type CodePair = {
  /** The value as stored in coded data, such as "1" or "M". */
  code: string;

  /** What the code means, such as "Male". */
  label: string;

  /** Other spellings that also encode to `code`, such as "man". */
  acceptedSpellings: string[];

  /** Whether this value stands for a missing answer, such as "Unknown". */
  isMissing: boolean;
};

/** A named, ordered list of code pairs in a dictionary. */
type DataDictionaryCodeListRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the code list was created */
    createdAt: string;

    /** Dictionary this code list belongs to */
    dictionaryId: DataDictionaryId;

    /** Unique identifier of the code list */
    id: DataDictionaryCodeListId;

    /** Whether the pairs are levels of a scale, kept in order in charts */
    isOrdered: boolean;

    /** Name of the code list, such as "Sex (1/2/9)" */
    name: string;

    /** The pairs, in display order */
    pairs: CodePair[];

    /** Timestamp of when the code list was last updated */
    updatedAt: string;

    /** Workspace this code list belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the DataDictionaryCodeList model. */
export type DataDictionaryCodeListModel = SupabaseCrudModelSpec<
  {
    tableName: "data_dictionaries__code_lists";
    modelName: "DataDictionaryCodeList";
    modelPrimaryKeyType: DataDictionaryCodeListId;
    modelTypes: {
      Read: DataDictionaryCodeListRead;
      Insert: SetOptional<
        DataDictionaryCodeListRead,
        "createdAt" | "id" | "isOrdered" | "updatedAt"
      >;
      Update: Partial<DataDictionaryCodeListRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
