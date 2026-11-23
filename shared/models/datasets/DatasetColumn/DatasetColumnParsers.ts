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
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { DuckDbDataTypes } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  DatasetColumnId,
  DatasetColumnModel,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  original_data_type: z.string(),
  detected_data_type: z.enum(DuckDbDataTypes),
  data_type: z.enum(AvaDataType.Types),
  dataset_id: z.uuid(),
  description: z.string().nullable(),
  dictionary_binding_id: z.uuid().nullable(),
  id: z.uuid(),
  original_name: z.string(),
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
      (obj): DatasetColumnModel["Read"] => {
        return Model.make("DatasetColumn", {
          ...obj,
          id: obj.id as DatasetColumnId,
          datasetId: obj.datasetId as DatasetId,
          dictionaryBindingId: obj.dictionaryBindingId as
            | DictionaryBinding.Id
            | undefined,
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
type CrudTypes = DatasetColumnModel;
// oxlint-disable-next-line typescript/ban-ts-comment
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
