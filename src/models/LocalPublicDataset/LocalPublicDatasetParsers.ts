import { makeParserRegistry } from "@avandar/clients";
import { identity } from "@avandar/utils";
import { uuidType } from "$/lib/zodHelpers";
import { z } from "zod";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { LocalPublicDatasetModel } from "@/models/LocalPublicDataset/LocalPublicDataset.types";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@avandar/utils/zod";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const DBReadSchema = z.object({
  bucket: z
    .union([
      z.literal(SnapshotStorageUtils.PUBLIC_BUCKET_NAME),
      z.literal(SnapshotStorageUtils.PRIVATE_BUCKET_NAME),
    ])
    .optional(),
  dashboardId: uuidType<DashboardId>(),
  datasetId: uuidType<DatasetId>(),
  parquetData: z.instanceof(Blob),
  snapshotRevision: z.string().optional(),
  downloadedAt: z.string(),
});

export const LocalPublicDatasetParsers =
  makeParserRegistry<LocalPublicDatasetModel>().build({
    modelName: "LocalPublicDataset",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = LocalPublicDatasetModel;
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
