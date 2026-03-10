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
import z from "zod";
import { DuckDBDataTypes } from "../../../../src/clients/DuckDBClient/DuckDBDataType.ts";
import { AvaDataTypes } from "../AvaDataType/AvaDataTypes.ts";
import type { DatasetId } from "../Dataset/Dataset.types.ts";
import type {
  DatasetColumn,
  DatasetColumnId,
  DatasetColumnModel,
} from "./DatasetColumn.types.ts";
import type { Expect, ZodSchemaEqualsTypes } from "@avandar/utils";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  original_data_type: z.string(),
  detected_data_type: z.enum(DuckDBDataTypes),
  data_type: z.enum(AvaDataTypes.Types),
  dataset_id: z.uuid(),
  description: z.string().nullable(),
  id: z.uuid(),
  name: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
  column_idx: z.number(),
});

export const DatasetColumnParsers =
  makeParserRegistry<DatasetColumnModel>().build({
    modelName: "DatasetColumn",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DatasetColumn => {
        return Model.make("DatasetColumn", {
          ...obj,
          id: obj.id as DatasetColumnId,
          datasetId: obj.datasetId as DatasetId,
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
