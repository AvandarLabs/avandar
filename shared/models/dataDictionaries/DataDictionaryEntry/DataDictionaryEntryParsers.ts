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
import type {
  DataDictionaryEntryId,
  DataDictionaryEntryModel,
} from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  column_names: z.array(z.string()),
  created_at: z.iso.datetime({ offset: true }),
  description: z.string().nullable(),
  dictionary_id: z.uuid(),
  id: z.uuid(),
  kind: z.enum([
    "categorical",
    "ordered",
    "number",
    "date",
    "text",
    "identifier",
  ]),
  name: z.string(),
  position: z.number().int(),
  unit: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  valid_max: z.number().nullable(),
  valid_min: z.number().nullable(),
  workspace_id: z.uuid(),
});

/** Parses `public.data_dictionaries__entries` rows. */
export const DataDictionaryEntryParsers =
  makeParserRegistry<DataDictionaryEntryModel>().build({
    modelName: "DataDictionaryEntry",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataDictionaryEntryModel["Read"] => {
        return Model.make("DataDictionaryEntry", {
          ...obj,
          id: obj.id as DataDictionaryEntryId,
          dictionaryId: obj.dictionaryId as DataDictionaryId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps([
        "description",
        "unit",
        "valid_min",
        "valid_max",
      ]),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps([
        "description",
        "unit",
        "valid_min",
        "valid_max",
      ]),
    ),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DataDictionaryEntryModel;
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
