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
import type {
  DataDictionaryId,
  DataDictionaryModel,
} from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  created_from_dataset_ids: z.array(z.uuid()),
  description: z.string().nullable(),
  id: z.uuid(),
  name: z.string(),
  owner_id: z.uuid(),
  owner_profile_id: z.uuid(),
  updated_at: z.iso.datetime({ offset: true }),
  version: z.number().int(),
  workspace_id: z.uuid(),
});

/** Parses `public.data_dictionaries` rows. */
export const DataDictionaryParsers =
  makeParserRegistry<DataDictionaryModel>().build({
    modelName: "DataDictionary",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataDictionaryModel["Read"] => {
        return Model.make("DataDictionary", {
          ...obj,
          id: obj.id as DataDictionaryId,
          createdFromDatasetIds: obj.createdFromDatasetIds as Dataset.Id[],
          ownerId: obj.ownerId as User.Id,
          ownerProfileId: obj.ownerProfileId as UserProfile.Id,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
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
type CrudTypes = DataDictionaryModel;
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
