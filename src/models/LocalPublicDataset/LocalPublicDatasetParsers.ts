import { makeParserRegistry } from "@clients/makeParserRegistry";
import { identity } from "@utils/misc/identity";
import { uuidType } from "$/lib/zodHelpers";
import { z } from "zod";
import type { LocalPublicDatasetModel } from "./LocalPublicDataset.types";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const DBReadSchema = z.object({
  dashboardId: uuidType<DashboardId>(),
  datasetId: uuidType<DatasetId>(),
  parquetData: z.instanceof(Blob),
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
type CRUDTypes = LocalPublicDatasetModel;
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
