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
  DataDictionaryEntryCodingId,
  DataDictionaryEntryCodingModel,
} from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  code_list_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  dictionary_id: z.uuid(),
  entry_id: z.uuid(),
  id: z.uuid(),
  is_primary: z.boolean(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/** Parses `public.data_dictionaries__entry_codings` rows. */
export const DataDictionaryEntryCodingParsers =
  makeParserRegistry<DataDictionaryEntryCodingModel>().build({
    modelName: "DataDictionaryEntryCoding",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataDictionaryEntryCodingModel["Read"] => {
        return Model.make("DataDictionaryEntryCoding", {
          ...obj,
          id: obj.id as DataDictionaryEntryCodingId,
          codeListId: obj.codeListId as DataDictionaryCodeListId,
          dictionaryId: obj.dictionaryId as DataDictionaryId,
          entryId: obj.entryId as DataDictionaryEntryId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps([]),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps([]),
    ),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DataDictionaryEntryCodingModel;
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
