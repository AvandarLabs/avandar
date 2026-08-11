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
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource.ts";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@avandar/utils/zod";
import type {
  DatasetId,
  DatasetModel,
} from "$/models/datasets/Dataset/Dataset.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { UserProfileId } from "$/models/User/UserProfile.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  date_of_last_sync: z.iso.datetime({ offset: true }).nullable(),
  description: z.string().nullable(),
  id: z.uuid(),
  is_restricted: z.boolean(),
  name: z.string(),
  owner_id: z.uuid(),
  owner_profile_id: z.uuid(),
  source_type: z.enum(DatasetSource.SourceTypes),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const DatasetParsers = makeParserRegistry<DatasetModel>().build({
  modelName: "Dataset",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): DatasetModel["Read"] => {
      return Model.make("Dataset", {
        ...obj,
        id: obj.id as DatasetId,
        ownerId: obj.ownerId as UserId,
        ownerProfileId: obj.ownerProfileId as UserProfileId,
        workspaceId: obj.workspaceId as Workspace.Id,
      });
    },
  ),
  fromModelInsertToDBInsert: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps(["date_of_last_sync", "description"]),
  ),
  fromModelUpdateToDBUpdate: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps(["date_of_last_sync", "description"]),
  ),
});

/**
 * Do not remove these tests!
 */
type CrudTypes = DatasetModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
