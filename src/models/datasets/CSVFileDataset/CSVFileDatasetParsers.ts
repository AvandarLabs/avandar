import { Expect, ZodSchemaEqualsTypes } from "$/lib/types/testUtilityTypes";
import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { DatasetId } from "../Dataset/Dataset.types";
import { CSVFileDatasetId, CSVFileDatasetModel } from "./CSVFileDataset.types";

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

export const CSVFileDatasetParsers =
  makeParserRegistry<CSVFileDatasetModel>().build({
    modelName: "CSVFileDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj) => {
        return {
          ...obj,
          id: obj.id as CSVFileDatasetId,
          datasetId: obj.datasetId as DatasetId,
          workspaceId: obj.workspaceId as WorkspaceId,
        };
      },
    ),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = CSVFileDatasetModel;
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
