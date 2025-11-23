import { iso, object, string, uuid, enum as zodEnum } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { excludeNullsExceptInProps } from "@/lib/utils/objects/higherOrderFuncs";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { Models } from "@/models/Model";
import { UserId, UserProfileId } from "@/models/User/User.types";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { Dataset, DatasetId, DatasetModel } from "./Dataset.types";
import { Datasets } from "./Datasets";

const DBReadSchema = object({
  created_at: iso.datetime({ offset: true }),
  date_of_last_sync: iso.datetime({ offset: true }).nullable(),
  description: string().nullable(),
  id: uuid(),
  name: string(),
  owner_id: uuid(),
  owner_profile_id: uuid(),
  source_type: zodEnum(Datasets.SourceTypes),
  updated_at: iso.datetime({ offset: true }),
  workspace_id: uuid(),
});

export const DatasetParsers = makeParserRegistry<DatasetModel>().build({
  modelName: "Dataset",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): Dataset => {
      return Models.make("Dataset", {
        ...obj,
        id: obj.id as DatasetId,
        ownerId: obj.ownerId as UserId,
        ownerProfileId: obj.ownerProfileId as UserProfileId,
        workspaceId: obj.workspaceId as WorkspaceId,
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
