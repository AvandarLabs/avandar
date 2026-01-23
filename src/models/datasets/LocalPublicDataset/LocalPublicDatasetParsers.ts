import { Expect, ZodSchemaEqualsTypes } from "$/lib/types/testUtilityTypes";
import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { identity } from "@/lib/utils/misc";
import { uuidType } from "@/lib/utils/zodHelpers";
import type { DatasetId } from "../Dataset";
import type { LocalPublicDatasetModel } from "./LocalPublicDataset.types";
import type { DashboardId } from "@/models/Dashboard/Dashboard.types";

const DBReadSchema = z.object({
  publicDatasetId: z.string(),
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
