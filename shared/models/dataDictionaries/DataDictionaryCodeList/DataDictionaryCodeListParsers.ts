import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema as supabaseJsonSchema } from "$/lib/zodHelpers.ts";
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type {
  CodePair,
  DataDictionaryCodeListId,
  DataDictionaryCodeListModel,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  dictionary_id: z.uuid(),
  id: z.uuid(),
  is_ordered: z.boolean(),
  name: z.string(),
  pairs: supabaseJsonSchema,
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/** The stored shape of `data_dictionaries__code_lists.pairs`. */
const StoredCodePairsSchema = z.array(
  z.object({
    code: z.string(),
    label: z.string(),
    accepted_spellings: z.array(z.string()),
    is_missing: z.boolean(),
  }),
);

type StoredCodePair = z.infer<typeof StoredCodePairsSchema>[number];
type ReadWithoutPairs = Omit<DataDictionaryCodeListModel["Read"], "pairs">;
type DBReadWithoutPairs = Omit<DataDictionaryCodeListModel["DBRead"], "pairs">;

/** Parses stored pairs, throwing when one is missing a field. */
function _pairsFromJson(pairs: Json): CodePair[] {
  return StoredCodePairsSchema.parse(pairs).map((pair) => {
    return {
      code: pair.code,
      label: pair.label,
      acceptedSpellings: pair.accepted_spellings,
      isMissing: pair.is_missing,
    };
  });
}

/**
 * Pairs in the stored JSON shape, for `data_dictionaries__code_lists.pairs`
 * and the save RPC.
 */
export function codePairsToDBJson(
  pairs: readonly CodePair[],
): StoredCodePair[] {
  return pairs.map((pair) => {
    return {
      code: pair.code,
      label: pair.label,
      accepted_spellings: pair.acceptedSpellings,
      is_missing: pair.isMissing,
    };
  });
}

function _readRow(row: DBReadWithoutPairs): ReadWithoutPairs {
  const camelCaseRow = camelCaseKeysDeep(row) as ReadWithoutPairs;
  return nullsToUndefinedDeep(camelCaseRow) as ReadWithoutPairs;
}

/**
 * Parses `public.data_dictionaries__code_lists` rows. Pairs stay outside the
 * deep key transforms and go through their own schema, so a malformed pair
 * fails loudly instead of loading half a list.
 */
export const DataDictionaryCodeListParsers =
  makeParserRegistry<DataDictionaryCodeListModel>().build({
    modelName: "DataDictionaryCodeList",
    DBReadSchema,
    fromDBReadToModelRead: (dbRow): DataDictionaryCodeListModel["Read"] => {
      const { pairs, ...row } = dbRow;
      const modelRow = _readRow(row);
      return Model.make("DataDictionaryCodeList", {
        ...modelRow,
        id: modelRow.id as DataDictionaryCodeListId,
        dictionaryId: modelRow.dictionaryId as DataDictionaryId,
        workspaceId: modelRow.workspaceId as Workspace.Id,
        pairs: _pairsFromJson(pairs),
      });
    },
    fromModelInsertToDBInsert: (model) => {
      const { pairs, ...row } = model;
      return {
        ...(undefinedsToNullsDeep(snakeCaseKeysDeep(row)) as Omit<
          DataDictionaryCodeListModel["DBInsert"],
          "pairs"
        >),
        pairs: codePairsToDBJson(pairs),
      };
    },
    fromModelUpdateToDBUpdate: (model) => {
      const { pairs, ...row } = model;
      return {
        ...(undefinedsToNullsDeep(snakeCaseKeysDeep(row)) as Omit<
          DataDictionaryCodeListModel["DBUpdate"],
          "pairs"
        >),
        ...(pairs === undefined ? {} : { pairs: codePairsToDBJson(pairs) }),
      };
    },
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DataDictionaryCodeListModel;
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
