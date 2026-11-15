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
import { supabaseJSONSchema as supabaseJsonSchema } from "$/lib/zodHelpers.ts";
import type {
  CrosswalkCompiledCodeList,
  CrosswalkId,
  CrosswalkModel,
} from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  adds_source_column: z.boolean(),
  codes_output_as: z.enum(["labels", "codes"]),
  compiled_at: z.iso.datetime({ offset: true }).nullable(),
  compiled_code_lists: supabaseJsonSchema,
  created_at: z.iso.datetime({ offset: true }),
  description: z.string().nullable(),
  id: z.uuid(),
  name: z.string(),
  output_dataset_id: z.uuid().nullable(),
  owner_id: z.uuid(),
  owner_profile_id: z.uuid(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/** The stored shape of `crosswalks.compiled_code_lists`. */
const StoredCompiledCodeListsSchema = z.array(
  z.object({ code_list_id: z.uuid(), fingerprint: z.string() }),
);

type ReadWithoutJson = Omit<CrosswalkModel["Read"], "compiledCodeLists">;
type DBReadWithoutJson = Omit<CrosswalkModel["DBRead"], "compiled_code_lists">;

/** Parses stored fingerprints, throwing when one is malformed. */
function _compiledCodeListsFromJson(
  compiledCodeLists: Json,
): CrosswalkCompiledCodeList[] | undefined {
  if (compiledCodeLists === null) {
    return undefined;
  }
  return StoredCompiledCodeListsSchema.parse(compiledCodeLists).map((item) => {
    return {
      codeListId: item.code_list_id as DataDictionaryCodeList.Id,
      fingerprint: item.fingerprint,
    };
  });
}

function _readRow(row: DBReadWithoutJson): ReadWithoutJson {
  const camelCaseRow = camelCaseKeysDeep(row) as ReadWithoutJson;
  return nullsToUndefinedDeep(camelCaseRow) as ReadWithoutJson;
}

/**
 * Parses `public.crosswalks` rows. The compiled fingerprints stay outside
 * the deep key transforms and go through their own schema, so a malformed
 * one fails loudly. The managed columns (`output_dataset_id`, `compiled_at`,
 * `compiled_code_lists`) are written only by the combined-dataset RPC, so
 * writes leave them out unless they are set.
 */
export const CrosswalkParsers = makeParserRegistry<CrosswalkModel>().build({
  modelName: "Crosswalk",
  DBReadSchema,
  fromDBReadToModelRead: (dbRow): CrosswalkModel["Read"] => {
    const { compiled_code_lists: compiledCodeLists, ...row } = dbRow;
    const modelRow = _readRow(row);
    return Model.make("Crosswalk", {
      ...modelRow,
      id: modelRow.id as CrosswalkId,
      outputDatasetId: modelRow.outputDatasetId as Dataset.Id | undefined,
      ownerId: modelRow.ownerId as User.Id,
      ownerProfileId: modelRow.ownerProfileId as UserProfile.Id,
      workspaceId: modelRow.workspaceId as Workspace.Id,
      compiledCodeLists: _compiledCodeListsFromJson(compiledCodeLists),
    });
  },
  fromModelInsertToDBInsert: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps("description"),
  ),
  fromModelUpdateToDBUpdate: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps("description"),
  ),
});

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = CrosswalkModel;
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
