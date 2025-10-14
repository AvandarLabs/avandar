import { object, instanceof as zodInstanceOf } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { identity } from "@/lib/utils/misc";
import { uuidType } from "@/lib/utils/zodHelpers";
import { UserId } from "@/models/User/types";
import { WorkspaceId } from "@/models/Workspace/types";
import { DatasetId } from "../Dataset";
import { LocalDatasetModel } from "./LocalDataset.types";

const DBReadSchema = object({
  datasetId: uuidType<DatasetId>(),
  workspaceId: uuidType<WorkspaceId>(),
  userId: uuidType<UserId>(),
  parquetData: zodInstanceOf(Blob),
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
