import { makeParserRegistry } from "@clients/makeParserRegistry";
import { identity } from "@utils/misc/identity";
import { uuidType } from "$/lib/zodHelpers";
import { z } from "zod";
import type { LocalDatasetModel } from "@/models/LocalDataset/LocalDataset.types";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const DBReadSchema = z.object({
  datasetId: uuidType<DatasetId>(),
  workspaceId: uuidType<WorkspaceId>(),
  userId: uuidType<UserId>(),
  parquetData: z.instanceof(Blob),
});

export const LocalDatasetParsers =
  makeParserRegistry<LocalDatasetModel>().build({
    modelName: "LocalDataset",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = LocalDatasetModel;
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
