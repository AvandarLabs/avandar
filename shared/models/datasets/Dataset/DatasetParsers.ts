import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { Model } from "@models/Model/Model.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { excludeNullsExceptInProps } from "@utils/objects/hofs/excludeNullsExceptInProps/excludeNullsExceptInProps.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { undefinedsToNullsDeep } from "@utils/objects/undefinedsToNullsDeep/undefinedsToNullsDeep.ts";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource.ts";
import { z } from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
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
type CRUDTypes = DatasetModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
];
