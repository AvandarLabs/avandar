import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema as supabaseJsonSchema } from "$/lib/zodHelpers.ts";
import {
  codePairsFromDBJson,
  codePairsToDBJson,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { DataDictionaryCodeListId } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { DataDictionaryEntryId } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type {
  DictionaryBindingId,
  DictionaryBindingModel,
  DictionaryBindingValueOverride,
} from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
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
  keeps_original: z.boolean(),
  mode: z.enum(["reference", "convert"]),
  pinned_is_ordered: z.boolean().nullable(),
  pinned_pairs: supabaseJsonSchema,
  replaced_data_type: z.enum(AvaDataType.Types).nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  value_overrides: supabaseJsonSchema,
  workspace_id: z.uuid(),
});

/** The stored shape of a binding's `value_overrides`. */
const StoredValueOverridesSchema = z.array(
  z.discriminatedUnion("action", [
    z.object({ value: z.string(), action: z.literal("keep") }),
    z.object({ value: z.string(), action: z.literal("empty") }),
    z.object({
      value: z.string(),
      action: z.literal("map"),
      code: z.string(),
    }),
  ]),
);

/** The binding columns stored as JSON, read and written on their own. */
type JsonProps = "pinnedPairs" | "valueOverrides";
type DBJsonProps = "pinned_pairs" | "value_overrides";
type ReadWithoutJson = Omit<DictionaryBindingModel["Read"], JsonProps>;
type DBReadWithoutJson = Omit<DictionaryBindingModel["DBRead"], DBJsonProps>;

/** Parses stored overrides, throwing when one is malformed. */
function _valueOverridesFromJson(
  valueOverrides: Json,
): DictionaryBindingValueOverride[] {
  return StoredValueOverridesSchema.parse(valueOverrides);
}

function _readRow(row: DBReadWithoutJson): ReadWithoutJson {
  const camelCaseRow = camelCaseKeysDeep(row) as ReadWithoutJson;
  return nullsToUndefinedDeep(camelCaseRow) as ReadWithoutJson;
}

/** The JSON columns of a binding write, leaving out the ones not given. */
function _jsonPropsToDB(
  model: Readonly<Partial<Pick<DictionaryBindingModel["Read"], JsonProps>>>,
): { pinned_pairs?: Json; value_overrides?: Json } {
  return {
    ...(model.pinnedPairs === undefined
      ? {}
      : { pinned_pairs: codePairsToDBJson(model.pinnedPairs) }),
    ...(model.valueOverrides === undefined
      ? {}
      : { value_overrides: [...model.valueOverrides] }),
  };
}

/** Snake-cases a binding write, keeping the nulls of its nullable columns. */
function _plainPropsToDB(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return excludeNullsExceptInProps([
    "code_list_id",
    "dictionary_id",
    "entry_id",
    "pinned_is_ordered",
    "replaced_data_type",
  ])(undefinedsToNullsDeep(snakeCaseKeysDeep(row)));
}

/**
 * Parses `public.dataset_columns__dictionary_bindings` rows. The pinned
 * pairs and the overrides stay outside the deep key transforms and go
 * through their own schemas, so a malformed one fails loudly. Writes go
 * through the apply RPCs, so the insert and update transforms exist only
 * to satisfy the CRUD client.
 */
export const DictionaryBindingParsers =
  makeParserRegistry<DictionaryBindingModel>().build({
    modelName: "DictionaryBinding",
    DBReadSchema,
    fromDBReadToModelRead: (dbRow): DictionaryBindingModel["Read"] => {
      const { pinned_pairs: pinnedPairs, value_overrides, ...row } = dbRow;
      const modelRow = _readRow(row);
      return Model.make("DictionaryBinding", {
        ...modelRow,
        id: modelRow.id as DictionaryBindingId,
        codeListId: modelRow.codeListId as DataDictionaryCodeListId | undefined,
        datasetColumnId: modelRow.datasetColumnId as DatasetColumn.Id,
        datasetId: modelRow.datasetId as Dataset.Id,
        dictionaryId: modelRow.dictionaryId as DataDictionaryId | undefined,
        entryId: modelRow.entryId as DataDictionaryEntryId | undefined,
        workspaceId: modelRow.workspaceId as Workspace.Id,
        pinnedPairs:
          pinnedPairs === null ? undefined : codePairsFromDBJson(pinnedPairs),
        valueOverrides: _valueOverridesFromJson(value_overrides),
      });
    },
    fromModelInsertToDBInsert: (model) => {
      const { pinnedPairs, valueOverrides, ...row } = model;
      return {
        ...(_plainPropsToDB(row) as Omit<
          DictionaryBindingModel["DBInsert"],
          DBJsonProps
        >),
        ..._jsonPropsToDB({ pinnedPairs, valueOverrides }),
      };
    },
    fromModelUpdateToDBUpdate: (model) => {
      const { pinnedPairs, valueOverrides, ...row } = model;
      return {
        ...(_plainPropsToDB(row) as Omit<
          DictionaryBindingModel["DBUpdate"],
          DBJsonProps
        >),
        ..._jsonPropsToDB({ pinnedPairs, valueOverrides }),
      };
    },
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
