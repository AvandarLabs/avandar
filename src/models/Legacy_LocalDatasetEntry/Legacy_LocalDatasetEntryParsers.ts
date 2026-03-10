import { makeParserRegistry } from "@avandar/clients";
import { identity } from "@avandar/utils";
import { uuidType } from "$/lib/zodHelpers";
import { z } from "zod";
import type { LegacyLocalDatasetEntryModel } from "./Legacy_LocalDatasetEntry.types";
import type { Expect, ZodSchemaEqualsTypes } from "@avandar/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const DBReadSchema = z.object({
  datasetId: uuidType<DatasetId>(),
  localTableName: z.string(),
});

export const Legacy_LocalDatasetEntryParsers =
  makeParserRegistry<LegacyLocalDatasetEntryModel>().build({
    modelName: "LocalDatasetEntry",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = LegacyLocalDatasetEntryModel;
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
