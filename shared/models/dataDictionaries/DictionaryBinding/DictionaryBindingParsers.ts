import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { DataDictionaryCodeListId } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { DataDictionaryEntryId } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type {
  DictionaryBindingId,
  DictionaryBindingModel,
} from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  applied_dictionary_version: z.number().int(),
  code_list_id: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  dataset_column_id: z.uuid(),
  dataset_id: z.uuid(),
  dictionary_id: z.uuid().nullable(),
  direction: z.enum(["decode", "encode"]),
  entry_id: z.uuid().nullable(),
  id: z.uuid(),
  mode: z.enum(["reference", "convert"]),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Parses `public.dataset_columns__dictionary_bindings` rows. Writes go
 * through `rpc_dataset_columns__apply_dictionaries`, so the insert and
 * update transforms exist only to satisfy the CRUD client.
 */
export const DictionaryBindingParsers =
  makeParserRegistry<DictionaryBindingModel>().build({
    modelName: "DictionaryBinding",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DictionaryBindingModel["Read"] => {
        return Model.make("DictionaryBinding", {
          ...obj,
          id: obj.id as DictionaryBindingId,
          codeListId: obj.codeListId as DataDictionaryCodeListId | undefined,
          datasetColumnId: obj.datasetColumnId as DatasetColumn.Id,
          datasetId: obj.datasetId as Dataset.Id,
          dictionaryId: obj.dictionaryId as DataDictionaryId | undefined,
          entryId: obj.entryId as DataDictionaryEntryId | undefined,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps(["code_list_id", "dictionary_id", "entry_id"]),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps(["code_list_id", "dictionary_id", "entry_id"]),
    ),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DictionaryBindingModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
