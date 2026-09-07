import { makeParserRegistry } from "@avandar/clients";
import { identity } from "@avandar/utils";
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { LegacyLocalDatasetEntryModel } from "@/models/Legacy_LocalDatasetEntry/Legacy_LocalDatasetEntry.types";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@avandar/utils/zod";

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
type CrudTypes = LegacyLocalDatasetEntryModel;
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
