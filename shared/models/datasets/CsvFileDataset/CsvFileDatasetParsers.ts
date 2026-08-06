import { makeParserRegistry } from "@clients/makeParserRegistry/makeParserRegistry.ts";
import { Model } from "@models/Model/Model.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { z } from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type {
  CsvFileDatasetId,
  CsvFileDatasetModel,
} from "$/models/datasets/CsvFileDataset/CsvFileDataset.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid(),
  id: z.uuid(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
  is_in_cloud_storage: z.boolean(),
  size_in_bytes: z.number(),
  rows_to_skip: z.number(),
  quote_char: z.string().nullable(),
  escape_char: z.string().nullable(),
  delimiter: z.string(),
  newline_delimiter: z.string(),
  comment_char: z.string().nullable(),
  has_header: z.boolean(),
  date_format: z.string().nullable(),
  timestamp_format: z.string().nullable(),
});

export const CsvFileDatasetParsers =
  makeParserRegistry<CsvFileDatasetModel>().build({
    modelName: "CsvFileDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj) => {
        return Model.make("CsvFileDataset", {
          ...obj,
          id: obj.id as CsvFileDatasetId,
          datasetId: obj.datasetId as DatasetId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = CsvFileDatasetModel;
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
