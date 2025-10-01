import { boolean, iso, number, object, string, uuid } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { WorkspaceId } from "@/models/Workspace/types";
import { DatasetId } from "../Dataset/types";
import { CSVFileDatasetId, CSVFileDatasetModel } from "./types";

const DBReadSchema = object({
  created_at: iso.datetime({ offset: true }),
  dataset_id: uuid(),
  id: uuid(),
  updated_at: iso.datetime({ offset: true }),
  workspace_id: uuid(),
  size_in_bytes: number(),
  rows_to_skip: number(),
  quote_char: string().nullable(),
  escape_char: string().nullable(),
  delimiter: string(),
  newline_delimiter: string(),
  comment_char: string().nullable(),
  has_header: boolean(),
  date_format: string().nullable(),
  timestamp_format: string().nullable(),
});

export const LocalCSVDatasetParsers =
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
