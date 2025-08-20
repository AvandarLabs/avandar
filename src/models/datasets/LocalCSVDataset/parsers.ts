import { iso, number, object, string, uuid } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import {
  camelCaseKeysDeep,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { WorkspaceId } from "@/models/Workspace/types";
import { DatasetId } from "../Dataset/types";
import {
  LocalCSVDatasetId,
  LocalCSVDatasetModel,
} from "../LocalCSVDataset/types";

const DBReadSchema = object({
  created_at: iso.datetime({ offset: true }),
  dataset_id: uuid(),
  delimiter: string(),
  id: uuid(),
  size_in_bytes: number(),
  updated_at: iso.datetime({ offset: true }),
  workspace_id: uuid(),
});

export const LocalCSVDatasetParsers =
  makeParserRegistry<LocalCSVDatasetModel>().build({
    modelName: "LocalCSVDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(camelCaseKeysDeep, (obj) => {
      return {
        ...obj,
        id: obj.id as LocalCSVDatasetId,
        datasetId: obj.datasetId as DatasetId,
        workspaceId: obj.workspaceId as WorkspaceId,
      };
    }),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = LocalCSVDatasetModel;
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
