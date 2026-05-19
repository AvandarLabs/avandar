import { makeParserRegistry } from "@clients";
import { identity } from "@utils";
import { uuidType } from "$/lib/zodHelpers";
import { z } from "zod";
import type { LocalDatasetModel } from "@/models/LocalDataset/LocalDataset.types";
import type { Expect, ZodSchemaEqualsTypes } from "@utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const CsvParseOptionsSchema = z.object({
  type: z.literal("csv"),
  numRowsToSkip: z.number().optional(),
  delimiter: z.string().optional(),
});

const XlsxParseOptionsSchema = z.object({
  type: z.literal("xlsx"),
  sheet: z.string().optional(),
  hasHeader: z.boolean().optional(),
});

const DBReadSchema = z.object({
  datasetId: uuidType<DatasetId>(),
  workspaceId: uuidType<WorkspaceId>(),
  userId: uuidType<UserId>(),
  parquetData: z.instanceof(Blob).optional(),
  parseStatus: z.enum(["ready", "parsing", "failed"]),
  parseStartedAt: z.number().optional(),
  parseFailedReason: z.string().optional(),
  sourceBytes: z.instanceof(Blob).optional(),
  sourceFileName: z.string().optional(),
  sourceFileType: z.enum(["csv", "xlsx"]).optional(),
  sourceFileSize: z.number().optional(),
  lastSourceAccessedAt: z.number().optional(),
  parseOptions: z
    .union([CsvParseOptionsSchema, XlsxParseOptionsSchema])
    .optional(),
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
type CrudTypes = LocalDatasetModel;
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
