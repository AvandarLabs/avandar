import { enum as zodEnum, iso, number, object, string, uuid } from "zod";
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
import { WorkspaceId } from "@/models/Workspace/types";
import { DatasetId } from "../Dataset/types";
import {
  DatasetColumn,
  DatasetColumnDataTypes,
  DatasetColumnId,
  DatasetColumnModel,
} from "./DatasetColumn.types";

const DBReadSchema = object({
  created_at: iso.datetime({ offset: true }),
  data_type: zodEnum(DatasetColumnDataTypes),
  dataset_id: uuid(),
  description: string().nullable(),
  id: uuid(),
  name: string(),
  updated_at: iso.datetime({ offset: true }),
  workspace_id: uuid(),
  column_idx: number(),
});

export const DatasetColumnParsers = makeParserRegistry<DatasetColumnModel>()
  .build({
    modelName: "DatasetColumn",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DatasetColumn => {
        return {
          ...obj,
          id: obj.id as DatasetColumnId,
          datasetId: obj.datasetId as DatasetId,
          workspaceId: obj.workspaceId as WorkspaceId,
        };
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

/**
 * Do not remove these tests!
 */
type CRUDTypes = DatasetColumnModel;
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
