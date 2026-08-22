import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { LocalDatasetModel } from "@/models/LocalDataset/LocalDataset.types";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@avandar/utils/zod";

import { makeParserRegistry } from "@avandar/clients";
import { identity } from "@avandar/utils";
import { z } from "zod";

import { uuidType } from "$/lib/zodHelpers";

const CsvParseOptionsSchema = z.object({
  type: z.literal("csv"),
  numRowsToSkip: z.number().optional(),
  delimiter: z.string().optional(),
});

const XlsxParseOptionsSchema = z.object({
  type: z.literal("xlsx"),
  sheet: z.string().optional(),
  hasHeader: z.boolean().optional(),
  rowsToSkip: z.number().optional(),
});

const PdfParseOptionsSchema = z.object({
  type: z.literal("pdf"),
  pageRange: z.tuple([z.number(), z.number()]).readonly().optional(),
});

const DBReadSchema = z.object({
  datasetId: uuidType<DatasetId>(),
  workspaceId: uuidType<WorkspaceId>(),
  userId: uuidType<UserId>(),
  parquetData: z.union([z.instanceof(Blob), z.undefined()]),
  parseStatus: z.enum(["ready", "parsing", "failed"]),
  parseStartedAt: z.union([z.number(), z.undefined()]),
  parseFailedReason: z.union([z.string(), z.undefined()]),
  sourceBytes: z.union([z.instanceof(Blob), z.undefined()]),
  sourceFileName: z.union([z.string(), z.undefined()]),
  sourceFileType: z.union([z.enum(["csv", "xlsx", "pdf"]), z.undefined()]),
  sourceFileSize: z.union([z.number(), z.undefined()]),
  lastSourceAccessedAt: z.union([z.number(), z.undefined()]),
  isSourcePinned: z.union([z.boolean(), z.undefined()]),
  parseOptions: z.union([
    CsvParseOptionsSchema,
    XlsxParseOptionsSchema,
    PdfParseOptionsSchema,
    z.undefined(),
  ]),
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
